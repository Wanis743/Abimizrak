# Abi Mizrak Digital Campus — Architecture Contract

## Product boundary
A single Algerian lycée digital campus. The core product is school life inside one institution: social spaces, classes, teachers, administration, identity, projects, clubs, events, facilities, resources and contextual AI.

## Clients
- `artifacts/abi-mizrak-campus`: web application
- `apps/mobile`: Expo/React Native mobile application foundation for Android/iOS
- future native capabilities must use the same API and identity model

## Backend
`artifacts/api-server` is the application API. Clients should not read/write school data directly from Supabase tables. Supabase is currently used as the authentication issuer; the API is the authorization and domain boundary.

## Domain/data
`lib/db` owns the Drizzle schema. Verification state and audit history are persistent database records. Social, academic and operational entities are designed to become connected through shared IDs and explicit relationships.

## Authentication / authorization
Authentication verifies the account. School verification verifies affiliation. Role/permission checks authorize actions. Never infer administrator privileges from a hardcoded email. Server-side authorization is mandatory.

## Verification lifecycle
`pending → approved | suspended | expired`, with role verification tracked separately. Credentials are active only when the member is approved. Verification actions are persisted in `campus_verification_audits`.

## Realtime
WebSockets/Supabase realtime may be used for delivery signals, but API/database state remains the source of truth. Do not write school data directly from the browser.

## Design system
`Liquid Campus` is a custom material language, not generic glassmorphism. Use glass selectively, with depth, translucency, refraction-like highlights, contextual panels, spatial continuity, object morphing and restrained motion. Administration remains information-dense and operationally efficient.

## Production rules
- no mock API behavior in the API client
- no committed `.env` files
- no hardcoded secrets
- no in-memory authorization/audit state
- no client-side-only security decisions
- no duplicate sources of truth for Channels/Spaces/identity
- no fake AI responses; AI fails transparently when a provider is not configured

## Mobile dependency note
`apps/mobile` is intentionally kept outside the root pnpm workspace until Expo dependencies can be resolved in a networked environment; this prevents the existing web/API lockfile from being invalidated during an offline refactor. The app uses the same API contract and authentication model.
