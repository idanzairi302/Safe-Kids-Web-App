import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { createTestUser, createAuthenticatedUser, getAccessToken } from './setup';

describe('User Routes', () => {
  // ─── GET /api/users/:id ─────────────────────────────────────────────
  describe('GET /api/users/:id', () => {
    it('should return user profile (public fields)', async () => {
      const user = await createTestUser({
        username: 'publicuser',
        email: 'public@example.com',
      });

      const res = await request(app).get(`/api/users/${user._id}`);

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('publicuser');
      expect(res.body.email).toBe('public@example.com');
      expect(res.body.password).toBeUndefined();
      expect(res.body.refreshTokens).toBeUndefined();
    });

    it('should return 404 for non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/users/${fakeId}`);

      expect(res.status).toBe(404);
    });

    it('should return 500 for invalid ID format', async () => {
      const res = await request(app).get('/api/users/invalid-id');

      expect(res.status).toBe(500);
    });
  });

  // ─── PUT /api/users/me ─────────────────────────────────────────────
  describe('PUT /api/users/me', () => {
    it('should update username with auth', async () => {
      const { user, accessToken } = await createAuthenticatedUser({
        username: 'oldname',
        email: 'update@example.com',
      });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: 'newname' });

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('newname');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .send({ username: 'newname' });

      expect(res.status).toBe(401);
    });

    it('should fail with duplicate username', async () => {
      await createTestUser({ username: 'taken', email: 'taken@example.com' });

      const { accessToken } = await createAuthenticatedUser({
        username: 'original',
        email: 'original@example.com',
      });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: 'taken' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Username/i);
    });
  });
});
