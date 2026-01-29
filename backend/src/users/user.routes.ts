import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import User from '../auth/user.model';
import { config } from '../config/env';

const router = Router();

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

// GET /:id — public profile
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select(
      '_id username email profileImage createdAt'
    );
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /me — update own profile (auth required)
router.put(
  '/me',
  authenticateToken,
  upload.single('profileImage'),
  [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const user = await User.findById(req.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (req.body.username) {
        const existing = await User.findOne({
          username: req.body.username,
          _id: { $ne: user._id },
        });
        if (existing) {
          res.status(400).json({ error: 'Username already in use' });
          return;
        }
        user.username = req.body.username;
      }

      if (req.file) {
        user.profileImage = `/uploads/${req.file.filename}`;
      }

      await user.save();

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
