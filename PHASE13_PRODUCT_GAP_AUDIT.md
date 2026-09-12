# Phase 13 Product Gap Audit

This document records the current Phase 13 product state after implementation. Historical release findings remain in RELEASE_AUDIT_2026-09-09.md and are not replaced by this development audit.

## Current product state

| Area | State | Evidence and remaining depth |
| --- | --- | --- |
| Identity | IMPLEMENTED | Authenticated profile and verification state are connected to role-aware product access. |
| Academic | IMPLEMENTED | Student academic overview and teacher class workspace connect schedule, attendance, assignments, submissions, and grades. |
| Attendance | IMPLEMENTED | Teacher marking and correction and student read-back are persisted and class-scoped. |
| Grades | IMPLEMENTED | Teacher entry/update and student results read-back are connected through class and subject context. |
| Assignments | IMPLEMENTED | Teacher creation, class scope, due dates, publication visibility, and student discovery are connected. |
| Submissions | IMPLEMENTED | Student submission, duplicate-safe persistence, teacher review, feedback, grading, and student read-back are connected. |
| Timetable | IMPLEMENTED | Day, time, class, subject, teacher, and room context are available to student and teacher flows. |
| Events | PARTIAL | Event listing and mobile visibility exist; richer audience/status operations remain limited. |
| Notifications | IMPLEMENTED | Duplicate-safe notification delivery, persisted read state, academic destinations, verification, events, projects, comments, and facilities transitions are connected. |
| Spaces | IMPLEMENTED | Membership-scoped spaces and readable navigation are backed by persisted APIs. |
| Channels | IMPLEMENTED | Channel context and membership-aware message access are connected. |
| Messaging | IMPLEMENTED | Persisted channel messaging includes membership-authorized unread counts and per-user read cursors. |
| Threads | PARTIAL | Thread context exists, while broader thread lifecycle and unread handling need more depth. |
| Presence | PARTIAL | Presence support exists but is not yet a complete campus-wide operational signal. |
| Projects | IMPLEMENTED | Creator/admin membership management, private visibility enforcement, valid status transitions, activity, and milestones are connected. |
| Verification | IMPLEMENTED | Administrative verification decisions are server-enforced and connected to identity state. |
| Administration | PARTIAL | Verification, academic configuration, membership relationships, audit visibility, and timetable operations exist; some operations remain read-heavy. |
| Facilities | IMPLEMENTED | Reporting, reporter-scoped history, administrator assignment, guarded transitions, resolution, audit history, and reporter notifications are connected. |
| Governance | PARTIAL | Governance data and hardened RLS are present; broader workflows remain limited. |
| Audit | PARTIAL | Administrative audit visibility exists, with additional filtering/export depth deferred. |
| Search/Discovery | IMPLEMENTED | Authorized unified discovery covers people, spaces, visible projects, and events without exposing privileged identities. |
| Mobile | PARTIAL | Academic overview, schedule, attendance, assignments, grades, notifications, events, and identity have useful parity; teacher/admin parity is intentionally narrower. |
| Cross-module integration | IMPLEMENTED | Student and teacher academic chains, notification destinations, verification-to-identity, and project membership/activity are connected. |

## Priority picture after this continuation

- P0: 0 confirmed fundamental broken workflows.
- P1: 0 remaining confirmed product capability gaps in the Phase 15 scope.
- P2: Remaining depth is concentrated in thread-specific unread accounting, infrastructure-backed presence, richer events and audit operations, accessibility runtime verification, and broader mobile teacher and administrator parity.
- P3: 4 polish items covering richer filters, denser empty-state guidance, responsive refinements, and nonessential presentation consistency.

## Implemented in this continuation

- Connected student academic overview: class to schedule, attendance, assignments, submissions, review feedback, and grades.
- Connected teacher class workspace: class selection, roster, attendance, assignments, submissions, review, feedback, and grading.
- Persisted assignment-to-submission-to-review-to-grade lifecycle with server-side class authorization.
- Read/unread notification persistence and meaningful academic navigation destinations.
- Mobile academic overview parity for the highest-value student workflows.
- Operational admin depth for academic configuration, relationships, timetable visibility, verification, and audit context.
- Focused acceptance coverage for academic lifecycle, notification persistence, authorization boundaries, RLS, and realtime membership.

## Remaining major gaps

- Thread-specific reply and unread accounting beyond channel-level read cursors.
- Infrastructure-backed presence with scoped expiry and disconnect behavior.
- Broader mobile teacher and administrator operations.
- Runtime accessibility acceptance and richer audit export/filtering.

## Validation note

The isolated acceptance harness remains fail-closed. Live API, RLS, security, and realtime acceptance runs are blocked when ACCEPTANCE_ENVIRONMENT_ID and isolated Supabase prerequisites are absent; this is expected behavior, not a product test pass.
