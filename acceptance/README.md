# Phase 12 acceptance environment

This harness is restricted to a dedicated, disposable Supabase test project. It fails closed unless `ACCEPTANCE_ENVIRONMENT_ID=abi-mizrak-acceptance-only` and every suite-specific prerequisite is supplied through an ignored local environment file or process environment. Secrets are never stored or printed.

## Architecture and setup

Run the production-like frontend with `VITE_API_URL` pointing to `ACCEPTANCE_API_URL` and the existing public Supabase client variables pointing to `SUPABASE_TEST_URL`. Run the API with its existing database, authentication, CORS, and Supabase configuration targeting the same isolated project. Apply repository migrations through 0006 unchanged. Create the five controlled Auth identities represented in `.env.example`, set authorization roles in trusted app metadata/server-side records, then seed rows with IDs from `fixtures/manifest.mjs`. Upserts are required so setup is repeatable. Never aim this configuration at production.

The deterministic fixture namespace is `acceptance-p12-`. It covers two separately owned students, one teacher authorized only for Student A's class, an administrator, a non-member, academic records, verification, timetable, attendance, grades, assignment/submission, event, notification, room/facility, governance audit, private space membership, private message, thread, and presence scope. Identity creation and privileged seed writes must be performed only by a local setup operator with `SUPABASE_TEST_SERVICE_ROLE_KEY`; that secret must remain server-side and is intentionally not consumed by browser tests.

## Commands

- `pnpm test:fixtures` validates deterministic offline fixture coverage.
- `pnpm test:acceptance:prereqs` checks configuration without displaying values.
- `pnpm test:api` exercises the real API, auth, authorization, handler, database, response, and mutation persistence.
- `pnpm test:rls` and `pnpm test:security` use separately authenticated Supabase clients and assert real row-boundary allow/deny behavior.
- `pnpm test:realtime` uses private Supabase Realtime channels and verifies member/non-member subscription behavior.
- `pnpm test:e2e` uses the installed Edge channel and real student, teacher, and administrator identities. No browser download is required.

Absent credentials, backend, policies, seeded records, or Edge produce a failing `BLOCKED`/launch result, never a pass.

## Mobile runtime preparation

Use the existing Expo scripts with `EXPO_PUBLIC_API_URL` and public Supabase variables targeting the isolated environment. Android runtime needs Android Studio, SDK, adb, and an emulator/device; these are unavailable on the current machine. iOS runtime needs macOS, Xcode, and an iOS simulator/device and cannot run natively on Windows. Existing production exports are not repeated by this harness.

## Deployment rehearsal preparation

Web deployment requires the built frontend plus public API/Supabase URLs. API deployment requires the existing database/auth secrets, an explicit allowed CORS origin matching the web URL, and the API URL exposed to the frontend. Database preparation requires applying the existing migration sequence through 0006 and confirming the deployed ledger. Rehearsal must use a non-production target and controlled identities; no deployment is performed by these tests.
