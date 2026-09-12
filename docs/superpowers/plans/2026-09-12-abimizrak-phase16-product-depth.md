# Abimizrak Phase 16 Product Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining evidence-backed Phase 16 product-depth work across thread unread state, infrastructure-backed presence, connected role workflows, mobile teacher and administrator parity, UX/accessibility, tests, and development evidence.

**Architecture:** Extend the existing Express, PostgreSQL/Supabase, Drizzle, OpenAPI, generated Zod/client, React, and Expo paths as connected vertical slices. Existing Phase 15 search, notifications, facilities, channel unread, and project administration remain the baseline; new work must reuse their authorization patterns and add only forward migrations.

**Tech Stack:** TypeScript, React, React Native/Expo, Express, Supabase/PostgreSQL with RLS, Drizzle ORM, OpenAPI, generated Zod and React clients, Node test runner, Playwright acceptance harness.

**Spec:** `docs/superpowers/specs/2026-09-12-phase-16-product-depth-design.md`

## Global Constraints

- Preserve all accumulated uncommitted changes and work directly in the current repository.
- Preserve migration 0006 and all existing migrations; use new forward-only migrations with matching Drizzle journal entries.
- Preserve server-side identity, membership, ownership, role, class-scope, RLS, rate-limit, validation, and sanitized-error boundaries.
- Preserve the fail-closed isolated acceptance prerequisite and do not claim connected acceptance without its legitimate environment.
- Do not modify, suppress, override, exclude, or manipulate the `image-size@1.2.1` audit result.
- Introduce no TypeScript `any` usage. PostgreSQL `= any(...)` remains valid SQL.
- Do not commit, push, tag, provision production, rehearse deployment, or perform final release certification.
- Adapt mobile features to touch-appropriate cards, lists, sheets, and focused forms rather than desktop tables.

---

### Task 1: Reconcile Phase 16 Baseline and Freeze the Remaining Scope

**Files:**
- Modify: `PHASE13_PRODUCT_GAP_AUDIT.md`
- Modify: `PHASE13_SCORECARD.md`
- Test: `acceptance/tests/fixtures.test.mjs`

**Interfaces:**
- Consumes: Phase 15 source and evidence for search, notifications, facilities, channel unread accounting, and project administration.
- Produces: an explicit remaining-work list limited to threads, presence, role workflow depth, mobile parity, UX/accessibility, focused tests, and evidence.

- [ ] **Step 1: Add a failing evidence assertion**

Extend `acceptance/tests/fixtures.test.mjs` to require coverage identifiers for `thread-unread`, `presence-expiry`, `mobile-teacher`, and `mobile-administrator`.

- [ ] **Step 2: Verify RED**

Run: `node --test acceptance/tests/fixtures.test.mjs`

Expected: FAIL because the fixture manifest does not yet declare the four Phase 16 domains.

- [ ] **Step 3: Reconcile evidence without changing severity cosmetically**

Update the gap audit and scorecard so Phase 15-completed slices remain implemented, the remaining P2 areas are listed once without duplication, and external acceptance prerequisites remain blocked. Do not raise scores until the matching implementation and focused verification exist.

- [ ] **Step 4: Keep the test RED for the next implementation tasks**

Do not add fixture coverage labels until the corresponding focused tests and contracts are implemented in Tasks 2 through 5.

### Task 2: Persistent Thread Reply and Unread Accounting

**Files:**
- Create: `lib/db/drizzle/0011_thread_unread_accounting.sql` using `supabase migration new thread_unread_accounting` when the CLI is available
- Modify: `lib/db/drizzle/meta/_journal.json`
- Modify: `lib/db/src/schema/campus.ts`
- Modify: `artifacts/api-server/src/routes/campus.ts`
- Modify: `lib/api-spec/openapi.yaml`
- Regenerate: `lib/api-zod/src/generated/api.ts` and related generated types
- Regenerate: `lib/api-client-react/src/generated/api.ts` and schemas
- Modify: `artifacts/abi-mizrak-campus/src/components/ChannelChat.tsx`
- Modify: `apps/mobile/src/api.ts`
- Modify: `apps/mobile/src/app.tsx`
- Test: add focused deterministic Node tests under `acceptance/tests/`

**Interfaces:**
- Consumes: authenticated campus user ID, existing channel membership checks, `campus_threads`, channel messages, and channel read cursors.
- Produces: thread reply creation, membership-scoped thread summaries with `unreadCount` and `lastReplyAt`, and idempotent `POST /api/threads/{threadId}/read`.

- [ ] **Step 1: Write failing thread-unread tests**

Cover: non-members cannot list/read a private thread; replies after a user's last-read marker count as unread; the reply author does not receive a self-unread increment; marking a thread read clears only that user's count; repeated mark-read calls are idempotent.

- [ ] **Step 2: Verify RED**

Run the new focused Node test file directly with `node --test`.

Expected: FAIL because persistent per-user thread cursors and the read mutation are absent.

- [ ] **Step 3: Add the forward-only data model and RLS**

Create a per-user thread-read table keyed by `(thread_id, user_id)` with `last_read_at`, foreign keys, and an index supporting unread counts. Enable RLS. Permit a user to select, insert, and update only their own cursor and only for a thread whose channel/space membership they hold. Include both `USING` and `WITH CHECK` on updates.

- [ ] **Step 4: Implement authorized API behavior**

Add membership-scoped list/reply/read handlers. Counts must be bounded and indexed, and the API must never reveal thread existence to a non-member. Successful reply and read mutations return the canonical thread summary used by both clients.

- [ ] **Step 5: Synchronize contracts and clients**

Define exact IDs, timestamps, nullable fields, reply shapes, and unread counts in OpenAPI, then regenerate Zod and React-client output using the repository's existing generation command. Add typed mobile helpers with no broad casts.

- [ ] **Step 6: Connect web and mobile UI**

Expose thread replies from the channel conversation, display bounded unread badges, clear the active thread after a successful read mutation, disable duplicate submissions, and cover loading, empty, error, denied, and success states. Refresh the same server-backed summary on both platforms.

- [ ] **Step 7: Verify GREEN**

Run the focused test, API typecheck, web typecheck, mobile typecheck, and fixture test. Expected: all introduced checks PASS.

### Task 3: Infrastructure-Backed Scoped Presence

**Files:**
- Create: `lib/db/drizzle/0012_presence_leases.sql` using the Supabase migration command when available
- Modify: `lib/db/drizzle/meta/_journal.json`
- Modify: `lib/db/src/schema/campus.ts`
- Modify: `artifacts/api-server/src/routes/campus.ts`
- Modify: `lib/api-spec/openapi.yaml`
- Regenerate: generated Zod and React client files
- Modify: `artifacts/abi-mizrak-campus/src/components/ChannelChat.tsx`
- Modify: `apps/mobile/src/api.ts`
- Modify: `apps/mobile/src/app.tsx`
- Test: add focused presence tests under `acceptance/tests/`

**Interfaces:**
- Consumes: authenticated user, permitted space/channel membership, existing `campus_presence`, and Supabase Realtime.
- Produces: scoped presence leases with `lastSeenAt`, deterministic expiry, disconnect cleanup behavior, and membership-filtered presence summaries.

- [ ] **Step 1: Write failing presence tests**

Cover: non-members cannot observe presence; a heartbeat updates only the authenticated user's scoped lease; expired leases are excluded; leaving/disconnecting removes or expires the lease; no timer-generated synthetic user is returned.

- [ ] **Step 2: Verify RED**

Run the presence test directly. Expected: FAIL on missing expiry and membership-scoped lease behavior.

- [ ] **Step 3: Implement the lease schema and RLS**

Store user, permitted resource scope, connection identity, and `last_seen_at`; add indexes for scoped active lookups. RLS must bind writes to `auth.uid()` and reads to legitimate shared membership, with update ownership enforced in both predicates.

- [ ] **Step 4: Implement heartbeat, leave, and scoped reads**

Validate resource membership on every operation. Use a bounded expiry window consistently at write/read boundaries. Ensure repeated heartbeats are upserts for the same connection identity and disconnect cleanup cannot delete another user's lease.

- [ ] **Step 5: Connect actual Realtime lifecycle**

Subscribe only while an authorized channel/space view is active, send bounded heartbeats, clean up on unmount/background/disconnect, and filter all payloads to the authorized scope. Prevent duplicate subscriptions during rerenders.

- [ ] **Step 6: Synchronize contracts and verify GREEN**

Update OpenAPI/generated clients, run focused tests and typechecks, and confirm no private presence data is exposed in client subscriptions.

### Task 4: Connected Teacher and Student Workflow Depth

**Files:**
- Modify: `artifacts/api-server/src/routes/academic.ts`
- Modify: `artifacts/abi-mizrak-campus/src/components/TeacherWorkspace.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/academic.tsx`
- Modify: `artifacts/abi-mizrak-campus/src/pages/campus-home.tsx`
- Modify: `lib/api-spec/openapi.yaml` and generated clients only if response contracts change
- Test: focused academic workflow tests under `acceptance/tests/`

**Interfaces:**
- Consumes: existing class, roster, timetable, attendance, assignment, submission, review, grade, notification, and authenticated student/teacher authorization.
- Produces: direct student context within teacher review and a student priority feed derived only from real schedule, deadlines, state, grades, attendance, events, and notifications.

- [ ] **Step 1: Write failing workflow tests**

Cover teacher denial outside assigned class/subject, direct reviewed-student context from an authorized submission, and student home ordering from persisted deadlines and schedule without fabricated recommendations.

- [ ] **Step 2: Verify RED**

Run the focused test file. Expected: FAIL on missing connected context or priority-feed behavior.

- [ ] **Step 3: Implement minimal server aggregation**

Reuse existing authorized queries. Add no broad discovery endpoint. Return only fields already available to the caller through class ownership/enrollment and current student identity. Bound lists and use deterministic ordering.

- [ ] **Step 4: Connect teacher navigation**

Keep class, roster, attendance, assignment, submission, feedback, and grading context in one workflow. Preserve the selected class and student through successful mutations, refresh stale queries, and surface denied/error states without leaking inaccessible records.

- [ ] **Step 5: Connect student priorities**

Show today's schedule, upcoming assignment deadlines and submission state, recent grades/feedback, attendance signal, important events, and relevant unread notifications using real persisted sources. Provide clear empty states when each source has no data.

- [ ] **Step 6: Verify GREEN**

Run focused tests and changed-package typechecks. Expected: PASS with no duplicate network request introduced by the new aggregations.

### Task 5: Mobile Teacher and Administrator Parity

**Files:**
- Modify: `apps/mobile/src/api.ts`
- Modify: `apps/mobile/src/app.tsx`
- Modify: API/OpenAPI/generated layers only when an existing server capability lacks a typed mobile-safe contract
- Test: focused mobile API contract tests under `acceptance/tests/`

**Interfaces:**
- Consumes: the same teacher academic and administrator verification/facility/governance endpoints used by web.
- Produces: role-aware mobile navigation and touch-native teacher/admin workflows without a second authorization path.

- [ ] **Step 1: Write failing mobile contract tests**

Cover typed teacher class/roster/attendance/assignment/submission/review calls and administrator verification/facility/operational-alert calls. Assert exact method, path, body, and response shape and the absence of privileged client secrets.

- [ ] **Step 2: Verify RED**

Run the focused mobile contract test. Expected: FAIL because the mobile client lacks teacher/admin helpers and navigation.

- [ ] **Step 3: Implement typed API helpers**

Reuse existing server endpoints, authenticated request configuration, and generated shapes where practical. Do not add client-side role authorization or service-role configuration.

- [ ] **Step 4: Add role-aware mobile navigation**

Teachers receive class cards leading to roster, attendance, assignments, submissions, focused review, and grading. Administrators receive verification queue cards, facility issue cards with guarded transitions, and read-only governance/operational alerts where mutation depth is not justified.

- [ ] **Step 5: Complete mutation states**

Use labeled controls, minimum practical touch targets, busy/disabled states, inline validation, error/success feedback, confirmation for significant privileged actions, and post-success refresh.

- [ ] **Step 6: Verify GREEN**

Run focused contract tests, mobile typecheck, and production bundle/build checks available in the repository. Native-device acceptance remains explicitly deferred if no runtime target is available.

### Task 6: UX, Accessibility, and Focused Performance Polish

**Files:**
- Modify only Phase 16-touched React and React Native components
- Test: relevant component, browser, or deterministic tests under existing test locations

**Interfaces:**
- Consumes: all new Phase 16 screens and mutations.
- Produces: complete loading, empty, error, success, disabled, active, denied, keyboard, focus, reduced-motion, responsive, and touch states.

- [ ] **Step 1: Add failing behavioral checks**

Test keyboard activation for web search/thread controls, focus restoration after dialogs, labels and form errors, duplicate-submit prevention, and a single active presence subscription per authorized view.

- [ ] **Step 2: Verify RED**

Run only the relevant focused tests. Expected: at least one test fails for each missing state being fixed.

- [ ] **Step 3: Apply scoped polish**

Use semantic buttons and labels, visible focus, `aria-live` for mutation feedback, deterministic focus return, reduced-motion-safe transitions, bounded scrollable result lists, and memoization only where observed duplicate work exists. Preserve the visual language.

- [ ] **Step 4: Verify GREEN**

Run focused tests and changed-package typechecks. Inspect for duplicate API calls and subscriptions introduced by Phase 16; fix only evidence-backed issues.

### Task 7: Complete Deterministic Coverage and Evidence

**Files:**
- Modify: `acceptance/fixtures/manifest.mjs`
- Modify: `acceptance/tests/fixtures.test.mjs`
- Modify: other focused acceptance/API/RLS/Realtime/browser suites as implemented
- Modify: `PHASE13_PRODUCT_GAP_AUDIT.md`
- Modify: `PHASE13_SCORECARD.md`
- Modify: `PROGRESS.md`
- Modify: `RELEASE_AUDIT_2026-09-09.md` append-only

**Interfaces:**
- Consumes: verified outcomes from Tasks 2 through 6.
- Produces: honest Phase 16 implementation evidence and a fixture manifest representing every implemented high-risk domain.

- [ ] **Step 1: Turn the baseline fixture test GREEN**

Add `thread-unread`, `presence-expiry`, `mobile-teacher`, and `mobile-administrator` coverage only after their focused tests exist. Preserve the isolated `acceptance-p12-` namespace and five controlled identities.

- [ ] **Step 2: Run deterministic focused suites**

Run each newly added Node test directly, then `pnpm test:fixtures`. Expected: PASS locally without bypassing the connected-environment prerequisite.

- [ ] **Step 3: Exercise the fail-closed gate once**

Run the existing acceptance prerequisite command in the unconfigured environment. Expected: a deliberate BLOCKED/fail-closed result naming the missing isolated prerequisite, not a PASS. Do not retry unchanged.

- [ ] **Step 4: Update product evidence**

Record exact files, endpoints, migrations, tests, and observed results. Raise scorecard values only where end-to-end source and deterministic verification justify it. Preserve live Supabase, browser-role, Realtime multi-user, native runtime, and release-certification gaps as blocked. Append a concise Phase 16 note to the release audit without rewriting history.

### Task 8: Run the Phase 16 Development Validation Gate

**Files:**
- Verify only; correct in-scope defects through the owning earlier task files

**Interfaces:**
- Consumes: complete uncommitted Phase 16 work.
- Produces: final development-gate evidence without release certification.

- [ ] **Step 1: Read the verification-before-completion skill**

Read `superpowers:verification-before-completion` fully before making any completion claim.

- [ ] **Step 2: Run installation gates**

Run `pnpm install --frozen-lockfile` and `pnpm install --frozen-lockfile --strict-peer-dependencies`. Record exact exit status. Do not manipulate the dependency audit.

- [ ] **Step 3: Run compile and build gates**

Run `pnpm run typecheck` and `pnpm build`. Fix only Phase 16 or previously accumulated in-scope defects, preserving user changes.

- [ ] **Step 4: Run deterministic regression gates**

Run `pnpm test:fixtures` and every focused deterministic regression test added in Phase 16.

- [ ] **Step 5: Run repository integrity gates**

Run `git diff --check`, search changed TypeScript/TSX source for newly introduced explicit/implicit `any` forms while excluding generated SQL syntax, then inspect `git status --short` and `git diff --stat`.

- [ ] **Step 6: Report without committing**

Report PASS, FAIL, or BLOCKED per gate with command evidence. Keep connected acceptance and native runtime blocked when prerequisites are absent, keep the image-size blocker unchanged, leave all work uncommitted, and do not claim production readiness or release certification.
