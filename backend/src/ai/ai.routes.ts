import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { config } from '../config/env';
import { searchPosts, fallbackSearch } from './ai.service';

const router = Router();

const searchRateLimiter = rateLimit({
  windowMs: config.ollama.rateLimitWindowMs,
  max: config.ollama.rateLimitMax,
  keyGenerator: (req) => (req as AuthRequest).userId || 'anonymous',
  message: { error: 'Too many search requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/',
  authenticateToken,
  searchRateLimiter,
  body('query')
    .isString()
    .withMessage('query must be a string')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('query must be between 1 and 200 characters'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { query } = req.body;

    try {
      const result = await searchPosts(query);
      res.json(result);
    } catch {
      try {
        const fallback = await fallbackSearch(query);
        res.json(fallback);
      } catch {
        res.status(500).json({ error: 'Search is currently unavailable' });
      }
    }
  }
);

export default router;
