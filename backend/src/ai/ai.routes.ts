import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { searchPosts, fallbackSearch } from './ai.service';

const router = Router();

router.post(
  '/',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'query is required and must be a string' });
      return;
    }

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
