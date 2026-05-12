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
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
  CHAT_MAX_TOKENS: z.coerce.number().default(1024),
  CHAT_HISTORY_LIMIT: z.coerce.number().default(10),
  LLM_PROVIDER: z.enum(['anthropic', 'ollama']).default('anthropic'),
  OLLAMA_URL: z.string().default(''),
  OLLAMA_MODEL: z.string().default('gemma4:e2b'),
  RESEND_API_KEY: z.string().default(''),
  RESEND_FROM_EMAIL: z.string().default('GTMS <noreply@gtms.geohan.com>'),
  MS_CLIENT_ID: z.string().default(''),
  MS_TENANT_ID: z.string().default(''),
  MS_CLIENT_SECRET: z.string().default(''),
  M365_SENDER_EMAIL: z.string().default(''),
  MS_ADMIN_GROUP_ID: z.string().default(''),
  // Comma-separated list of skuPartNumbers to import from M365.
  // Defaults cover Microsoft 365 Business Basic and Business Standard (under both legacy and current part-number names).
  M365_ALLOWED_SKU_PARTS: z.string().default('O365_BUSINESS_ESSENTIALS,O365_BUSINESS_PREMIUM,BUSINESS_BASIC,BUSINESS_STANDARD'),
});

export const config = envSchema.parse(process.env);
