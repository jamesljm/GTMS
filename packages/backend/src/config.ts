import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('dev-jwt-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().default('dev-jwt-refresh-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('4h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ANTHROPIC_API_KEY: z.string().default(''),
  RESEND_API_KEY: z.string().default(''),
  RESEND_FROM_EMAIL: z.string().default('GTMS <noreply@gtms.geohan.com>'),
  MS_CLIENT_ID: z.string().default(''),
  MS_TENANT_ID: z.string().default(''),
  MS_CLIENT_SECRET: z.string().default(''),
  M365_SENDER_EMAIL: z.string().default(''),
});

export const config = envSchema.parse(process.env);
