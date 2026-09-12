# Phase 13 Connected Academic Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete one coherent academic workflow in which an administrator establishes the class context, an authorized teacher publishes and reviews work, and the enrolled student submits it and sees the resulting state.

**Architecture:** Keep the Express API as the authoritative authorization and persistence boundary. Extend the existing student, teacher, and administrator React surfaces around the current academic endpoints, then add deterministic acceptance coverage that proves the same assignment lifecycle is visible across all three roles without introducing direct browser database writes.

**Tech Stack:** TypeScript, React, Vite, Express, Drizzle/PostgreSQL, Supabase Auth, Node test runner, Playwright with installed Windows Edge.

**Spec:** `CURRENT_SCOPE.md`, `PROGRESS.md`, and the approved Phase 13 direction recorded in the active task context.

## Global Constraints

- Preserve server-side authorization as the authoritative RBAC boundary.
- Keep AI features disabled.
- Do not modify `lib/db/drizzle/0006_harden_campus_governance_rls.sql`.
- Keep acceptance execution fail closed and restricted to `ACCEPTANCE_ENVIRONMENT_ID=abi-mizrak-acceptance-only`.
- Use real student, teacher, and administrator identities for live acceptance tests.
- Keep release validation deferred and preserve the unresolved `image-size@1.2.1` release blocker.
- Leave all changes uncommitted.
- Follow test-first development: each behavioral production change must be preceded by a focused failing test.

---

### Task 1: Define the cross-role acceptance contract

**Files:**
- Modify: `acceptance/tests/api.test.mjs`
- Modify: `acceptance/browser/roles.spec.mjs`
- Modify: `acceptance/fixtures/manifest.mjs` only if an additional deterministic identifier is required

**Interfaces:**
- Consumes: existing role-aware API request helper and deterministic Phase 12 identities.
- Produces: executable acceptance expectations for administrator context visibility, teacher assignment ownership, student submission persistence, teacher review persistence, and student review visibility.

- [ ] **Step 1: Add focused API tests for the connected lifecycle**

Add tests that use the existing deterministic assignment and submission records to verify: the student can list the published assignment, the teacher can list the student's submission only for an authorized class, the teacher can review it, and the student can subsequently observe the reviewed score and feedback. Add a negative assertion that the unauthorized student/class boundary remains closed.

- [ ] **Step 2: Run the offline/prerequisite-safe acceptance command and verify RED**

Run: `pnpm test:acceptance:api` with the existing fail-closed environment behavior.

Expected: the new lifecycle assertions fail because the response contract or cross-role state propagation is incomplete, while the environment prerequisite gate remains fail closed when credentials are absent.

- [ ] **Step 3: Add browser expectations for role-specific lifecycle affordances**

Extend the existing Edge role suite with stable visible labels or accessible roles for the student assignment action, teacher submission-review action, and administrator academic-context surface. Avoid brittle layout or CSS selectors.

- [ ] **Step 4: Run the browser test discovery/list command**

Run: `pnpm exec playwright test --config acceptance/playwright.config.mjs --list`.

Expected: all three role journeys are discovered without downloading another browser.

### Task 2: Close API contract gaps for lifecycle continuity

**Files:**
- Modify: `artifacts/api-server/src/routes/academic.ts`
- Test: `acceptance/tests/api.test.mjs`

**Interfaces:**
- Consumes: `GET /api/academic/student/assignments`, `POST /api/academic/assignments/:assignmentId/submission`, `GET /api/academic/classes/:classId/submissions`, and `PATCH /api/academic/submissions/:submissionId`.
- Produces: a consistent assignment/submission response shape with persisted review status, score, feedback, and timestamps visible to the authorized student and teacher.

- [ ] **Step 1: Identify the exact failing assertions from Task 1**

Limit production changes to demonstrated response-shape, validation, or authorization gaps. Do not create a parallel endpoint when an existing endpoint can carry the required state.

- [ ] **Step 2: Implement the minimal server change**

Preserve class enrollment checks, teacher assignment ownership, score bounds, late-submission rules, and administrator privilege handling. Normalize lifecycle status values so resubmission and teacher review remain representable without weakening authorization.

- [ ] **Step 3: Run focused API tests and verify GREEN where the environment permits**

Run: `pnpm test:acceptance:api`.

Expected: connected lifecycle tests pass in the isolated configured environment. If credentials are absent, record the fail-closed prerequisite result and run dependency-independent source validation instead; do not claim a live pass.

### Task 3: Connect the student experience

**Files:**
- Modify: `artifacts/abi-mizrak-campus/src/pages/academic.tsx`
- Test: `acceptance/browser/roles.spec.mjs`

**Interfaces:**
- Consumes: the student assignment feed and submission endpoint.
- Produces: a clear student journey from published work to submission/resubmission and reviewed feedback, including loading, empty, error, late, and reviewed states.

- [ ] **Step 1: Add or refine the failing browser expectation**

The expectation must distinguish unsubmitted, submitted/resubmitted, returned, and reviewed work through stable accessible text.

- [ ] **Step 2: Implement the student lifecycle presentation**

Keep independent initial fetches parallel. Preserve the existing written response and optional file-link workflow, reset transient form state after success, and reload authoritative server state after mutation. Show score and feedback only when supplied by the server.

- [ ] **Step 3: Validate source and browser discovery**

Run the repository's TypeScript/source validation command and Playwright test listing. Run the live Edge journey only when the isolated acceptance prerequisites are satisfied.

### Task 4: Connect the teacher review experience

**Files:**
- Modify: `artifacts/abi-mizrak-campus/src/components/TeacherWorkspace.tsx`
- Test: `acceptance/browser/roles.spec.mjs`

**Interfaces:**
- Consumes: authorized class roster, assignments, submissions, and submission-review mutation.
- Produces: a focused queue where the teacher can select an authorized class, inspect submitted work, enter a bounded score and feedback, return work, or mark it reviewed.

- [ ] **Step 1: Add the failing teacher browser expectation**

Assert stable accessible labels for the review queue and save/return controls.

- [ ] **Step 2: Implement minimal review-flow refinements**

Retain server ownership as authoritative. Prevent invalid client score entry relative to `maxScore`, surface mutation errors, disable duplicate submissions while saving, and refresh the affected query after success. Avoid redefining components inside render functions.

- [ ] **Step 3: Validate source and role route discovery**

Run source validation and the Edge role test listing, then run the live teacher journey only in the configured disposable environment.

### Task 5: Connect the administrator oversight experience

**Files:**
- Modify: `artifacts/abi-mizrak-campus/src/pages/admin-center.tsx`
- Test: `acceptance/browser/roles.spec.mjs`

**Interfaces:**
- Consumes: existing people placement, timetable, attendance summary, and academic counts.
- Produces: an administrator academic-operations overview that makes the prerequisites and downstream assignment lifecycle observable without giving the administrator a duplicate teacher workflow.

- [ ] **Step 1: Add the failing administrator browser expectation**

Assert that the administrator can see class placement, timetable readiness, assignment/submission counts, and a clear path to the relevant operational panel.

- [ ] **Step 2: Implement the oversight slice**

Reuse existing data requests and components. Show actionable missing-context states for students without classes and classes without timetable entries. Do not add client-side authorization assumptions.

- [ ] **Step 3: Validate source and role route discovery**

Run source validation and Playwright listing; run live administrator acceptance only when all isolated prerequisites exist.

### Task 6: Cross-role verification and evidence

**Files:**
- Modify: `PROGRESS.md`
- Modify: `RELEASE_AUDIT_2026-09-09.md` only to append Phase 13 evidence and limitations

**Interfaces:**
- Consumes: all Task 1 through Task 5 changes and test outputs.
- Produces: an evidence-backed Phase 13 record without changing release readiness or claiming unavailable live validation.

- [ ] **Step 1: Run focused validation**

Run offline fixture tests, acceptance prerequisite tests, source parsing/typecheck available in this checkout, and Playwright test discovery. If the isolated environment is configured, additionally run API and Windows Edge role journeys.

- [ ] **Step 2: Run repository-level consistency checks**

Inspect `git diff --check`, changed-file scope, route references, secrets, dynamic-code patterns, and dependency audit output. Preserve the known `image-size@1.2.1` result as a blocker rather than attempting an unsupported override.

- [ ] **Step 3: Update progress evidence**

Record exact PASS, FAIL, BLOCKED, and NOT RUN results. State explicitly that live Supabase or browser validation is unclaimed when prerequisites were absent. Leave changes uncommitted.
