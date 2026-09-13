# Base44 Dev Environment — Abi Mizrak Digital Campus

## Stack
- **Monorepo**: pnpm workspace (lockfile v9, pnpm 10). `pnpm-workspace.yaml` has `minimumReleaseAge: 1440`.
- **Frontend**: `artifacts/abi-mizrak-campus` — Vite + React 19 + Tailwind 4, dev server on port 5173.
- **API**: `artifacts/api-server` — Express 5, builds with esbuild (`build.mjs`) then runs `node dist/index.mjs`. No live reload; restart the `api` service after code changes.
- **Database**: PostgreSQL 16 via `pg` + drizzle-orm (`lib/db`). Schema in `lib/db/src/schema/`.
- **Auth**: Supabase (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`). Required by both frontend and API at boot.

## Architecture decisions
- **Single-origin wiring**: Vite dev server proxies `/api` → `http://api:5000` (see `vite.config.ts` proxy config, `API_PROXY_TARGET` env). The frontend's `customFetch` calls are relative (no `setBaseUrl` call), so a proxy is required.
- API CORS still checks `Origin` for POST requests, so `CORS_ORIGIN` is set to the frontend's public URL.
- **Schema sync**: `drizzle-kit push --force` (not SQL migrations — `supabase/migrations/` use Supabase-specific `auth.uid()` functions incompatible with plain Postgres).
- **Seed**: `supabase/migrations/20260908005117_seed_abi_mizrak_school.sql` inserts the school row via `psql`.
- `node_modules` is a named volume shared across services; `setup` runs `pnpm install --frozen-lockfile` first.

## Verification
- Frontend: `curl http://localhost:3000` returns the Vite HTML shell.
- API health: `curl http://localhost:8000/api/healthz` returns `{"status":"ok"}`.
- DB: `docker compose -f docker-compose.base44.yml exec db psql -U campus -d campus -c '\dt'` lists tables.

## Secrets
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required at boot. Development placeholders are in `.env.base44-defaults`; real values should be provided via the Base44 secrets dashboard and land in `/run/base44/app.env`.
