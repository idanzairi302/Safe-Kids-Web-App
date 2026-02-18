// Mock dotenv BEFORE any imports so .env file is never loaded
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('Config (env.ts)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    // Re-mock dotenv after resetModules
    jest.mock('dotenv', () => ({
      config: jest.fn(),
    }));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should use default values when no env vars are set', () => {
    // Clear all relevant env vars so the || defaults are used
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.MONGODB_URI;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_ACCESS_EXPIRY;
    delete process.env.JWT_REFRESH_EXPIRY;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
    delete process.env.OLLAMA_USERNAME;
    delete process.env.OLLAMA_PASSWORD;
    delete process.env.AI_RATE_LIMIT_MAX;
    delete process.env.AI_RATE_LIMIT_WINDOW_MS;
    delete process.env.AI_CACHE_TTL_SECONDS;
    delete process.env.UPLOAD_DIR;
    delete process.env.MAX_FILE_SIZE_MB;
    delete process.env.FRONTEND_URL;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { config } = require('../src/config/env');

    expect(config.port).toBe(3001);
    expect(config.nodeEnv).toBe('development');
    expect(config.mongodb.uri).toBe('mongodb://localhost:27017/safekids');
    expect(config.jwt.secret).toBe('dev-jwt-secret');
    expect(config.jwt.refreshSecret).toBe('dev-jwt-refresh-secret');
    expect(config.jwt.accessExpiry).toBe('15m');
    expect(config.jwt.refreshExpiry).toBe('7d');
    expect(config.google.clientId).toBe('');
    expect(config.google.clientSecret).toBe('');
    expect(config.ollama.baseUrl).toBe('http://10.10.248.41');
    expect(config.ollama.model).toBe('llama3.1:8b');
    expect(config.ollama.username).toBe('');
    expect(config.ollama.password).toBe('');
    expect(config.ollama.rateLimitMax).toBe(5);
    expect(config.ollama.rateLimitWindowMs).toBe(60000);
    expect(config.ollama.cacheTtlSeconds).toBe(60);
    expect(config.upload.dir).toBe('./uploads');
    expect(config.upload.maxFileSizeMb).toBe(5);
    expect(config.frontendUrl).toBe('http://localhost:5173');
  });

  it('should use environment variables when set', () => {
    process.env.PORT = '4000';
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI = 'mongodb://custom:27017/testdb';
    process.env.JWT_SECRET = 'custom-secret';
    process.env.JWT_REFRESH_SECRET = 'custom-refresh-secret';
    process.env.JWT_ACCESS_EXPIRY = '30m';
    process.env.JWT_REFRESH_EXPIRY = '14d';
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
    process.env.OLLAMA_BASE_URL = 'http://custom-ollama:11434';
    process.env.OLLAMA_MODEL = 'mistral:7b';
    process.env.OLLAMA_USERNAME = 'admin';
    process.env.OLLAMA_PASSWORD = 'secret';
    process.env.AI_RATE_LIMIT_MAX = '10';
    process.env.AI_RATE_LIMIT_WINDOW_MS = '120000';
    process.env.AI_CACHE_TTL_SECONDS = '300';
    process.env.UPLOAD_DIR = '/tmp/uploads';
    process.env.MAX_FILE_SIZE_MB = '10';
    process.env.FRONTEND_URL = 'https://safekids.example.com';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { config } = require('../src/config/env');

    expect(config.port).toBe(4000);
    expect(config.nodeEnv).toBe('production');
    expect(config.mongodb.uri).toBe('mongodb://custom:27017/testdb');
    expect(config.jwt.secret).toBe('custom-secret');
    expect(config.jwt.refreshSecret).toBe('custom-refresh-secret');
    expect(config.jwt.accessExpiry).toBe('30m');
    expect(config.jwt.refreshExpiry).toBe('14d');
    expect(config.google.clientId).toBe('google-client-id');
    expect(config.google.clientSecret).toBe('google-client-secret');
    expect(config.ollama.baseUrl).toBe('http://custom-ollama:11434');
    expect(config.ollama.model).toBe('mistral:7b');
    expect(config.ollama.username).toBe('admin');
    expect(config.ollama.password).toBe('secret');
    expect(config.ollama.rateLimitMax).toBe(10);
    expect(config.ollama.rateLimitWindowMs).toBe(120000);
    expect(config.ollama.cacheTtlSeconds).toBe(300);
    expect(config.upload.dir).toBe('/tmp/uploads');
    expect(config.upload.maxFileSizeMb).toBe(10);
    expect(config.frontendUrl).toBe('https://safekids.example.com');
  });
});
