import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("thread unread accounting has persistent read state and authorized API routes", async () => {
  const [schema, routes, migration] = await Promise.all([
    read("lib/db/src/schema/campus.ts"),
    read("artifacts/api-server/src/routes/campus.ts"),
    read("lib/db/drizzle/0011_threads_presence_operations.sql"),
  ]);
  assert.match(schema, /campusThreadReadsTable/);
  assert.match(routes, /channels\/:channelId\/threads/);
  assert.match(routes, /threads\/:threadId\/read/);
  assert.match(routes, /unreadCount/);
  assert.match(migration, /campus_thread_reads/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
});

test("presence is persisted, expires stale heartbeats, and is exposed through authenticated routes", async () => {
  const [routes, migration] = await Promise.all([
    read("artifacts/api-server/src/routes/campus.ts"),
    read("lib/db/drizzle/0011_threads_presence_operations.sql"),
  ]);
  assert.match(routes, /router\.post\(\s*"\/presence\/heartbeat"/);
  assert.match(routes, /router\.get\(\s*"\/presence"/);
  assert.match(routes, /updatedAt/);
  assert.match(routes, /offline/);
  assert.match(migration, /campus_presence/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
});
