import request from 'supertest';
import app from '../src/app';
import User from '../src/auth/user.model';
import { createTestUser, createAuthenticatedUser, getRefreshToken } from './setup';

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
  });
});
