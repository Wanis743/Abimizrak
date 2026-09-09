# Abimizrak Release Audit — 2026-09-09

## Verified in the container
- 145 production TypeScript/TSX source files parsed with no delimiter/parser diagnostics.
- `pnpm-lock.yaml` parses as valid YAML.
- Workspace package manifests parse as valid JSON.
- Production workspace excludes the mockup sandbox.
- No Replit identifiers or active AI-provider identifiers in runtime source.
- No `duplex: "half"` browser fetch workaround remains.
- Vite development/preview host defaults to loopback and uses explicit allowed hosts.
- Windows CI workflow added at `.github/workflows/verify-windows.yml`.
- Campus seed logic now creates missing canonical spaces/channels individually rather than skipping seeding when any unrelated space exists.
- Space member counts are recomputed from membership rows rather than incrementally guessed.

## Dependency/security checks
The audited exact versions checked with NPMScan were clean for known OSV findings:
- TypeScript 7.0.2
- Vite 8.2.2
- @vitejs/plugin-react 6.1.1
- Orval 8.28.1
- esbuild 0.28.2
- Drizzle ORM 0.45.2
- Express 5.2.1
- Supabase JS 2.115.0
- React 19.1.0
- React DOM 19.1.0
- React Hook Form 7.87.0
- pg 8.23.0
- zod 3.25.76
- Expo 55.0.0
- React Native 0.82.1

## Still requires the user's Windows environment
The container cannot reproduce the dependency-backed Windows installation/build because the npm registry is unavailable here. Final verification should run:

```powershell
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm build
```
