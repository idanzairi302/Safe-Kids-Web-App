import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from './user.model';
import { config } from '../config/env';

const router = Router();
const googleClient = new OAuth2Client(config.google.clientId);

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

function generateAccessToken(userId: string): string {
  return jwt.sign({ _id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiry,
  } as jwt.SignOptions);
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ _id: userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
  } as jwt.SignOptions);
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

function sanitizeUser(user: { _id: unknown; username: string; email: string; profileImage: string }) {
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    profileImage: user.profileImage,
  };
}

// POST /register
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { username, email, password } = req.body;

      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });
      if (existingUser) {
        const field = existingUser.email === email ? 'Email' : 'Username';
        res.status(400).json({ error: `${field} already in use` });
        return;
      }

      const user = new User({ username, email, password });
      await user.save();

      res.status(201).json({ user: sanitizeUser(user) });
    } catch (error) {
      res.status(500).json({ error: 'Server error during registration' });
    }
  }
);

// POST /login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const accessToken = generateAccessToken(user._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString());

      user.refreshTokens.push(refreshToken);
      await user.save();

      setRefreshCookie(res, refreshToken);
      res.json({ accessToken, user: sanitizeUser(user) });
    } catch (error) {
      res.status(500).json({ error: 'Server error during login' });
    }
  }
);

// POST /google
router.post(
  '/google',
  [body('credential').notEmpty().withMessage('Google credential is required')],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { credential } = req.body;

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.google.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        res.status(400).json({ error: 'Invalid Google token' });
        return;
      }

      const { email, name, picture, sub: googleId } = payload;

      let user = await User.findOne({ $or: [{ googleId }, { email }] });

      if (!user) {
        user = new User({
          username: name || email!.split('@')[0],
          email,
          googleId,
          profileImage: picture || '',
        });
        await user.save();
      } else if (!user.googleId) {
        user.googleId = googleId;
        if (picture && !user.profileImage) {
          user.profileImage = picture;
        }
        await user.save();
      }

      const accessToken = generateAccessToken(user._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString());

      user.refreshTokens.push(refreshToken);
      await user.save();

      setRefreshCookie(res, refreshToken);
      res.json({ accessToken, user: sanitizeUser(user) });
    } catch (error) {
      res.status(401).json({ error: 'Google authentication failed' });
    }
  }
);

// POST /refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.refreshSecret) as { _id: string };

    const user = await User.findById(decoded._id);
    if (!user || !user.refreshTokens.includes(token)) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const accessToken = generateAccessToken(user._id.toString());
    res.json({ accessToken, user: sanitizeUser(user) });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      const decoded = jwt.verify(token, config.jwt.refreshSecret) as { _id: string };
      await User.findByIdAndUpdate(decoded._id, {
        $pull: { refreshTokens: token },
      });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
    });
    res.json({ message: 'Logged out' });
  } catch {
    // Clear cookie even if token is invalid/expired
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
    });
    res.json({ message: 'Logged out' });
  }
});

export default router;
