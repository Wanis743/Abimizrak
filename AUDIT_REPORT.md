
## TypeScript 7 follow-up repair — 2026-09-08

Repaired after Windows TypeScript 7.0.2 typecheck exposed API-server issues:
- Express request authentication augmentation now targets `express-serve-static-core` directly.
- API auth access is normalized through safe request-auth casts/helpers where route-local request aliases are used.
- Route parameter access is normalized to strings instead of `string | string[]`.
- TypeScript 7 implicit-any regressions in database-result callbacks are explicitly typed.
- Campus seed/activity collections have explicit types.
- Admin moderation handler now returns after error forwarding to satisfy `noImplicitReturns`.

Static verification in this environment: 209 TS/TSX files parsed successfully with 0 parser/bind diagnostics; JSON package/config checks passed. A full `pnpm typecheck` still needs to be run in the user's installed Windows dependency environment.
