import assert from "node:assert/strict";
import test from "node:test";
import { authenticatedClient } from "../lib/clients.mjs";
import { ids } from "../fixtures/manifest.mjs";

async function rows(role, table, column, value) {
  const client = await authenticatedClient(role);
  const result = await client.from(table).select("*").eq(column, value);
  if (result.error) throw result.error;
  return result.data;
}

test("student A cannot read student B private academic data", async () => assert.equal((await rows("studentA", "student_profiles", "id", ids.studentB)).length, 0));
test("student B cannot read student A private academic data", async () => assert.equal((await rows("studentB", "student_profiles", "id", ids.studentA)).length, 0));
test("teacher can read an authorized student", async () => assert.equal((await rows("teacher", "student_profiles", "id", ids.studentA)).length, 1));
test("teacher cannot read an unauthorized student", async () => assert.equal((await rows("teacher", "student_profiles", "id", ids.studentB)).length, 0));
test("student cannot read administrator governance audit", async () => assert.equal((await rows("studentA", "campus_verification_audits", "id", ids.audit)).length, 0));
test("non-member cannot read private campus messages", async () => assert.equal((await rows("nonMember", "campus_messages", "id", ids.privateMessage)).length, 0));
