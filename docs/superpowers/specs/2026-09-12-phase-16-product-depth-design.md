# Abimizrak Phase 16 Product Depth Design

## Purpose

Phase 16 is the final product-development pass before live acceptance and release certification resume. It closes the highest-value remaining product gaps without replacing the current architecture, weakening security, modifying the known image-size audit result, or discarding accumulated work.

## Authoritative Context

- Work directly in the current repository and preserve all accumulated uncommitted changes.
- Treat the current source, product-gap audit, scorecard, progress record, and release audit as authoritative evidence.
- Preserve migration 0006 and all historical migrations. Any required database change must use a new forward-only migration with a matching Drizzle journal entry.
- Preserve the fail-closed acceptance infrastructure and its isolated-environment prerequisite.
- Leave live acceptance, native runtime acceptance, deployment rehearsal, and release certification deferred.
- Do not commit, push, or tag.
- Do not modify, suppress, override, exclude, or otherwise manipulate the image-size@1.2.1 audit result.
- Maintain zero newly introduced TypeScript any usage.

## Delivery Strategy

Implementation proceeds as connected vertical slices rather than disconnected screens or documentation-only work. Each slice must use real persistence and the existing authorization paths, and must be represented consistently through the database, API contract, generated validation/client layers, web application, and mobile application where the product supports that surface.

Priority order:

1. Reconcile the current gap inventory against source and close every actionable P1.
2. Complete authorization-aware unified discovery.
3. Complete supported notification-producing lifecycles with deterministic idempotency.
4. Complete supported facilities lifecycle, history, and administrative operations.
5. Reconcile persistent channel and thread unread accounting across web and mobile.
6. Complete useful project administration and infrastructure-backed presence behavior.
7. Complete high-value administrator, teacher, and student workflow gaps.
8. Improve mobile teacher and administrator parity using mobile-native interactions.
9. Polish changed workflows for UX, accessibility, and focused performance concerns.
10. Update product evidence and run the complete development validation gate.

## Architecture and Security Boundaries

The existing React, React Native/Expo, API server, Supabase/PostgreSQL, Drizzle, OpenAPI, Zod, and generated-client architecture remains in place.

All reads and mutations must preserve:

- authenticated identity
- role, membership, ownership, and class-scope checks
- server-side authorization
- Row Level Security
- rate limiting and request validation
- sanitized production errors
- private-resource isolation

Search, autocomplete, notifications, recent activity, presence, and project listings must never reveal a resource the requesting user could not otherwise access. Frontend filtering is presentation logic only and must not serve as the authorization boundary.

## Product Slices

### Gap Reconciliation and P1 Closure

The Phase 13 gap audit, scorecard, progress record, release audit, and current source will be reconciled. Existing severities remain unchanged unless implementation evidence genuinely closes the item. External prerequisites remain blocked at their existing severity and are not downgraded to improve totals.

### Unified Discovery

Unified discovery will search only supported entities, including people, spaces, channels, projects, events, academic entities, and navigation destinations. Results will be grouped meaningfully and constrained by role, membership, ownership, and visibility. The web interaction will support keyboard use, loading, empty, error, and mobile-responsive states. The API will enforce every resource boundary before returning results.

### Notifications

Supported lifecycle events will create persistent notifications only when the underlying product event exists. Candidate events include assignment publication, submission review, grade or feedback availability, event changes, and verification decisions. Stable event identity or equivalent idempotency keys will prevent duplicates during retries. Each notification will have an authorized recipient, meaningful destination, consistent read state, and bounded fan-out.

### Facilities

Facilities operations will support only legitimate current states in the reported, assigned, in-progress, resolved, and closed lifecycle. Creation, assignment, status changes, resolution detail, history, and administrative visibility will be authenticated, authorized, validated, and persisted. Constraints and indexes will be added only when supported by observed query and integrity requirements.

### Unread Accounting

Channel and thread unread truth will be persistent. The implementation will prefer bounded last-read markers and indexed counts over repeated unbounded per-message calculations. Web, mobile, and notification presentation will consume the same server-backed truth and refresh after successful read mutations.

### Projects and Presence

Projects will expose only supported owner, member, visibility, status, activity, and settings operations. Project permissions will be enforced server-side. Presence improvements will use actual Realtime infrastructure, remain scoped to permitted memberships, expire stale sessions, handle disconnects, and avoid timer-generated fake online state.

### Administrator Workflows

Administrator work will prioritize operational queues and destinations: verification decisions and audit linkage, membership role/class context, academic configuration and timetable relationships, facilities assignment/resolution, governance audit, and significant operational changes. Metrics without a real source and actionable destination will not be added.

### Teacher and Student Workflows

Teacher workflows will preserve a seamless class-to-roster-to-attendance-to-assignment-to-submission-to-review-to-grade path, with direct student context where it removes unnecessary navigation. Student home and academic surfaces will prioritize current schedule, upcoming assignments and deadlines, submission state, grades, attendance, important events, and relevant notifications without fabricated recommendations.

### Mobile Parity

Mobile teacher parity will prioritize class context, roster, attendance, assignments, submissions, review, practical grading, and notifications. Mobile administration will include only useful verification, facilities, operational-alert, and governance visibility/actions. Every privileged action will use the same server authorization path as web. Dense desktop tables will be adapted into touch-appropriate cards, lists, sheets, and focused forms.

## API and Data Contracts

Every completed feature will be traced through database schema or migration, API endpoint and authorization, OpenAPI definition, generated Zod types, generated client, web consumer, and mobile consumer where applicable.

IDs, enums, dates, nullability, status values, and response shapes must match across layers. Broad casts and TypeScript any forms are prohibited. PostgreSQL = any(...) syntax is valid SQL and will not be counted as TypeScript any usage.

## UX and Accessibility

Modified workflows will include appropriate loading, empty, error, success, disabled, active, and denied states. Mutations will prevent duplicate submission, provide clear feedback, and refresh stale views after success.

Changed screens will be checked for keyboard navigation, visible focus, semantic controls, labels, form errors, dialog behavior, reduced motion, touch targets, responsive behavior, and obvious contrast defects. The existing Abimizrak visual language remains intact; Phase 16 is not a visual redesign.

## Performance

Performance work is limited to evidence from changed features. Checks will target duplicate API calls, duplicate Realtime subscriptions, unnecessary rerenders, unbounded lists, and unnecessary data loading. No speculative architectural optimization is included.

## Testing

Focused regression tests will cover the highest-risk implemented behavior, especially search authorization, notification idempotency, facilities transitions, unread accounting, project permissions, administrator role boundaries, and mobile API contracts.

Connected acceptance suites remain fail-closed. They may be reported as BLOCKED when ACCEPTANCE_ENVIRONMENT_ID and a disposable isolated Supabase environment are unavailable. No local mock or configuration bypass may convert that external prerequisite into a claimed live pass.

## Documentation and Evidence

Phase 16 will update PHASE13_PRODUCT_GAP_AUDIT.md, PHASE13_SCORECARD.md, and PROGRESS.md with exact implementation evidence. RELEASE_AUDIT_2026-09-09.md will receive a brief append-only Phase 16 development note without rewriting historical release evidence.

Scores use the established 0-to-4 scale and will not be inflated. Remaining blocked, partial, P2, and P3 items will be preserved explicitly.

## Validation Gate

After implementation, run:

- pnpm install --frozen-lockfile
- pnpm install --frozen-lockfile --strict-peer-dependencies
- pnpm run typecheck
- pnpm build
- pnpm test:fixtures
- all focused deterministic regression tests added or available
- git diff --check
- a final changed-source TypeScript any search
- git status and git diff --stat

Connected acceptance tests will run only when they can do so safely. Their absence of external prerequisites will be reported as BLOCKED, not forced into PASS.

## Completion Criteria

- P0 remains zero.
- Every actionable P1 is closed; genuinely external P1 items retain severity and are recorded as blocked.
- P2 is materially reduced through implemented product depth.
- No new TypeScript any usage exists.
- Student and teacher core workflows are coherent and connected.
- Administration and mobile parity reach the strongest evidence-supported status.
- Search, notifications, facilities, unread state, projects, and presence use real authorization and persistence.
- Changed workflows have complete practical UX and accessibility states.
- Typecheck, build, strict peer installation, deterministic tests, and Git diff validation pass.
- Acceptance infrastructure remains ready and fail-closed.
- The image-size blocker remains unchanged.
- No commit, push, tag, production provisioning, deployment rehearsal, or final release certification occurs.
