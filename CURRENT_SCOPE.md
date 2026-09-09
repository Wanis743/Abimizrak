# Current Scope — Abi Mizrak Digital Campus

## Product decision
AI features are intentionally disabled for this phase. No AI tutor, AI chat endpoint, AI provider configuration, or AI navigation entry is part of the current product.

## Current priority
1. School identity and verified membership
2. Deep role/permission model
3. Spaces / channels / social interaction
4. Teacher workspace
5. Administration workspace
6. Academic core
7. Projects / clubs / events / campus
8. Web + Android + iOS experience
9. Liquid Campus design system
10. Security / RLS / audit / realtime

## Mobile
The repository contains a real Expo app scaffold using the same API surface. It intentionally avoids any AI dependency.

## Security
The configured super-admin remains a server-side allowlisted privileged role. It is not a backdoor. Privileged actions must remain authenticated and auditable.

## Latest hardening pass — 2026-09-08
- The production app shell now uses the Liquid Campus layout in the actual router.
- Teacher assignments, member verification, projects, project milestones, and project chat are routed through the API boundary instead of direct browser table mutations.
- Project creation automatically provisions its `project-general` channel.
- Project chat authorization accepts project membership as well as campus-space membership.
- Supabase Data API policies for `campus_*` tables were reduced to a single approved-membership/project-member Realtime read policy on `campus_messages`; server-side API access remains the authoritative mutation path.
- AI remains intentionally out of the current product phase.

## 2026-09-08 continuation
- Added first-class academic schema definitions mirroring the existing live academic database tables.
- Added `/api/academic/overview` for student academic snapshots: timetable, published assignments, attendance rate, recent grades, weighted average.
- Added teacher/admin academic endpoints: class list, class roster, attendance upsert, grade upsert/list.
- Added the `/academic` web workspace and command-palette entry.
- Fixed missing page/component imports in `App.tsx` and removed a duplicate project icon entry.
- Expanded runtime indexing for academic queries and kept legacy academic tables protected behind the backend boundary.
- AI remains intentionally disabled for this phase.
