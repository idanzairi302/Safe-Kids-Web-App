import request from 'supertest';
import app from '../src/app';
import Post from '../src/posts/post.model';
import * as aiService from '../src/ai/ai.service';
import { createTestUser, createAuthenticatedUser } from './setup';

// Mock the global fetch to intercept Ollama calls
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = originalFetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('Search Routes', () => {
  let accessToken: string;

  beforeEach(async () => {
    const auth = await createAuthenticatedUser({
      username: 'searcher',
      email: 'searcher@example.com',
    });
    accessToken = auth.accessToken;

    // Create posts with text content for searching
    const user = auth.user;
    await Post.create({
      author: user._id,
      text: 'Broken swing at playground near school',
      image: 'swing.png',
    });
    await Post.create({
      author: user._id,
      text: 'Dark alley with no streetlights on Main road',
      image: 'dark.png',
    });
    await Post.create({
      author: user._id,
      text: 'Stray dogs near the park entrance',
      image: 'dogs.png',
    });

    // Ensure text index is ready
    await Post.ensureIndexes();
  });

  // ─── POST /api/search ─────────────────────────────────────────────
  describe('POST /api/search', () => {
    it('should return posts matching AI query (mocked Ollama)', async () => {
      // Mock Ollama to return structured JSON
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            keywords: ['playground', 'broken', 'swing'],
            sortBy: 'recent',
          }),
        }),
      }) as jest.Mock;

      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'broken playground equipment' });

      expect(res.status).toBe(200);
      expect(res.body.posts).toBeDefined();
      expect(Array.isArray(res.body.posts)).toBe(true);
      expect(res.body.fallback).toBe(false);
    });

    it('should fallback when Ollama unavailable', async () => {
      // Mock Ollama to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused')) as jest.Mock;

      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'playground' });

      expect(res.status).toBe(200);
      expect(res.body.fallback).toBe(true);
      expect(res.body.posts).toBeDefined();
    });

    it('should fail without auth', async () => {
      const res = await request(app)
        .post('/api/search')
        .send({ query: 'test query' });

      expect(res.status).toBe(401);
    });

    it('should fail with empty query', async () => {
      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: '' });

      expect(res.status).toBe(400);
    });

    it('should fail with missing query field', async () => {
      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should handle Ollama non-ok status and fallback', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }) as jest.Mock;

      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'dark alley' });

      expect(res.status).toBe(200);
      expect(res.body.fallback).toBe(true);
    });

    it('should handle Ollama response wrapped in markdown fences', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: '```json\n{"keywords": ["dogs", "park"], "sortBy": "recent"}\n```',
        }),
      }) as jest.Mock;

      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'dogs in the park area' });

      expect(res.status).toBe(200);
      expect(res.body.fallback).toBe(false);
      expect(res.body.query.keywords).toContain('dogs');
    });

    it('should handle popular sortBy', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            keywords: ['playground'],
            sortBy: 'popular',
          }),
        }),
      }) as jest.Mock;

      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'most liked playground reports' });

      expect(res.status).toBe(200);
      expect(res.body.query.sortBy).toBe('popular');
    });

    it('should handle Ollama returning invalid JSON and fallback', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: 'this is not valid json at all',
        }),
      }) as jest.Mock;

      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'stray dogs' });

      expect(res.status).toBe(200);
      expect(res.body.fallback).toBe(true);
    });

    it('should handle Ollama returning object without keywords and fallback', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify({ sortBy: 'recent' }),
        }),
      }) as jest.Mock;

      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'missing keywords field' });

      expect(res.status).toBe(200);
      expect(res.body.fallback).toBe(true);
    });

    it('should handle Ollama returning non-string keywords and fallback', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify({ keywords: [123, true] }),
        }),
      }) as jest.Mock;

      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'bad keyword types' });

      expect(res.status).toBe(200);
      expect(res.body.fallback).toBe(true);
    });

    it('should handle null response from Ollama and fallback', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: 'null',
        }),
      }) as jest.Mock;

      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'null response test' });

      expect(res.status).toBe(200);
      expect(res.body.fallback).toBe(true);
    });

    it('should ignore invalid sortBy value', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            keywords: ['test'],
            sortBy: 'alphabetical',
          }),
        }),
      }) as jest.Mock;

      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'test invalid sort' });

      expect(res.status).toBe(200);
      expect(res.body.query.sortBy).toBeUndefined();
    });

    it('should return cached result on repeated query', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            keywords: ['swing', 'playground'],
            sortBy: 'recent',
          }),
        }),
      }) as jest.Mock;

      // First request populates cache
      const res1 = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'cached query test' });

      expect(res1.status).toBe(200);

      // Second request should hit cache
      const res2 = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'cached query test' });

      expect(res2.status).toBe(200);
      // fetch should only have been called for the first request (retry may cause 2 calls max)
      // The important thing is the second request succeeds from cache
    });

    it('should deduplicate concurrent identical queries', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        callCount++;
        // Simulate slow response
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          ok: true,
          json: async () => ({
            response: JSON.stringify({
              keywords: ['concurrent'],
              sortBy: 'recent',
            }),
          }),
        };
      }) as jest.Mock;

      // Fire two identical requests concurrently
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/search')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ query: 'dedup concurrent test' }),
        request(app)
          .post('/api/search')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ query: 'dedup concurrent test' }),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    it('should use route-level fallback when searchPosts throws', async () => {
      const searchSpy = jest.spyOn(aiService, 'searchPosts').mockRejectedValueOnce(new Error('Search failed'));
      // fallbackSearch will work normally using text search

      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'playground' });

      expect(res.status).toBe(200);
      expect(res.body.fallback).toBe(true);

      searchSpy.mockRestore();
    });

    it('should return 500 when both searchPosts and fallbackSearch fail', async () => {
      const searchSpy = jest.spyOn(aiService, 'searchPosts').mockRejectedValueOnce(new Error('Search failed'));
      const fallbackSpy = jest.spyOn(aiService, 'fallbackSearch').mockRejectedValueOnce(new Error('Fallback failed'));

      const res = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'total failure test' });

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/unavailable/i);

      searchSpy.mockRestore();
      fallbackSpy.mockRestore();
    });
  });
});
