import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config/env';
import authRoutes from './auth/auth.routes';
import postRoutes from './posts/post.routes';

const app = express();

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(config.upload.dir)));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

export default app;
