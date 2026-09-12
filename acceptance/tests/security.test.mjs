import assert from "node:assert/strict";
import test from "node:test";
import { authenticatedClient } from "../lib/clients.mjs";
import { ids } from "../fixtures/manifest.mjs";

test("unprivileged identity cannot mutate administrator audit data", async () => {
  const client = await authenticatedClient("studentA");
  const { data, error } = await client.from("campus_verification_audits").insert({ id: `${ids.audit}-forbidden`, user_id: ids.studentA, actor_user_id: ids.studentA, action: "approved" }).select();
  assert.ok(error || !data?.length);
});

test("student submission write is scoped and persisted through RLS", async () => {
  const client = await authenticatedClient("studentA");
  const id = `${ids.submission}-write`;
  const write = await client.from("submissions").upsert({ id, assignment_id: ids.assignment, student_id: ids.studentA, content: "acceptance-only submission" }).select();
  if (write.error) throw write.error;
  const read = await client.from("submissions").select("id,content").eq("id", id).single();
  if (read.error) throw read.error;
  assert.equal(read.data.content, "acceptance-only submission");
});
