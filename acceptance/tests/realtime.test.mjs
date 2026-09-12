import assert from "node:assert/strict";
import test from "node:test";
import { authenticatedClient } from "../lib/clients.mjs";
import { ids } from "../fixtures/manifest.mjs";

function subscribe(client, topic) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Realtime subscription timed out for ${topic}`)), 10000);
    const channel = client.channel(topic, { config: { private: true, presence: { key: topic } } });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(timer); resolve({ channel, status }); }
    });
  });
}

test("authorized member can subscribe to the seeded private thread", async () => {
  const client = await authenticatedClient("studentA");
  const result = await subscribe(client, `private:${ids.privateThread}`);
  assert.equal(result.status, "SUBSCRIBED");
  await client.removeChannel(result.channel);
});

test("non-member cannot subscribe to the seeded private thread", async () => {
  const client = await authenticatedClient("nonMember");
  const result = await subscribe(client, `private:${ids.privateThread}`);
  assert.notEqual(result.status, "SUBSCRIBED");
  await client.removeChannel(result.channel);
});
