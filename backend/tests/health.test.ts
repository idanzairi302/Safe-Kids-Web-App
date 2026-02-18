import request from 'supertest';
import app from '../src/app';

describe('Health Check', () => {
  describe('GET /api/health', () => {
    it('should return status ok with timestamp', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
    });
  });
});
