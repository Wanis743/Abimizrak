# Abi Mizrak Campus — Engineering Progress

## Current state
The project is a single-school campus platform for Lycée Abi Mizrak. AI is intentionally disabled for this phase.

## Architecture
- React/Vite/Tailwind web client.
- Express API server.
- Supabase Auth for identity/session verification.
- PostgreSQL/Drizzle for persistent application data.
- Server-side authorization is the authoritative RBAC boundary.
- Web pages do not query Supabase tables directly; Supabase is used client-side only for Auth/Realtime.
- Expo/React Native mobile foundation uses Supabase Auth + API calls.

## Identity / access
- New members default to pending verification.
- School affiliation and requested role are explicit state.
- Admin verification actions are audited.
- Super-admin entitlement is server-side allowlisted through `CAMPUS_SUPERADMIN_EMAILS`; it is authenticated, unlisted, server-authorized, and auditable rather than a covert backdoor.

## Product surfaces
### Student
- Campus home/activity/spaces.
- Academic overview: today's timetable, assignments, attendance rate, recent grades, weighted average.
- Identity/credential/verification.
- Projects, portfolio/talent, events, social space chat.

### Teacher
- `/teacher` workspace.
- Class scoping based on teaching timetable/assignments.
- Roster.
- Daily attendance.
- Gradebook with coefficient-aware values.
- Weekly timetable.
- Assignment creation and listing in the academic schema.
- Grade writes validate student enrollment and teacher-to-subject assignment.
- Attendance writes validate student enrollment and teacher-to-subject assignment.

### Admin
- `/admin` operational control center.
- Verification desk.
- Academic year + term configuration.
- Subject registry.
- Class cohort creation.
- Room/facility registry.
- Attendance intelligence.
- Verification audit trail.
- Timetable mutation APIs with conflict detection.
- Admin People console for student class placement and teacher roster visibility.
- Admin timetable builder wired to class/subject/teacher/room registries.
- Academic assignment lifecycle APIs.

## Database
Live Supabase project is synchronized with:
- campus security hardening.
- campus runtime tables/indexes.
- academic runtime indexes.
- baseline `schools` record for Abi Mizrak.

Legacy academic tables are currently empty and can be populated through the admin layer without migration of existing data.

## Security
- RLS is enabled on the exposed campus/legacy tables.
- Broad legacy campus Data API policies were removed.
- Realtime message reads are membership/project scoped.
- Authorization does not trust user-editable `user_metadata`.
- Timetable edits re-check overlap conflicts server-side, excluding the row being edited.
- Supabase advisors were run after DDL changes.
- Auth leaked-password protection remains a dashboard setting that should be enabled before production launch.

## Validation limits
- TypeScript source parsing was previously clean across web/API/mobile; the latest edits were checked with no brace/parenthesis balance errors, but full dependency-resolved typecheck remains unavailable in this container.
- Full dependency-resolved typecheck/build was not executed because dependencies are not installed in the working container.
- Mobile emulator/device QA was not executed because the device automation runtime is not available in this environment.
- Dependency audit found one esbuild advisory in the earlier direct dependency set; the build now removes the pino/esbuild plugin coupling and pins direct esbuild to 0.28.2. Reinstall/regenerate the lockfile in a normal package-manager environment before release.

## 2026-09-08 — Student academic loop
- Added verified-student academic guard for `/api/academic/overview`.
- Added `GET /api/academic/student/assignments` with class-scoped published assignments and the current student's submission/grade state.
- Added `POST /api/academic/assignments/:assignmentId/submission` with class membership validation, late-submission enforcement, and idempotent upsert/resubmission behavior.
- Added `GET /api/academic/student/attendance` for the student's attendance history and computed rate.
- Updated `AcademicPage` to load the student assignment feed and provide an inline submission/resubmission workflow (written response + optional file URL metadata).
- Existing assignment/grade/attendance authorization remains server-side enforced.
- Validation: TypeScript parser check across web/API/mobile = 97 files, 0 parser diagnostics.
- Build/runtime install is still blocked in this container because the dependency tree is not installed and npm registry access is unavailable; do not treat this as a successful production build.

## 2026-09-08 — Teacher submission review phase
- Added `GET /api/academic/classes/:classId/submissions` with class/assignment ownership enforcement and student identity resolution.
- Added `PATCH /api/academic/submissions/:submissionId` for authorized grading, feedback, and review status (`submitted`/`reviewed`/`returned`). Grade values are range-checked against the assignment maximum.
- Extended `TeacherWorkspace` with a Submissions panel showing submitted work, late state, file links, score, feedback, and review status; teachers/admins can save reviews without leaving the workspace.
- Parser validation: web/API/mobile active TypeScript/TSX source — 97 files, 0 parser diagnostics.
- Full package-manager build still pending because the container cannot install missing dependencies from the npm registry.


## 2026-09-08 — Student academic detail phase
- Added `/api/academic/student/grades` with term-grouped grade history.
- Expanded the student Academic page into dedicated Overview, Assignments, Grades, Attendance, and Timetable views.
- Added attendance breakdown (present / late / absent / excused).
- Added complete visible grade history with comments, coefficient, assessment type, and publication date.
- Preserved assignment submission/resubmission workflow and server-side class ownership checks.
- Source parser validation: 97 TypeScript/TSX files, 0 parser diagnostics at the end of this phase.


## 2026-09-08 — Communications + mobile parity phase
- Fixed EventsPage runtime bug by initializing `useQueryClient()` before RSVP mutation usage.
- Added notification inbox to the authenticated web shell using `/api/notifications`, including unread indicator and mark-all-read flow.
- Added mobile Events and Notifications tabs, notification read state, event RSVP toggling, and shared event/notification API helpers.
- Parser validation: web/API/mobile active TypeScript/TSX source = 97 files, 0 parser diagnostics.

## 2026-09-08 — Mobile academic parity phase
- Added `GET /api/academic/student/timetable` with approved-student class scoping and full weekly timetable resolution.
- Added mobile API helpers for student assignments, grades, attendance, timetable, and assignment submission.
- Reworked the mobile Academic tab into Overview / Work / Grades / Attendance / Week views.
- Added mobile assignment submission/resubmission UI using the same server-side academic submission endpoint as web.
- Added mobile grade-history, attendance-history, and weekly timetable views.
- Added academic refresh action on mobile.
- Validation: web/API/mobile active TypeScript/TSX source = 97 files, 0 parser diagnostics.
- Full dependency-resolved build/device QA remains pending because packages are not installed in the container and mobile device tooling is unavailable.

## 2026-09-08 — Complete administration + communications phase
- Added live `campus_moderation_reports` foundation and synchronized missing communication/governance tables in Supabase: verification audits, notifications, post comments/reactions, threads, presence, rooms and facility issues.
- Added admin member-management API for role, membership state and role state changes with server authorization; granting administrator remains restricted to the configured super administrator.
- Added admin broadcast notifications, event creation/management, and moderation queue APIs.
- Added social discussion APIs: post comments, reactions, moderation reports, plus notification delivery for post comments.
- Added notification mark-all-read endpoint.
- Expanded Admin Center with member/verification controls, campus broadcast, event publishing, and moderation queue UI.
- Fixed Space Detail social rendering to use the actual API author/time fields, and added like, comment and report interactions.
- Source parser validation: 101 TypeScript/TSX files, 0 parser diagnostics.
- Supabase verification confirmed all required campus communication/governance tables now exist in the live project.
- Full dependency-resolved build and device QA remain pending because the container still lacks the installed dependency tree and device runtime.
## Phase 10 — release hardening (2026-09-08)

- Synchronized `lib/api-spec/openapi.yaml` with the live Express route surface, including academic, admin, social, moderation, events, notifications, projects, and super-admin endpoints.
- Added JWT bearer security scheme to the API contract where missing.
- Removed the stale direct `esbuild-plugin-pino` importer reference from the lockfile; API build configuration continues to externalize Pino runtime packages.
- Static source validation remains dependency-independent because the container cannot access the npm registry and the project has no installed dependency tree.
- Full `pnpm install`, production build, browser E2E, Android emulator QA, and iOS device QA remain release-environment tasks.
- Added reproducible migration `lib/db/drizzle/0006_harden_campus_governance_rls.sql`; repository inspection confirms RLS definitions for notifications, social comments/reactions, presence, facility issues, threads, and verification audits. Live database enforcement remains unverified until deployment credentials are available.

## 2026-09-08 build-fix pass
- Fixed `lib/api-client-react/src/custom-fetch.ts` Request/RequestInit typing incompatibility by reconstructing RequestInit when rebasing a Request URL.
- Removed stale AI-generated `aiChat` client operation and AI chat schemas; active product remains AI-free.
- Verified extracted source: 208 TS/TSX files, 0 parser diagnostics.
- Full local package build still requires the user's installed dependency tree; rerun `pnpm build` after replacing this release.

## Phase 12 — isolated acceptance infrastructure (2026-09-11)

- Added a fail-closed acceptance harness restricted by `ACCEPTANCE_ENVIRONMENT_ID=abi-mizrak-acceptance-only` and dedicated Supabase test configuration.
- Added deterministic `acceptance-p12-` fixture identifiers covering controlled student, teacher, administrator, and non-member authorization boundaries.
- Added real-client API, RLS, security, Realtime, and Windows Edge browser suites plus root package scripts.
- Offline fixture validation passes, and the prerequisite gate correctly blocks execution when the isolated environment identity is absent.
- Live suites remain blocked until a disposable Supabase project, migrations through 0006, five controlled Auth identities, deterministic seeded rows, running API/web services, and Edge are provided. No live authorization, persistence, Realtime, or browser pass is claimed.
- The production dependency audit remains a release blocker: `image-size` has two HIGH and one MODERATE advisories, vulnerable versions through 2.0.2, and no patched version identified.
# PHASE 13 — PRODUCT COMPLETENESS / FEATURE DEPTH

- Implemented connected student and teacher academic workflows spanning timetable, attendance, assignments, submissions, review feedback, and grades.
- Added server-scoped academic persistence and authorization boundaries, notification read state and destinations, operational administration depth, and student-focused mobile parity.
- Added focused acceptance coverage for the academic lifecycle, notification persistence, API authorization, RLS isolation, and realtime membership.
- Remaining major gaps are unified discovery, complete notification generation coverage, facilities issue lifecycle depth, channel/thread unread accounting, and broader mobile teacher/admin parity.
- Added membership-protected channel summaries with per-user unread counts, persistent channel read cursors, RLS ownership policies, and web channel navigation that clears unread state when opened. Thread reply depth and broader mobile teacher/admin parity remain future work.
- The current conservative scorecard is maintained in PHASE13_SCORECARD.md.
- Live Supabase acceptance and release validation remain intentionally deferred. The harness continues to fail closed when isolated-environment prerequisites are unavailable.
- The known image-size@1.2.1 blocker is unchanged.

## Phase 15 - product completion (2026-09-12)

- Closed the three Phase 13 P1 product gaps with membership-authorized unified discovery, duplicate-safe cross-module notifications, and a complete facilities issue lifecycle.
- Added project creator/administrator controls for membership, visibility, and forward-only status transitions while keeping private discovery and detail access fail-closed.
- Added persistent per-user channel read cursors, membership-scoped unread summaries, and web mark-read behavior. Thread-specific reply unread depth remains deferred.
- Added migrations 0007 through 0010 for facilities operations, notification idempotency, channel unread accounting, and project administration. Existing authorization and RLS hardening remain intact.
- Student-oriented mobile parity remains functional; broader teacher/administrator mobile operations and native device QA remain deferred.
- Install, typecheck, production build, deterministic fixture validation, fail-closed acceptance prerequisites, dependency audit, and diff checks were exercised in the Windows workspace. Live Supabase multi-user acceptance and release certification remain intentionally deferred.
- The production dependency gate remains RED because the Expo/Metro path still reaches vulnerable image-size versions with no published patched version identified by the audit.
- All changes remain uncommitted.

## Phase 17 - final product freeze completion (2026-09-12)

- Completed the final repository-level gap classification in `FINAL_PRODUCT_GAP_AUDIT.md` and recorded the product-freeze decision in `PHASE17_PRODUCT_FREEZE_AUDIT.md`.
- Confirmed server-backed thread unread cursors/counts, persisted presence heartbeat and stale expiry, facilities lifecycle depth, and project administration boundaries in the current source.
- Replaced mobile notification mark-all-read fan-out with the atomic `/notifications/read-all` endpoint and added visible failure feedback.
- Mobile TypeScript verification and `git diff --check` pass after the final integration.
- Final locally actionable severity state is P0 = 0, P1 = 0, and P2 = 0 confirmed application defects.
- Product freeze candidate is YES; production release certification remains RED and deferred because the known `image-size` advisory and release-environment acceptance gates remain unresolved.
- All accumulated changes remain uncommitted.
