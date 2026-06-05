require('dotenv').config({ path: '../.env' });
require('dotenv').config();

const { z } = require('zod');

// Schema for required environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('3000'),
  DB_CONNECTION_STRING: z.string().min(1, 'Database connection string is required'),
  REDIS_URL: z.string().optional(), // Make optional for local dev without redis
  SENTRY_DSN: z.string().optional(),
});

// Parse and validate
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

module.exports = parsedEnv.data;
