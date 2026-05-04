# GTMS Update Workflow

Step-by-step guide for updating GTMS between dev and prod machines.

---

## DEV machine — making changes

1. **Pull latest first** (avoid conflicts):
   ```
   git checkout Haykal
   git pull origin Haykal
   ```

2. **Make your code changes** in your editor.

3. **Test locally** (run dev mode):
   ```
   pnpm install        # only if dependencies changed
   pnpm db:generate    # only if Prisma schema changed
   pnpm dev
   ```
   Open http://localhost:3000 (or whatever port you use locally) and verify the change works.

4. **Commit and push:**
   ```
   git add <files-you-changed>
   git commit -m "describe what you changed"
   git push origin Haykal
   ```

   ⚠️ **Never commit `.env` files** — they're in `.gitignore` for safety.

---

## PROD machine — deploying the update

> Prod machine: `C:\Users\Harmen\Documents\TempHost\GTMS`

1. **Take a manual backup first** (just in case — backups already run automatically inside Docker):
   ```
   docker compose exec backup sh /backup.sh
   ```
   Or run the PowerShell script directly: `.\scripts\backup.ps1`

2. **Pull the latest code:**
   ```
   git pull origin Haykal
   ```

3. **Rebuild and restart Docker:**
   ```
   docker compose --profile app down
   docker compose --profile app up --build -d
   ```

4. **Verify it's running:**
   ```
   docker compose ps
   ```
   All 4 services (postgres, redis, backend, frontend) should be `running` / `healthy`.

5. **Check logs if anything looks wrong:**
   ```
   docker compose logs backend --tail 50
   docker compose logs frontend --tail 50
   ```

6. **Test the public URL:** https://gtms.geohan.com

---

## Special cases

### Database schema changed (new Prisma migrations)

The backend Dockerfile auto-runs `prisma db push` on startup, so schema changes apply automatically when the container starts. Just rebuild as above.

If something goes wrong, restore from backup:
```
docker compose exec -T postgres psql -U postgres gtms < "C:\Users\Harmen\Documents\TempHost\GTMS-Backups\gtms-latest.sql"
```

### New environment variable added

If the dev added a new env var to `config.ts`:

1. Get the value from the dev (DM, password manager, etc.)
2. Edit `packages/backend/.env` (or `packages/frontend/.env.local`) on the prod machine
3. If it needs to be in Docker too, add it to `docker-compose.yml`
4. Rebuild as above

### Rolling back a bad update

```
git log --oneline -10              # find the commit BEFORE the bad one
git checkout <commit-hash>
docker compose --profile app down
docker compose --profile app up --build -d
```

To go back to latest after testing:
```
git checkout Haykal
```

---

## Quick reference

| Task | Command |
|------|---------|
| Pull latest | `git pull origin Haykal` |
| Restart only (no code changes) | `docker compose --profile app restart` |
| Full rebuild | `docker compose --profile app down && docker compose --profile app up --build -d` |
| View backend logs | `docker compose logs backend -f` |
| View frontend logs | `docker compose logs frontend -f` |
| Manual backup (host) | `.\scripts\backup.ps1` |
| View backup container logs | `docker compose logs backup -f` |
| Restore backup | `docker compose exec -T postgres psql -U postgres gtms < <path-to-sql>` |
| Stop everything | `docker compose --profile app down` |
| Stop + delete data (⚠ destructive) | `docker compose --profile app down -v` |

---

## Public URLs

- **Frontend:** https://gtms.geohan.com
- **Backend API:** https://api-gtms.geohan.com
- **Local frontend:** http://localhost:3002
- **Local backend:** http://localhost:3005

## Backup location

`C:\Users\Harmen\Documents\TempHost\GTMS-Backups\`

- `gtms-latest.sql` — always today's backup
- `gtms-YYYY-MM-DD.sql` — dated backups (last 30 days kept)
- `backup.log` — script run history

Backups run automatically inside the `backup` Docker container, daily at 02:00 Malaysia time. The container starts with the rest of the stack via `docker compose up -d`.
