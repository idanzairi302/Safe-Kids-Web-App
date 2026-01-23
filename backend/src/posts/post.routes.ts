import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import Post from './post.model';
import Comment from '../comments/comment.model';
import Like from '../likes/like.model';
import { config } from '../config/env';

const router = Router();

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(config.upload.dir));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST / — create post
router.post(
  '/',
  authenticateToken,
  upload.single('image'),
  [
    body('text')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Text must be 1-2000 characters'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Image is required' });
      return;
    }

    try {
      const post = await Post.create({
        author: req.userId,
        text: req.body.text,
        image: req.file.filename,
      });

      const populated = await post.populate('author', 'username profileImage');
      res.status(201).json(populated);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET / — paginated feed
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
    query('author')
      .optional()
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid author ID'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const cursor = req.query.cursor as string | undefined;
      const authorId = req.query.author as string | undefined;

      const filter: Record<string, unknown> = {};
      if (cursor) {
        filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
      }
      if (authorId) {
        filter.author = new mongoose.Types.ObjectId(authorId);
      }

      const posts = await Post.find(filter)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate('author', 'username profileImage')
        .lean();

      const hasMore = posts.length > limit;
      if (hasMore) posts.pop();

      const nextCursor = hasMore && posts.length > 0
        ? posts[posts.length - 1]._id.toString()
        : null;

      res.json({ posts, nextCursor, hasMore });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /:id — single post
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const post = await Post.findById(req.params.id)
      .populate('author', 'username profileImage');

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id — update post (owner only)
router.put(
  '/:id',
  authenticateToken,
  upload.single('image'),
  [
    body('text')
      .optional()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Text must be 1-2000 characters'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid post ID' });
        return;
      }

      const post = await Post.findById(req.params.id);
      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      if (post.author.toString() !== req.userId) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      if (req.body.text) {
        post.text = req.body.text;
      }

      if (req.file) {
        // Delete old image
        try {
          await unlink(path.resolve(config.upload.dir, post.image));
        } catch {
          // Old file may not exist, continue
        }
        post.image = req.file.filename;
      }

      await post.save();
      const updated = await post.populate('author', 'username profileImage');
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /:id — delete post (owner only)
router.delete(
  '/:id',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid post ID' });
        return;
      }

      const post = await Post.findById(req.params.id);
      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      if (post.author.toString() !== req.userId) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      // Delete image file
      try {
        await unlink(path.resolve(config.upload.dir, post.image));
      } catch {
        // File may not exist, continue
      }

      // Delete related comments and likes, then the post
      await Promise.all([
        Comment.deleteMany({ post: post._id }),
        Like.deleteMany({ post: post._id }),
        post.deleteOne(),
      ]);

      res.json({ message: 'Post deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
