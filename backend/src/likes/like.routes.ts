import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import Like from './like.model';
import Post from '../posts/post.model';

const router = Router({ mergeParams: true });

// POST / — toggle like
router.post(
  '/',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
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

      const existingLike = await Like.findOne({
        post: postId,
        user: req.userId,
      });

      if (existingLike) {
        await existingLike.deleteOne();
        const updated = await Post.findByIdAndUpdate(
          postId,
          { $inc: { likesCount: -1 } },
          { new: true }
        );
        res.json({ liked: false, likesCount: updated!.likesCount });
      } else {
        await Like.create({ post: postId, user: req.userId });
        const updated = await Post.findByIdAndUpdate(
          postId,
          { $inc: { likesCount: 1 } },
          { new: true }
        );
        res.json({ liked: true, likesCount: updated!.likesCount });
      }
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET / — check if current user liked this post
router.get(
  '/',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { postId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(postId)) {
        res.status(400).json({ error: 'Invalid post ID' });
        return;
      }

      const like = await Like.findOne({
        post: postId,
        user: req.userId,
      });

      res.json({ liked: !!like });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
