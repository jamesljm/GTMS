Session: Fix Dockerfile — compile TS, remove tsx, safer db push
Started: 2026-06-27
Starting commit: d81a256
Goal: Fix three production reliability issues in packages/backend/Dockerfile: add TypeScript compilation, replace tsx with node, and remove --accept-data-loss flag.

Plan
1. Add `npx tsc` to the build stage so TypeScript is compiled to dist/ during image build.
2. Change CMD from `npx tsx src/index.ts` to `node dist/index.js` to run pre-compiled JS.
3. Remove `--accept-data-loss` from `prisma db push` so destructive schema changes fail loudly.

Log
- Read packages/backend/Dockerfile, confirmed content matches plan expectations.
- Edited line 23: added `&& npx tsc` after `npx prisma generate`.
- Edited line 40: changed CMD to `npx prisma db push --skip-generate && node dist/index.js`.
- Verified final file content is correct.

Outcome
Ended: 2026-06-27
Ending commit: d81a256 (changes not yet committed)
Shipped: All three Dockerfile fixes applied.
Incomplete: Verification steps (local build test, Docker image build) not run — left for user.
Follow-ups: None.
