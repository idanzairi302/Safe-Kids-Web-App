import request from 'supertest';
import app from '../src/app';
import Post from '../src/posts/post.model';
import Like from '../src/likes/like.model';
import { createTestUser, createAuthenticatedUser } from './setup';

describe('Like Routes', () => {
  let postId: string;

  beforeEach(async () => {
    const user = await createTestUser({
      username: 'likehost',
      email: 'likehost@example.com',
    });

    const post = await Post.create({
      author: user._id,
      text: 'Post for likes',
      image: 'likes.png',
    });
    postId = post._id.toString();
  });

  // ─── POST /api/posts/:postId/like (toggle) ────────────────────────
  describe('POST /api/posts/:postId/like', () => {
    it('should toggle like ON (create like, increment likesCount)', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'liker',
        email: 'liker@example.com',
      });

      const res = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
      expect(res.body.likesCount).toBe(1);

      // Verify in DB
      const post = await Post.findById(postId);
      expect(post!.likesCount).toBe(1);
    });

    it('should toggle like OFF (remove like, decrement likesCount)', async () => {
      const { user, accessToken } = await createAuthenticatedUser({
        username: 'unliker',
        email: 'unliker@example.com',
      });

      // First like
      await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Unlike
      const res = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(false);
      expect(res.body.likesCount).toBe(0);
    });

    it('should fail without auth', async () => {
      const res = await request(app).post(`/api/posts/${postId}/like`);

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/posts/:postId/like ───────────────────────────────────
  describe('GET /api/posts/:postId/like', () => {
    it('should return { liked: true } when user liked the post', async () => {
      const { user, accessToken } = await createAuthenticatedUser({
        username: 'checker',
        email: 'checker@example.com',
      });

      // Like the post
      await Like.create({ post: postId, user: user._id });

      const res = await request(app)
        .get(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
    });

    it('should return { liked: false } when user has not liked the post', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'nonliker',
        email: 'nonliker@example.com',
      });

      const res = await request(app)
        .get(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(false);
    });
  });
});
