import assert from "node:assert/strict";
import test from "node:test";
import { fixtureManifest, ids, FIXTURE_PREFIX } from "../fixtures/manifest.mjs";

test("fixtures are deterministic, isolated, and cover every required domain", () => {
  assert.equal(fixtureManifest.environment, "acceptance-only");
  assert.ok(Object.values(ids).every((id) => id.startsWith(FIXTURE_PREFIX)));
  for (const domain of ["verification", "timetable", "attendance", "grades", "assignment", "submission", "event", "notification", "facility", "governance", "membership", "private-message", "private-thread", "thread-unread", "presence-expiry", "mobile-teacher", "mobile-administrator"]) assert.ok(fixtureManifest.coverage.includes(domain));
  assert.deepEqual(fixtureManifest.identities, ["studentA", "studentB", "teacher", "administrator", "nonMember"]);
});
