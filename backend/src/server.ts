import app from './app';
import connectDB from './config/database';
import { config } from './config/env';

const start = async () => {
  await connectDB();

  app.listen(config.port, () => {
    console.log(`SafeKids API running on port ${config.port} [${config.nodeEnv}]`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
