import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/safekids',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-jwt-refresh-secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://10.0.0.100:11434',
    model: process.env.OLLAMA_MODEL || 'gemma3:12b',
    rateLimitMax: parseInt(process.env.AI_RATE_LIMIT_MAX || '5', 10),
    rateLimitWindowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || '60000', 10),
    cacheTtlSeconds: parseInt(process.env.AI_CACHE_TTL_SECONDS || '60', 10),
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10),
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
