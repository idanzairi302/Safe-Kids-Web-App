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
  });
});
