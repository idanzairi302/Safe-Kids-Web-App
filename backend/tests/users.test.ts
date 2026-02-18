import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import User from '../src/auth/user.model';
import { createTestUser, createAuthenticatedUser, getAccessToken, testImageBuffer } from './setup';

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

    it('should fail with too-short username', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'validname',
        email: 'shortname@example.com',
      });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: 'ab' });

      expect(res.status).toBe(400);
    });

    it('should update profile image with auth', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'imguser',
        email: 'imguser@example.com',
      });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('profileImage', testImageBuffer, 'avatar.png');

      expect(res.status).toBe(200);
      expect(res.body.profileImage).toMatch(/\/uploads\//);
    });

    it('should update both username and profile image', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'bothuser',
        email: 'bothuser@example.com',
      });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('username', 'updatedname')
        .attach('profileImage', testImageBuffer, 'avatar.png');

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('updatedname');
      expect(res.body.profileImage).toMatch(/\/uploads\//);
    });

    it('should reject non-image file for profile image', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'badfile',
        email: 'badfile@example.com',
      });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('profileImage', Buffer.from('not an image'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(500);
    });

    it('should return 404 when authenticated user not found in DB', async () => {
      const { user, accessToken } = await createAuthenticatedUser({
        username: 'ghostuser',
        email: 'ghost@example.com',
      });

      // Delete the user from DB after getting the token
      await User.findByIdAndDelete(user._id);

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: 'newname' });

      expect(res.status).toBe(404);
    });

    it('should return 500 when update profile throws', async () => {
      const { accessToken } = await createAuthenticatedUser({
        username: 'errupdate',
        email: 'errupdate@example.com',
      });

      const spy = jest.spyOn(User, 'findById').mockImplementationOnce(() => {
        throw new Error('DB error');
      });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: 'newname' });

      expect(res.status).toBe(500);
      spy.mockRestore();
    });
  });
});
