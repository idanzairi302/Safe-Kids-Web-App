import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import Post from '../src/posts/post.model';
import Comment from '../src/comments/comment.model';
import { createTestUser, createAuthenticatedUser } from './setup';

describe('Comment Routes', () => {
  let postId: string;
  let postAuthorToken: string;

  beforeEach(async () => {
    const { user, accessToken } = await createAuthenticatedUser({
      username: 'commenthost',
      email: 'commenthost@example.com',
    });
    postAuthorToken = accessToken;

    const post = await Post.create({
      author: user._id,
      text: 'Post for comments',
      image: 'comments.png',
    });
    postId = post._id.toString();
  });

  // ─── POST /api/posts/:postId/comments ──────────────────────────────
  describe('POST /api/posts/:postId/comments', () => {
    it('should create a comment and increment commentsCount', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'commenter',
        email: 'commenter@example.com',
      });

      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Great observation!' });

      expect(res.status).toBe(201);
      expect(res.body.text).toBe('Great observation!');
      expect(res.body.author).toBeDefined();

      // Check commentsCount incremented
      const post = await Post.findById(postId);
      expect(post!.commentsCount).toBe(1);
    });

    it('should fail without auth', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .send({ text: 'No auth comment' });

      expect(res.status).toBe(401);
    });

    it('should fail for invalid post ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const { accessToken } = await createAuthenticatedUser({
        username: 'commenter2',
        email: 'commenter2@example.com',
      });

      const res = await request(app)
        .post(`/api/posts/${fakeId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Comment on nothing' });

      expect(res.status).toBe(404);
    });

    it('should fail with empty text', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'emptycommenter',
        email: 'emptycommenter@example.com',
      });

      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: '' });

      expect(res.status).toBe(400);
    });

    it('should fail with malformed post ID', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'badidcommenter',
        email: 'badidcommenter@example.com',
      });

      const res = await request(app)
        .post('/api/posts/not-a-valid-id/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Comment with bad post id' });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/posts/:postId/comments ───────────────────────────────
  describe('GET /api/posts/:postId/comments', () => {
    it('should return comments for a post', async () => {
      const user = await createTestUser({
        username: 'listcommenter',
        email: 'listcommenter@example.com',
      });

      // Create comments
      await Comment.create({ post: postId, author: user._id, text: 'Comment 1' });
      await Comment.create({ post: postId, author: user._id, text: 'Comment 2' });

      const res = await request(app).get(`/api/posts/${postId}/comments`);

      expect(res.status).toBe(200);
      expect(res.body.comments).toHaveLength(2);
    });

    it('should return empty list for post with no comments', async () => {
      const res = await request(app).get(`/api/posts/${postId}/comments`);

      expect(res.status).toBe(200);
      expect(res.body.comments).toHaveLength(0);
    });

    it('should return 400 for invalid post ID', async () => {
      const res = await request(app).get('/api/posts/not-a-valid-id/comments');

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid cursor', async () => {
      const res = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .query({ cursor: 'not-valid' });

      expect(res.status).toBe(400);
    });

    it('should support cursor pagination', async () => {
      const user = await createTestUser({
        username: 'paginatecommenter',
        email: 'paginatecommenter@example.com',
      });

      // Create 3 comments
      for (let i = 0; i < 3; i++) {
        await Comment.create({ post: postId, author: user._id, text: `Comment ${i}` });
      }

      const first = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .query({ limit: 2 });

      expect(first.status).toBe(200);
      expect(first.body.comments).toHaveLength(2);
      expect(first.body.hasMore).toBe(true);
      expect(first.body.nextCursor).toBeDefined();

      const second = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .query({ limit: 2, cursor: first.body.nextCursor });

      expect(second.status).toBe(200);
      expect(second.body.comments).toHaveLength(1);
      expect(second.body.hasMore).toBe(false);
    });
  });

  // ─── DELETE /api/posts/:postId/comments/:commentId ─────────────────
  describe('DELETE /api/posts/:postId/comments/:commentId', () => {
    it('should allow owner to delete comment and decrement commentsCount', async () => {
      const { user, accessToken } = await createAuthenticatedUser({
        username: 'delcommenter',
        email: 'delcommenter@example.com',
      });

      const comment = await Comment.create({
        post: postId,
        author: user._id,
        text: 'To be deleted',
      });
      await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

      const res = await request(app)
        .delete(`/api/posts/${postId}/comments/${comment._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Comment deleted');

      // Check commentsCount decremented
      const post = await Post.findById(postId);
      expect(post!.commentsCount).toBe(0);
    });

    it('should return 403 if not comment owner', async () => {
      const commentAuthor = await createTestUser({
        username: 'actualowner',
        email: 'actualowner@example.com',
      });

      const comment = await Comment.create({
        post: postId,
        author: commentAuthor._id,
        text: 'Not your comment',
      });

      const { accessToken } = await createAuthenticatedUser({
        username: 'notcommentowner',
        email: 'notcommentowner@example.com',
      });

      const res = await request(app)
        .delete(`/api/posts/${postId}/comments/${comment._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 401 without auth', async () => {
      const commentAuthor = await createTestUser({
        username: 'noauthowner',
        email: 'noauthowner@example.com',
      });

      const comment = await Comment.create({
        post: postId,
        author: commentAuthor._id,
        text: 'Cannot delete without auth',
      });

      const res = await request(app)
        .delete(`/api/posts/${postId}/comments/${comment._id}`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeCommentId = new mongoose.Types.ObjectId();
      const { accessToken } = await createAuthenticatedUser({
        username: 'delnotfound',
        email: 'delnotfound@example.com',
      });

      const res = await request(app)
        .delete(`/api/posts/${postId}/comments/${fakeCommentId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid IDs in delete', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'delbadids',
        email: 'delbadids@example.com',
      });

      const res = await request(app)
        .delete('/api/posts/bad-id/comments/also-bad')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ─── Server error handling ──────────────────────────────────────
  describe('Server error handling', () => {
    it('should return 500 when create comment throws', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'errcommenter',
        email: 'errcommenter@example.com',
      });

      const spy = jest.spyOn(Comment, 'create').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Error comment' });

      expect(res.status).toBe(500);
      spy.mockRestore();
    });

    it('should return 500 when list comments throws', async () => {
      const spy = jest.spyOn(Comment, 'find').mockImplementationOnce(() => {
        throw new Error('DB error');
      });

      const res = await request(app).get(`/api/posts/${postId}/comments`);

      expect(res.status).toBe(500);
      spy.mockRestore();
    });

    it('should return 500 when delete comment throws', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'delcomerr',
        email: 'delcomerr@example.com',
      });
      const validCommentId = new mongoose.Types.ObjectId();

      const spy = jest.spyOn(Comment, 'findById').mockImplementationOnce(() => {
        throw new Error('DB error');
      });

      const res = await request(app)
        .delete(`/api/posts/${postId}/comments/${validCommentId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(500);
      spy.mockRestore();
    });
  });
});
