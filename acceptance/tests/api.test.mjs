import assert from "node:assert/strict";
import test from "node:test";
import { accessToken } from "../lib/clients.mjs";
import { requireAcceptanceEnvironment } from "../lib/config.mjs";
import { ids } from "../fixtures/manifest.mjs";

async function request(role, path, init = {}) {
  const { ACCEPTANCE_API_URL } = requireAcceptanceEnvironment(["ACCEPTANCE_API_URL"]);
  const { token } = await accessToken(role);
  return fetch(`${ACCEPTANCE_API_URL}${path}`, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...init.headers } });
}

test("unauthenticated campus request is denied by the real API boundary", async () => {
  const { ACCEPTANCE_API_URL } = requireAcceptanceEnvironment(["ACCEPTANCE_API_URL"]);
  const response = await fetch(`${ACCEPTANCE_API_URL}/api/campus/identity/verification`);
  assert.equal(response.status, 401);
});

test("controlled student read traverses auth, handler, database, and response", async () => {
  const response = await request("studentA", "/api/campus/identity/verification");
  assert.equal(response.status, 200);
  assert.ok((await response.json()).userId);
});

test("student cannot read administrator verification queue", async () => {
  const response = await request("studentA", "/api/campus/identity/verification/requests");
  assert.equal(response.status, 403);
});

test("notification mutation persists and is visible on subsequent read", async () => {
  const list = await request("studentA", "/api/campus/notifications");
  assert.equal(list.status, 200);
  const rows = await list.json();
  assert.ok(rows.length, "seeded notification is required");
  const target = rows.find((row) => !row.readAt) ?? rows[0];
  const update = await request("studentA", `/api/campus/notifications/${target.id}/read`, { method: "POST", body: "{}" });
  assert.ok(update.ok);
  const verify = await request("studentA", "/api/campus/notifications");
  const persisted = (await verify.json()).find((row) => row.id === target.id);
  assert.ok(persisted.readAt);
});

test("notification read-all is atomic and remains isolated to the authenticated member", async () => {
  const studentAList = await request("studentA", "/api/campus/notifications");
  const studentBList = await request("studentB", "/api/campus/notifications");
  assert.equal(studentAList.status, 200);
  assert.equal(studentBList.status, 200);

  const studentARows = await studentAList.json();
  const studentBRowsBefore = await studentBList.json();
  assert.ok(studentARows.length, "student A requires at least one seeded notification");

  const crossUserMutation = await request(
    "studentB",
    `/api/campus/notifications/${studentARows[0].id}/read`,
    { method: "POST", body: "{}" },
  );
  assert.equal(crossUserMutation.status, 404);

  const readAll = await request("studentA", "/api/campus/notifications/read-all", {
    method: "POST",
    body: "{}",
  });
  assert.equal(readAll.status, 204);

  const studentAVerify = await request("studentA", "/api/campus/notifications");
  assert.equal(studentAVerify.status, 200);
  assert.ok((await studentAVerify.json()).every((row) => row.readAt));

  const studentBVerify = await request("studentB", "/api/campus/notifications");
  assert.equal(studentBVerify.status, 200);
  assert.deepEqual(await studentBVerify.json(), studentBRowsBefore);
});

test("campus search requires authentication and excludes privileged identities", async () => {
  const { ACCEPTANCE_API_URL } = requireAcceptanceEnvironment(["ACCEPTANCE_API_URL"]);
  const unauthenticated = await fetch(`${ACCEPTANCE_API_URL}/api/campus/search?q=acceptance`);
  assert.equal(unauthenticated.status, 401);

  const shortQuery = await request("studentA", "/api/campus/search?q=a");
  assert.equal(shortQuery.status, 200);
  assert.deepEqual(await shortQuery.json(), { query: "a", results: [] });

  const response = await request("studentA", "/api/campus/search?q=acceptance");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.query, "acceptance");
  assert.ok(Array.isArray(payload.results));
  assert.ok(payload.results.length <= 24);
  assert.ok(payload.results.every((result) => ["person", "space", "project", "event"].includes(result.kind)));
  assert.ok(payload.results.every((result) => result.kind !== "person" || result.id !== ids.administrator));
});

test("facility issue lifecycle is reporter-visible, administrator-controlled, and notifies the reporter", async () => {
  const createdResponse = await request("studentA", "/api/campus/facilities/issues", {
    method: "POST",
    body: JSON.stringify({
      roomId: ids.room,
      title: "Acceptance facility issue",
      description: "A controlled issue used to verify the connected facilities workflow.",
    }),
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.reporterId, ids.studentA);
  assert.equal(created.status, "reported");

  const otherStudentRead = await request("studentB", `/api/campus/facilities/issues/${created.id}/history`);
  assert.equal(otherStudentRead.status, 404);

  const studentTransition = await request("studentA", `/api/campus/admin/facilities/issues/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "assigned", assigneeId: ids.administrator }),
  });
  assert.equal(studentTransition.status, 403);

  const assignedResponse = await request("administrator", `/api/campus/admin/facilities/issues/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "assigned", assigneeId: ids.administrator, note: "Assigned by acceptance workflow." }),
  });
  assert.equal(assignedResponse.status, 200);
  assert.equal((await assignedResponse.json()).status, "assigned");

  const invalidTransition = await request("administrator", `/api/campus/admin/facilities/issues/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "resolved", resolution: "Skipped required in-progress state." }),
  });
  assert.equal(invalidTransition.status, 409);

  const historyResponse = await request("studentA", `/api/campus/facilities/issues/${created.id}/history`);
  assert.equal(historyResponse.status, 200);
  const history = await historyResponse.json();
  assert.deepEqual(history.map((entry) => entry.toStatus), ["reported", "assigned"]);

  const notificationsResponse = await request("studentA", "/api/campus/notifications");
  assert.equal(notificationsResponse.status, 200);
  const notification = (await notificationsResponse.json()).find(
    (row) => row.sourceKey === `facility-transition:${created.id}:assigned`,
  );
  assert.ok(notification, "the reporter must receive the facility transition notification");
  assert.equal(notification.metadata?.issueId, created.id);
});

test("connected assignment lifecycle persists teacher review for the enrolled student", async () => {
  const studentList = await request("studentA", "/api/academic/student/assignments");
  assert.equal(studentList.status, 200);
  const studentAssignments = await studentList.json();
  const assignment = studentAssignments.find((row) => row.id === ids.assignment);
  assert.ok(assignment, "seeded published assignment must be visible to student A");

  const submitted = await request("studentA", `/api/academic/assignments/${ids.assignment}/submission`, {
    method: "POST",
    body: JSON.stringify({ bodyText: "Phase 13 connected workflow response", files: [] }),
  });
  assert.equal(submitted.status, 201);
  const submission = await submitted.json();
  assert.equal(submission.assignmentId, ids.assignment);
  assert.equal(submission.studentId, ids.studentA);
  assert.ok(["submitted", "resubmitted"].includes(submission.status));

  const teacherList = await request("teacher", `/api/academic/classes/${ids.classAuthorized}/submissions`);
  assert.equal(teacherList.status, 200);
  const teacherSubmissions = await teacherList.json();
  const teacherSubmission = teacherSubmissions.find((row) => row.id === submission.id);
  assert.ok(teacherSubmission, "authorized teacher must see the student's submission");
  assert.equal(teacherSubmission.maxScore, assignment.maxScore);

  const score = Math.min(17, Number(assignment.maxScore));
  const reviewed = await request("teacher", `/api/academic/submissions/${submission.id}`, {
    method: "PATCH",
    body: JSON.stringify({ gradeValue: score, feedback: "Reviewed through the connected workflow.", status: "reviewed" }),
  });
  assert.equal(reviewed.status, 200);
  const reviewedSubmission = await reviewed.json();
  assert.equal(reviewedSubmission.status, "reviewed");
  assert.equal(Number(reviewedSubmission.gradeValue), score);

  const studentVerify = await request("studentA", "/api/academic/student/assignments");
  assert.equal(studentVerify.status, 200);
  const persisted = (await studentVerify.json()).find((row) => row.id === ids.assignment)?.submission;
  assert.equal(persisted?.id, submission.id);
  assert.equal(persisted?.status, "reviewed");
  assert.equal(Number(persisted?.gradeValue), score);
  assert.equal(persisted?.feedback, "Reviewed through the connected workflow.");
});

test("teacher cannot cross the unauthorized class boundary", async () => {
  const response = await request("teacher", `/api/academic/classes/${ids.classUnauthorized}/submissions`);
  assert.equal(response.status, 403);
});

test("private project administration preserves visibility, creator controls, and administrator oversight", async () => {
  const createdResponse = await request("studentA", "/api/projects", {
    method: "POST",
    body: JSON.stringify({
      name: "Acceptance private project",
      description: "A controlled project used to verify private membership and administration boundaries.",
      visibility: "private",
    }),
  });
  assert.equal(createdResponse.status, 201);
  const project = await createdResponse.json();
  assert.equal(project.visibility, "private");
  assert.equal(project.status, "idea");

  const hidden = await request("studentB", `/api/projects/${project.id}`);
  assert.equal(hidden.status, 404);

  const deniedJoin = await request("studentB", `/api/projects/${project.id}/join`, { method: "POST", body: "{}" });
  assert.equal(deniedJoin.status, 403);

  const invited = await request("studentA", `/api/projects/${project.id}/members`, {
    method: "POST",
    body: JSON.stringify({ userId: ids.studentB, role: "member" }),
  });
  assert.equal(invited.status, 201);

  const visibleAfterInvite = await request("studentB", `/api/projects/${project.id}`);
  assert.equal(visibleAfterInvite.status, 200);
  assert.equal((await visibleAfterInvite.json()).viewer.isMember, true);

  const memberCannotManage = await request("studentB", `/api/projects/${project.id}/settings`, {
    method: "PATCH",
    body: JSON.stringify({ status: "active" }),
  });
  assert.equal(memberCannotManage.status, 403);

  const milestoneResponse = await request("administrator", `/api/projects/${project.id}/milestones`, {
    method: "POST",
    body: JSON.stringify({ title: "Administrator acceptance milestone" }),
  });
  assert.equal(milestoneResponse.status, 201);
  const milestone = await milestoneResponse.json();
  assert.equal(milestone.status, "pending");

  const started = await request("studentA", `/api/projects/${project.id}/settings`, {
    method: "PATCH",
    body: JSON.stringify({ status: "active" }),
  });
  assert.equal(started.status, 200);
  assert.equal((await started.json()).status, "active");

  const completedMilestone = await request("administrator", `/api/projects/${project.id}/milestones/${milestone.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "completed" }),
  });
  assert.equal(completedMilestone.status, 200);
  assert.equal((await completedMilestone.json()).status, "completed");
});
