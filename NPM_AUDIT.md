# NPMScan dependency audit

Audited the workspace dependency inventory with NPMScan.

## Actioned findings

- Vite was pinned on the vulnerable 7.x line. Catalog updated to Vite 8.2.2.
- @vitejs/plugin-react updated to 6.1.1 to match Vite 8.
- Orval updated to 8.28.1. NPMScan reports the prior 8.x line had multiple critical generation/RCE advisories; 8.28.1 was clean in this scan.
- React Hook Form pinned to 7.87.0; NPMScan returned no vulnerability for that version.

## Important lockfile note

The authoritative pnpm lock graph must be regenerated with `pnpm install` on a networked machine after these catalog changes. Do not use `--frozen-lockfile` until the lockfile has been reconciled by pnpm.

## Findings not treated as current vulnerabilities

NPMScan also returned historical advisories for old React, Express, Expo, React Native, pg, and Zod versions. The project's current modern versions were checked separately and did not return those findings.
