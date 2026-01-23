import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import Comment from './comment.model';
import Post from '../posts/post.model';

const router = Router({ mergeParams: true });

// POST / — add comment
router.post(
  '/',
  authenticateToken,
  [
    body('text')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Text must be 1-500 characters'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { postId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(postId)) {
        res.status(400).json({ error: 'Invalid post ID' });
        return;
      }

      const post = await Post.findById(postId);
      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      const comment = await Comment.create({
        post: postId,
        author: req.userId,
        text: req.body.text,
      });

      await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

      const populated = await comment.populate('author', 'username profileImage');
      res.status(201).json(populated);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET / — list comments for post
router.get(
  '/',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be 1-50'),
    query('cursor')
      .optional()
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid cursor'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { postId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(postId)) {
        res.status(400).json({ error: 'Invalid post ID' });
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const cursor = req.query.cursor as string | undefined;

      const filter: Record<string, unknown> = { post: new mongoose.Types.ObjectId(postId) };
      if (cursor) {
        filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
      }

      const comments = await Comment.find(filter)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate('author', 'username profileImage')
        .lean();

      const hasMore = comments.length > limit;
      if (hasMore) comments.pop();

      const nextCursor = hasMore && comments.length > 0
        ? comments[comments.length - 1]._id.toString()
        : null;

      res.json({ comments, nextCursor, hasMore });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /:commentId — delete comment (owner only)
router.delete(
  '/:commentId',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { postId, commentId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }

      const comment = await Comment.findById(commentId);
      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      if (comment.author.toString() !== req.userId) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      await comment.deleteOne();
      await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: -1 } });

      res.json({ message: 'Comment deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
