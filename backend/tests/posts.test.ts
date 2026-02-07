import request from 'supertest';
import mongoose from 'mongoose';
import path from 'path';
import app from '../src/app';
import Post from '../src/posts/post.model';
import Comment from '../src/comments/comment.model';
import Like from '../src/likes/like.model';
import {
  createTestUser,
  createAuthenticatedUser,
  getAccessToken,
  testImageBuffer,
} from './setup';

describe('Post Routes', () => {
  // ─── POST /api/posts ───────────────────────────────────────────────
  describe('POST /api/posts', () => {
    it('should create a post with text + image', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'poster',
        email: 'poster@example.com',
      });

      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('text', 'Broken swing at park')
        .attach('image', testImageBuffer, 'test.png');

      expect(res.status).toBe(201);
      expect(res.body.text).toBe('Broken swing at park');
      expect(res.body.image).toBeDefined();
      expect(res.body.author).toBeDefined();
    });

    it('should fail without auth', async () => {
      const res = await request(app)
        .post('/api/posts')
        .field('text', 'No auth post')
        .attach('image', testImageBuffer, 'test.png');

      expect(res.status).toBe(401);
    });

    it('should fail without text', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'poster2',
        email: 'poster2@example.com',
      });

      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('image', testImageBuffer, 'test.png');

      expect(res.status).toBe(400);
    });

    it('should fail without image', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'poster3',
        email: 'poster3@example.com',
      });

      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('text', 'No image post');

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/posts ────────────────────────────────────────────────
  describe('GET /api/posts', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await createTestUser({
        username: 'feeduser',
        email: 'feed@example.com',
      });
      userId = user._id.toString();

      // Create several posts
      for (let i = 0; i < 5; i++) {
        await Post.create({
          author: user._id,
          text: `Post number ${i}`,
          image: `image_${i}.png`,
        });
      }
    });

    it('should return paginated posts', async () => {
      const res = await request(app).get('/api/posts').query({ limit: 3 });

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(3);
      expect(res.body.hasMore).toBe(true);
      expect(res.body.nextCursor).toBeDefined();
    });

    it('should support cursor pagination', async () => {
      const first = await request(app).get('/api/posts').query({ limit: 2 });

      expect(first.body.posts).toHaveLength(2);
      expect(first.body.nextCursor).toBeDefined();

      const second = await request(app)
        .get('/api/posts')
        .query({ limit: 2, cursor: first.body.nextCursor });

      expect(second.status).toBe(200);
      expect(second.body.posts).toHaveLength(2);

      // Ensure no overlap
      const firstIds = first.body.posts.map((p: any) => p._id);
      const secondIds = second.body.posts.map((p: any) => p._id);
      for (const id of secondIds) {
        expect(firstIds).not.toContain(id);
      }
    });

    it('should filter by author', async () => {
      const otherUser = await createTestUser({
        username: 'other',
        email: 'other@example.com',
      });
      await Post.create({
        author: otherUser._id,
        text: 'Other user post',
        image: 'other.png',
      });

      const res = await request(app)
        .get('/api/posts')
        .query({ author: userId });

      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBe(5);
      for (const post of res.body.posts) {
        expect(post.author._id).toBe(userId);
      }
    });
  });

  // ─── GET /api/posts/:id ───────────────────────────────────────────
  describe('GET /api/posts/:id', () => {
    it('should return a single post with populated author', async () => {
      const user = await createTestUser({
        username: 'singlepost',
        email: 'single@example.com',
      });
      const post = await Post.create({
        author: user._id,
        text: 'Detailed post',
        image: 'detail.png',
      });

      const res = await request(app).get(`/api/posts/${post._id}`);

      expect(res.status).toBe(200);
      expect(res.body.text).toBe('Detailed post');
      expect(res.body.author.username).toBe('singlepost');
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/posts/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PUT /api/posts/:id ───────────────────────────────────────────
  describe('PUT /api/posts/:id', () => {
    it('should allow owner to update post', async () => {
      const { user, accessToken } = await createAuthenticatedUser({
        username: 'updateowner',
        email: 'updateowner@example.com',
      });
      const post = await Post.create({
        author: user._id,
        text: 'Original text',
        image: 'orig.png',
      });

      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .field('text', 'Updated text');

      expect(res.status).toBe(200);
      expect(res.body.text).toBe('Updated text');
    });

    it('should return 403 if not owner', async () => {
      const owner = await createTestUser({
        username: 'realowner',
        email: 'realowner@example.com',
      });
      const post = await Post.create({
        author: owner._id,
        text: 'Owner post',
        image: 'owner.png',
      });

      const { accessToken } = await createAuthenticatedUser({
        username: 'intruder',
        email: 'intruder@example.com',
      });

      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .field('text', 'Hacked text');

      expect(res.status).toBe(403);
    });

    it('should return 401 without auth', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/posts/${fakeId}`)
        .field('text', 'No auth');

      expect(res.status).toBe(401);
    });
  });

  // ─── DELETE /api/posts/:id ─────────────────────────────────────────
  describe('DELETE /api/posts/:id', () => {
    it('should allow owner to delete post and cascade', async () => {
      const { user, accessToken } = await createAuthenticatedUser({
        username: 'delowner',
        email: 'delowner@example.com',
      });
      const post = await Post.create({
        author: user._id,
        text: 'To delete',
        image: 'del.png',
      });

      // Add a comment and a like
      await Comment.create({
        post: post._id,
        author: user._id,
        text: 'A comment',
      });
      await Like.create({ post: post._id, user: user._id });

      const res = await request(app)
        .delete(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Post deleted');

      // Verify cascade
      const comments = await Comment.find({ post: post._id });
      const likes = await Like.find({ post: post._id });
      expect(comments).toHaveLength(0);
      expect(likes).toHaveLength(0);
    });

    it('should return 403 if not owner', async () => {
      const owner = await createTestUser({
        username: 'delrealowner',
        email: 'delrealowner@example.com',
      });
      const post = await Post.create({
        author: owner._id,
        text: 'Owned post',
        image: 'own.png',
      });

      const { accessToken } = await createAuthenticatedUser({
        username: 'notowner',
        email: 'notowner@example.com',
      });

      const res = await request(app)
        .delete(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 401 without auth', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/posts/${fakeId}`);

      expect(res.status).toBe(401);
    });
  });
});
