import request from 'supertest';
import app from '../src/app';
import Post from '../src/posts/post.model';
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
            category: 'playground',
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
  });
});
