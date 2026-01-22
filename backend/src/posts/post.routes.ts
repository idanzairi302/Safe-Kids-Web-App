import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import Post from './post.model';
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

      const filter: Record<string, unknown> = {};
      if (cursor) {
        filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
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

export default router;
