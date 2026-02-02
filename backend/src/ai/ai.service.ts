import { config } from '../config/env';
import { buildPrompt } from './ai.prompts';
import Post, { IPost } from '../posts/post.model';

export interface ParsedQuery {
  keywords: string[];
  category?: string;
  sortBy?: string;
}

export interface SearchResult {
  posts: IPost[];
  query: ParsedQuery | null;
  fallback: boolean;
}

const VALID_CATEGORIES = ['playground', 'road', 'lighting', 'animals', 'water', 'general'];

function validateParsedQuery(data: unknown): ParsedQuery {
  if (typeof data !== 'object' || data === null) {
    throw new Error('LLM response is not an object');
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.keywords) || obj.keywords.length === 0) {
    throw new Error('keywords must be a non-empty array');
  }

  for (const kw of obj.keywords) {
    if (typeof kw !== 'string') {
      throw new Error('All keywords must be strings');
    }
  }

  const result: ParsedQuery = {
    keywords: obj.keywords as string[],
  };

  if (obj.category != null) {
    const cat = String(obj.category);
    if (VALID_CATEGORIES.includes(cat)) {
      result.category = cat;
    }
  }

  if (obj.sortBy === 'popular' || obj.sortBy === 'recent') {
    result.sortBy = obj.sortBy;
  }

  return result;
}

async function ollamaGenerate(query: string): Promise<ParsedQuery> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${config.ollama.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollama.model,
        prompt: buildPrompt(query),
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Ollama returned status ${res.status}`);
    }

    const body = (await res.json()) as { response: string };
    const text = body.response.trim();

    // Try to extract JSON from the response (handle markdown fences)
    let jsonStr = text;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    return validateParsedQuery(parsed);
  } finally {
    clearTimeout(timeout);
  }
}

function buildMongoQuery(parsed: ParsedQuery) {
  let searchTerms = parsed.keywords.join(' ');
  if (parsed.category && parsed.category !== 'general') {
    searchTerms += ` ${parsed.category}`;
  }

  const filter = { $text: { $search: searchTerms } };
  const sort: Record<string, 1 | -1> =
    parsed.sortBy === 'popular' ? { likesCount: -1 } : { createdAt: -1 };

  return { filter, sort };
}

export async function searchPosts(query: string): Promise<SearchResult> {
  const parsed = await ollamaGenerate(query);
  const { filter, sort } = buildMongoQuery(parsed);

  const posts = await Post.find(filter, { score: { $meta: 'textScore' } })
    .sort(sort)
    .limit(20)
    .populate('author', 'username profileImage')
    .lean<IPost[]>();

  return { posts, query: parsed, fallback: false };
}

export async function fallbackSearch(query: string): Promise<SearchResult> {
  const posts = await Post.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(20)
    .populate('author', 'username profileImage')
    .lean<IPost[]>();

  return { posts, query: null, fallback: true };
}
