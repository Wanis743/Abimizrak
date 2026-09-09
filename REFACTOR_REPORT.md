# Abi Mizrak — Refactor / Hardening Report

## What was changed

### API/data boundary
- Removed the mock/fallback API behavior from `lib/api-client-react/src/custom-fetch.ts`.
- API client now performs real HTTP calls, attaches the Supabase bearer token, parses responses, and throws structured `ApiError` instances.
- Removed direct browser table access from the campus UI. School data now goes through the backend API; Supabase remains an authentication/realtime transport where explicitly used.

### Authentication / verification
- Removed the hardcoded administrator email path.
- Administrator bootstrap now uses `CAMPUS_ADMIN_USER_IDS` or authenticated user metadata.
- New campus members default to `pending` rather than `verified`.
- Added persistent membership/role verification state to the database model.
- Added persistent `campus_verification_audits` records instead of in-memory Maps.
- Verification approval/review records actor, action, note, timestamps, and role state.
- Credential output is now tied to actual verification state.

### Social / Spaces
- Space channels are now seeded as real channel records rather than relying on the `channels` array as the source of truth.
- Channel messages are persisted by the API and can use realtime delivery signals without allowing the browser to write directly to the database.
- Added foundations for threads, reactions, comments, notifications, and presence.
- Added membership checks before reading/posting to Spaces.

### Academic safety
- Assignment reads are role/membership scoped.
- Only teachers/administrators can create assignments.
- Only students can submit assignments.
- Submissions are checked against the student's Space membership and duplicates are rejected.

### AI
- Removed the fake AI response.
- Removed the obsolete provider adapter and kept AI integration disabled for the current product phase.
- If AI is not configured, the API returns an explicit 503 configuration error rather than pretending to have generated an answer.

### Talent / events / clubs
- Replaced direct client DB calls for events, RSVPs, talent discovery, portfolios, skills, club applications, and Space context with backend API endpoints.
- Portfolio updates are owner-scoped.
- Club applications and approvals are API-controlled.

### Design system
- Replaced the previous M3/paper-card visual base with a new `Liquid Campus` material layer.
- Added glass surfaces, depth hierarchy, selective translucency, ambient fields, grain, refined motion, focus states, and responsive behavior.
- Added a contextual command palette and improved mobile navigation shell.
- Kept the glass treatment selective so the interface does not become generic glassmorphism.

### Mobile
- Added `apps/mobile` as the Android/iOS Expo + React Native foundation.
- It uses the same API model and is deliberately separate from direct DB access.
- Mobile dependency resolution was not forced into the root lockfile because this refactor was performed in an offline environment.

### Repository hygiene
- Removed committed `.env` files containing environment material.
- Added `.env` ignores and a clean root `.env.example`.
- Removed stale Clerk proxy runtime code from the server.
- Moved historical one-off patch scripts into `tools/legacy-migrations/` so they are no longer mixed into production source directories.
- Removed stale build artifacts.
- Updated the Drizzle migration journal and added `0001_campus_foundation.sql`.

## Validation performed

- TypeScript/TSX parser validation: 206 files scanned, 0 syntax diagnostics.
- No direct `supabase.from(...)` calls remain in the web source.
- No `mock_status`, fake AI, unmocked API, hardcoded admin email, or in-memory verification Maps remain in production source.

## Not fully verified in this environment

The repository currently has no installed `node_modules`, so a full dependency-resolved `pnpm build`/runtime integration test could not be executed here. The project should be dependency-installed and run against a real Postgres/Supabase environment before production deployment.

## Important operational note

Any real secrets that were present in the original archive should be rotated. Removing them from the working tree does not revoke credentials that may already have been exposed elsewhere.
