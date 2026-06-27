Session: Replace BullMQ + Redis with node-cron
Started: 2026-06-26
Starting commit: d81a256
Goal: Replace BullMQ (backed by Upstash Redis) with node-cron for all 6 scheduled jobs to eliminate Redis dependency and avoid Upstash free-tier rate limit exhaustion.

Plan
- Remove bullmq and ioredis from package.json, add node-cron
- Rewrite workers.ts to use node-cron with same cron patterns
- Update index.ts imports and health check
- Remove REDIS_URL from config.ts and render.yaml
- Verify with pnpm install + build

Log

-- Read all 5 target files (package.json, workers.ts, index.ts, config.ts, render.yaml)
-- Removed bullmq and ioredis from package.json dependencies
-- Added node-cron (^3.0.3) to dependencies and @types/node-cron (^3.0.11) to devDependencies
-- Rewrote workers.ts: replaced BullMQ Queue/Worker with cron.schedule(), kept all 6 job patterns and logic identical, added try/catch per job, exported startScheduledJobs() and getSchedulerStatus()
-- Updated index.ts: replaced startWorkers/setupRecurringJobs/getRedisStatus imports with startScheduledJobs/getSchedulerStatus, simplified startup (no try/catch for Redis errors), health check now returns scheduler status
-- Removed REDIS_URL from config.ts Zod schema
-- Removed REDIS_URL env var from render.yaml, updated bottom comment
-- Checked for stale references: no remaining bullmq/ioredis/REDIS_URL references in src/
-- Noted: .env still has REDIS_URL (harmless, no longer read by app)
-- Verified Dockerfile has no Redis references
-- pnpm install succeeded: +3 packages (node-cron + types), bullmq/ioredis removed from lockfile
-- pnpm --filter backend build (tsc) succeeded with zero errors

Outcome
Shipped: All 6 scheduled jobs migrated from BullMQ+Redis to node-cron. Redis dependency fully removed from code, config, and deploy manifest.
Incomplete: None
Follow-ups:
- Remove REDIS_URL from .env file manually (not touched per policy)
- Remove REDIS_URL from Render dashboard environment variables if set there
- After deploying, monitor logs to confirm cron jobs fire at expected times
