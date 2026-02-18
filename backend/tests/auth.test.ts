import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import User from '../src/auth/user.model';
import { createTestUser, createAuthenticatedUser, getRefreshToken } from './setup';

// Mock google-auth-library
jest.mock('google-auth-library', () => {
  const mockVerifyIdToken = jest.fn();
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    })),
    __mockVerifyIdToken: mockVerifyIdToken,
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __mockVerifyIdToken: mockVerifyIdToken } = require('google-auth-library');

describe('Auth Routes', () => {
  // ─── POST /api/auth/register ────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await request(app).post('/api/auth/register').send({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('newuser');
      expect(res.body.user.email).toBe('new@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should fail with duplicate email', async () => {
      await createTestUser({ email: 'dup@example.com', username: 'user1' });

      const res = await request(app).post('/api/auth/register').send({
        username: 'user2',
        email: 'dup@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Email/i);
    });

    it('should fail with duplicate username', async () => {
      await createTestUser({ username: 'takenname', email: 'a@example.com' });

      const res = await request(app).post('/api/auth/register').send({
        username: 'takenname',
        email: 'b@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Username/i);
    });

    it('should fail with invalid email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        username: 'validuser',
        email: 'not-an-email',
        password: 'password123',
      });

      expect(res.status).toBe(400);
    });

    it('should fail with short password (< 6 chars)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        username: 'validuser',
        email: 'valid@example.com',
        password: '12345',
      });

      expect(res.status).toBe(400);
    });

    it('should fail with missing fields', async () => {
      const res = await request(app).post('/api/auth/register').send({});

      expect(res.status).toBe(400);
    });

    it('should return 500 when register throws', async () => {
      const spy = jest.spyOn(User, 'findOne').mockImplementationOnce(() => {
        throw new Error('DB error');
      });

      const res = await request(app).post('/api/auth/register').send({
        username: 'erruser',
        email: 'err@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(500);
      spy.mockRestore();
    });
  });

  // ─── POST /api/auth/login ──────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createTestUser({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'password123',
      });
    });

    it('should login successfully and return accessToken + user + set cookie', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('login@example.com');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toMatch(/refreshToken/);
    });

    it('should fail with wrong email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'wrong@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);
    });

    it('should fail with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
    });

    it('should fail with missing fields', async () => {
      const res = await request(app).post('/api/auth/login').send({});

      expect(res.status).toBe(400);
    });

    it('should return 500 when login throws', async () => {
      const spy = jest.spyOn(User, 'findOne').mockImplementationOnce(() => {
        throw new Error('DB error');
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(500);
      spy.mockRestore();
    });
  });

  // ─── POST /api/auth/refresh ────────────────────────────────────────
  describe('POST /api/auth/refresh', () => {
    it('should return new accessToken when valid refresh cookie sent', async () => {
      const { user, refreshToken } = await createAuthenticatedUser({
        username: 'refreshuser',
        email: 'refresh@example.com',
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
    });

    it('should fail with no cookie', async () => {
      const res = await request(app).post('/api/auth/refresh');

      expect(res.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=invalid-token-value');

      expect(res.status).toBe(401);
    });

    it('should fail when valid JWT but token not stored on user', async () => {
      const { user, refreshToken } = await createAuthenticatedUser({
        username: 'stolentoken',
        email: 'stolen@example.com',
      });

      // Remove all tokens from the user's stored list
      await User.findByIdAndUpdate(user._id, { $set: { refreshTokens: [] } });

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`);

      expect(res.status).toBe(401);
    });
  });

  // ─── POST /api/auth/logout ─────────────────────────────────────────
  describe('POST /api/auth/logout', () => {
    it('should logout, clear cookie, and remove token from user', async () => {
      const { user, refreshToken } = await createAuthenticatedUser({
        username: 'logoutuser',
        email: 'logout@example.com',
      });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `refreshToken=${refreshToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out');

      // Verify token was removed from DB
      const updatedUser = await User.findById(user._id);
      expect(updatedUser!.refreshTokens).not.toContain(refreshToken);
    });

    it('should succeed even without a cookie', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out');
    });

    it('should still clear cookie and return 200 with expired token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', 'refreshToken=expired-or-invalid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out');
    });
  });

  // ─── POST /api/auth/google ────────────────────────────────────────
  describe('POST /api/auth/google', () => {
    beforeEach(() => {
      mockVerifyIdToken.mockReset();
    });

    it('should create a new user via Google sign-in', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'googleuser@gmail.com',
          name: 'Google User',
          picture: 'https://example.com/photo.jpg',
          sub: 'google-id-123',
        }),
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid-google-token' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('googleuser@gmail.com');
      expect(res.body.user.username).toBe('Google User');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toMatch(/refreshToken/);
    });

    it('should login existing Google user', async () => {
      // Create user with googleId
      await User.create({
        username: 'existinggoogle',
        email: 'existing@gmail.com',
        googleId: 'google-id-456',
        profileImage: 'https://example.com/old.jpg',
      });

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'existing@gmail.com',
          name: 'Existing Google',
          picture: 'https://example.com/new.jpg',
          sub: 'google-id-456',
        }),
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid-google-token' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('existing@gmail.com');
      expect(res.body.accessToken).toBeDefined();
    });

    it('should link Google to existing email user', async () => {
      // Create user with email/password but no googleId
      await createTestUser({
        username: 'emailuser',
        email: 'linkme@gmail.com',
        password: 'password123',
      });

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'linkme@gmail.com',
          name: 'Link Me',
          picture: 'https://example.com/pic.jpg',
          sub: 'google-id-789',
        }),
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid-google-token' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('linkme@gmail.com');

      // Verify googleId was linked
      const user = await User.findOne({ email: 'linkme@gmail.com' });
      expect(user!.googleId).toBe('google-id-789');
    });

    it('should fail with missing credential', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should fail with invalid Google token', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Google/i);
    });

    it('should create user with email prefix when Google returns no name', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'noname@gmail.com',
          name: '',
          picture: '',
          sub: 'google-id-noname',
        }),
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid-google-token' });

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('noname');
      expect(res.body.user.profileImage).toBe('');
    });

    it('should fail when Google returns no email', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          name: 'No Email',
          sub: 'google-id-noemail',
        }),
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid-google-token' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid Google token/i);
    });
  });

  // ─── Auth Middleware ──────────────────────────────────────────────
  describe('Auth Middleware', () => {
    it('should return 401 for expired access token', async () => {
      const expiredToken = jwt.sign({ _id: 'someid' }, process.env.JWT_SECRET || 'dev-jwt-secret', {
        expiresIn: '0s',
      } as jwt.SignOptions);

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ username: 'newname' });

      expect(res.status).toBe(401);
    });
  });

  // ─── User Model ──────────────────────────────────────────────────
  describe('User Model', () => {
    it('comparePassword should return false for user without password (Google user)', async () => {
      const user = await User.create({
        username: 'googleonly',
        email: 'googleonly@gmail.com',
        googleId: 'google-no-pw',
      });

      const result = await user.comparePassword('anypassword');
      expect(result).toBe(false);
    });
  });
});
