import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../src/auth/user.model';
import { config } from '../src/config/env';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

export interface TestUser {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export async function createTestUser(
  overrides: Partial<{ username: string; email: string; password: string }> = {}
): Promise<IUser> {
  const user = new User({
    username: overrides.username || `testuser_${Date.now()}`,
    email: overrides.email || `test_${Date.now()}@example.com`,
    password: overrides.password || 'password123',
  });
  await user.save();
  return user;
}

export function getAccessToken(userId: string): string {
  return jwt.sign({ _id: userId }, config.jwt.secret, {
    expiresIn: '15m',
  } as jwt.SignOptions);
}

export function getRefreshToken(userId: string): string {
  return jwt.sign({ _id: userId }, config.jwt.refreshSecret, {
    expiresIn: '7d',
  } as jwt.SignOptions);
}

export async function createAuthenticatedUser(
  overrides: Partial<{ username: string; email: string; password: string }> = {}
): Promise<TestUser> {
  const user = await createTestUser(overrides);
  const accessToken = getAccessToken(user._id.toString());
  const refreshToken = getRefreshToken(user._id.toString());

  user.refreshTokens.push(refreshToken);
  await user.save();

  return { user, accessToken, refreshToken };
}

// 1x1 pixel PNG buffer for upload tests
export const testImageBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);
