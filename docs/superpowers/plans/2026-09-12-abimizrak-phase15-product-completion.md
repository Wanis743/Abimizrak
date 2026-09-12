# Abimizrak Phase 15 Product Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining P1 product gaps through authorized unified discovery, duplicate-safe notifications, and complete facilities operations, then deliver the safest high-value P2 workflow improvements.

**Architecture:** Extend the existing Express, Drizzle/PostgreSQL, React/Vite, and Expo architecture through small server-authoritative vertical slices. Persistent state and visibility decisions remain on the server; web and mobile consume typed API contracts. Schema changes use a new migration and preserve migration 0006 unchanged.

**Tech Stack:** TypeScript, Express, Drizzle ORM, PostgreSQL/Supabase, React, Vite, TanStack Query, Expo, React Native, Vitest/Node tests, Playwright acceptance infrastructure.

**Spec:** `C:/Users/sam/.codex/attachments/ce5dc7ef-d1b8-44c8-b983-95bbeb73b1d8/pasted-text.txt`

## Global Constraints

- Zero new TypeScript `any`.
- Zero authorization weakening.
- Zero RLS weakening.
- Zero fake production functionality or fake presence.
- Do not modify `lib/db/drizzle/0006_harden_campus_governance_rls.sql`.
- Preserve the fail-closed acceptance harness.
- Preserve Expo 54, React Native 0.81.5, and React 19.1.0.
- Do not commit, push, or tag.
- Do not perform final release certification.
- The known `image-size` blocker remains unchanged.

---

### Task 1: Authorized Unified Discovery

**Files:**
- Create: `artifacts/api-server/src/lib/discovery.ts`
- Modify: `artifacts/api-server/src/routes/campus.ts`
- Modify: `artifacts/abi-mizrak-campus/src/components/layout/LiquidCampusLayout.tsx`
- Modify: `apps/mobile/src/api.ts`
- Test: create or extend the repository's focused API regression suite after inspecting its established test layout.

**Interfaces:**
- Produces `GET /api/discovery?q=<query>` with categorized, typed results containing `type`, `id`, `title`, `subtitle`, and `href`.
- Search visibility is derived from authenticated membership, role, space membership, project membership/visibility, and academic scope.

- [ ] Inspect current campus route helpers, membership queries, project visibility, space/channel authorization, event visibility, academic authorization, and test conventions.
- [ ] Write failing tests proving blank/short queries are bounded, public entities are discoverable, private projects require membership, restricted academic/admin data is excluded, and result limits are enforced.
- [ ] Run the focused tests and record the expected failures.
- [ ] Implement normalized server-side search with parameterized Drizzle/SQL queries and per-domain authorization predicates.
- [ ] Add navigation destinations appropriate to the authenticated role without exposing privileged data.
- [ ] Connect the existing command/search overlay to debounced loading, error, empty, active-result, keyboard-navigation, and mobile-friendly states.
- [ ] Add the typed mobile API helper without adding a mobile screen unless it fits the existing navigation safely.
- [ ] Run focused tests, API/web/mobile typechecks, and manually inspect every changed TypeScript file for unsafe casts.

### Task 2: Duplicate-Safe Notification Lifecycle

**Files:**
- Create: `artifacts/api-server/src/lib/notifications.ts`
- Modify: `artifacts/api-server/src/routes/academic.ts`
- Modify: `artifacts/api-server/src/routes/admin.ts`
- Modify: `artifacts/api-server/src/routes/campus.ts`
- Modify: `lib/db/src/schema/campus.ts`
- Create: next ordered Drizzle migration only if the current schema cannot enforce idempotency.
- Test: focused notification lifecycle regression tests.

**Interfaces:**
- Produce a typed `createNotificationOnce` helper accepting recipient, event kind, stable source key, title, body, destination, and source metadata.
- Preserve existing notification read and mark-all-read endpoints.

- [ ] Inventory every existing notification-producing mutation and its supported lifecycle event.
- [ ] Write failing tests for repeated assignment publication/update, submission review/grade feedback, verification updates, announcements, and event changes where those events already exist.
- [ ] Run the focused tests and confirm duplicates are currently observable or not structurally prevented.
- [ ] Add the smallest persistence constraint needed for recipient plus stable source/event identity, using a new migration when required.
- [ ] Implement the shared idempotent helper and replace duplicated insertion logic only in supported mutations.
- [ ] Ensure authorization completes before notification generation and that timestamps, destinations, and metadata are meaningful.
- [ ] Verify read/unread persistence remains compatible across web and mobile.
- [ ] Run notification, authorization, migration, and typecheck validation.

### Task 3: Facilities Operations Lifecycle

**Files:**
- Modify: `lib/db/src/schema/campus.ts`
- Create: next ordered Drizzle migration if assignment, resolution, or history cannot be represented safely.
- Modify: `artifacts/api-server/src/routes/campus.ts`
- Modify: `artifacts/api-server/src/routes/admin.ts`
- Modify: `artifacts/abi-mizrak-campus/src/pages/admin-center.tsx`
- Modify: `apps/mobile/src/api.ts` and `apps/mobile/src/app.tsx` only if a safe operational mobile slice fits the existing app.
- Test: facilities transition and authorization regression tests.

**Interfaces:**
- Lifecycle states are exactly `reported`, `assigned`, `in_progress`, `resolved`, and `closed` when supported by the persisted model.
- Reporter can create and view authorized issues; administrators can assign and transition; history is append-only and derived from real mutations.

- [ ] Inspect the current facility issue columns, routes, RLS policies, administrator UI, and mobile surfaces.
- [ ] Write failing tests for issue creation validation, reporter visibility, admin visibility, valid transitions, rejected skipped/backward transitions, assignment, resolution, and unauthorized mutation.
- [ ] Run focused tests and capture failures.
- [ ] Add only required schema fields and an append-only history table with deliberate indexes and new RLS policies when necessary.
- [ ] Implement transition validation as a focused pure function and server-authorized mutation endpoints.
- [ ] Implement reporter creation/history read-back and an actionable administrator queue with assignee, state, resolution, loading, empty, error, denied, disabled, and success feedback.
- [ ] Add mobile visibility or operations only when privilege and layout can be preserved safely.
- [ ] Run facilities tests, migration checks, typechecks, and relevant acceptance fixtures.

### Task 4: Persistent Channel and Thread Unread Accounting

**Files:**
- Modify: `lib/db/src/schema/campus.ts`
- Create: next ordered migration if no persisted read-state model exists.
- Modify: `artifacts/api-server/src/routes/campus.ts`
- Modify: `artifacts/abi-mizrak-campus/src/components/ChannelChat.tsx`
- Modify: channel/sidebar components that display unread state.
- Modify: mobile API/UI only where messaging already exists.
- Test: message/thread authorization and unread tests.

**Interfaces:**
- Persist one authorized read cursor per user/channel and per user/thread, using last-read timestamp or message ID according to the existing message ordering model.
- APIs return bounded unread counts without frontend-only authority.

- [ ] Inspect channel, thread, message, membership, and current frontend state models.
- [ ] Write failing tests for unread increment, mark-read, independent users, thread isolation, nonmember denial, and repeated mark-read idempotency.
- [ ] Implement the smallest read-cursor schema and indexes required for efficient counts.
- [ ] Add membership-authorized read-state endpoints and include unread summaries in existing channel/thread payloads where contract-compatible.
- [ ] Connect unread badges and mark-read behavior across modified web/mobile surfaces.
- [ ] Run focused tests, query-shape checks, typechecks, and zero-`any` scanning.

### Task 5: Project Administration

**Files:**
- Modify: `artifacts/api-server/src/routes/campus.ts`
- Modify: `artifacts/abi-mizrak-campus/src/pages/project-detail.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/projects-directory.tsx`
- Test: project visibility, ownership, membership, and status tests.

**Interfaces:**
- Owners and authorized administrators can manage membership, visibility, and valid status transitions.
- Private project content remains visible only to authorized members/administrators according to existing policy.

- [ ] Inspect project schema, owner semantics, membership endpoints, activity creation, and visibility predicates.
- [ ] Write failing tests for owner invite/remove, self-removal constraints, unauthorized management, private discovery exclusion, visibility update, status update, and activity persistence.
- [ ] Implement server-authorized membership/settings mutations while preserving existing public API behavior.
- [ ] Add typed owner/admin controls with validation, duplicate-submit prevention, and query invalidation.
- [ ] Run focused tests, discovery regression tests, and typechecks.

### Task 6: High-Value Mobile and Accessibility Depth

**Files:**
- Modify only the web/mobile screens touched by Tasks 1-5.
- Modify: `apps/mobile/src/api.ts` and `apps/mobile/src/app.tsx` when justified by implemented workflows.
- Test: existing component/acceptance tests plus focused accessibility assertions where supported.

**Interfaces:**
- Mobile uses the same authoritative APIs and permission model as web.
- Modified flows expose semantic labels, visible focus, keyboard navigation, reduced-motion-safe behavior, and appropriate touch targets.

- [ ] Compare teacher/admin mobile capability with the implemented server routes and select only complete, safe vertical slices.
- [ ] Add focused tests for selected mobile workflows and modified dialog/form keyboard behavior.
- [ ] Implement mobile-native roster/attendance/review or verification/facilities slices only when their full mutation lifecycle is available.
- [ ] Audit modified screens for labels, focus, semantic controls, form errors, denied states, reduced motion, and touch targets.
- [ ] Run mobile typecheck, Expo checks, and production export when the repository scripts support them.

### Task 7: Contract Synchronization and Product Documentation

**Files:**
- Modify: `lib/api-spec/openapi.yaml`
- Modify generated client/schema files only through the repository's established generation command.
- Modify: `PHASE13_PRODUCT_GAP_AUDIT.md`
- Modify: `PHASE13_SCORECARD.md`
- Modify: `PROGRESS.md`
- Modify: `RELEASE_AUDIT_2026-09-09.md`

**Interfaces:**
- DB, API, Zod/OpenAPI, generated client, web, and mobile agree on IDs, dates, nullability, enums, and response structures.

- [ ] Synchronize the API specification for every implemented endpoint and schema.
- [ ] Regenerate clients with the existing script, then inspect generated diffs for drift or unsafe types.
- [ ] Update each Phase 13 gap entry to IMPLEMENTED, PARTIAL, MISSING, or BLOCKED without deleting historical evidence.
- [ ] Re-score every requested area from 0-4 using only implemented and tested evidence.
- [ ] Append the Phase 15 progress section with P1/P2 closure, mobile impact, remaining gaps, validation, and deferred release work.
- [ ] Append a brief development-only release-audit note stating that acceptance remains deferred and the image-size blocker is unchanged.

### Task 8: Full Verification and Final Product Review

**Files:**
- No implementation files unless verification finds a confirmed defect.

**Interfaces:**
- Produce evidence for every final Phase 15 status without claiming live validation or release certification.

- [ ] Run `pnpm install --frozen-lockfile`.
- [ ] Run `pnpm install --frozen-lockfile --strict-peer-dependencies`.
- [ ] Run `pnpm run typecheck`.
- [ ] Run `pnpm build`.
- [ ] Run all available relevant regression tests and deterministic acceptance/fixture tests.
- [ ] Run mobile validation required by actual mobile changes.
- [ ] Run the fail-closed live acceptance prerequisite gate and report its real result without claiming live Supabase validation.
- [ ] Search active and changed TypeScript for newly introduced `any`, excluding legitimate PostgreSQL `= any(...)` syntax.
- [ ] Run `git diff --check`.
- [ ] Inspect the complete diff for authorization, RLS, dead code, unsafe casts, API drift, duplicate notifications, invalid transitions, and incoherent cross-module destinations; fix confirmed defects and rerun affected checks.
- [ ] Report `git status --short`, `git diff --stat`, and `git diff --check` while leaving all work uncommitted.

