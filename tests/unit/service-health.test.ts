import { it } from "node:test";
import assert from "node:assert/strict";
import { checkServiceHealth } from "../../src/lib/serviceHealth";

it("reports healthy only after both actual service probes succeed", async () => {
  const result = await checkServiceHealth({ database: async () => [1], redis: async () => "PONG" });
  assert.deepEqual(result, { healthy: true, database: "connected", redis: "connected" });
});

it("does not read or expose content-bearing database failures", async () => {
  let messageRead = false;
  const failure = new Error();
  Object.defineProperty(failure, "message", { get() { messageRead = true; return "PRIVATE_CONNECTION_AND_DOCUMENT_CANARY"; } });
  const result = await checkServiceHealth({ database: async () => { throw failure; }, redis: async () => "PONG" });
  assert.deepEqual(result, { healthy: false, database: "disconnected", redis: "connected" });
  assert.equal(messageRead, false);
  assert.equal(JSON.stringify(result).includes("PRIVATE_CONNECTION_AND_DOCUMENT_CANARY"), false);
});

it("bounds an unresponsive Redis probe and reports degradation", { timeout: 1000 }, async () => {
  const result = await checkServiceHealth({ database: async () => [1], redis: () => new Promise(() => {}) }, 5);
  assert.deepEqual(result, { healthy: false, database: "connected", redis: "offline" });
});

it("treats missing queue configuration as an unavailable service", async () => {
  const result = await checkServiceHealth({ database: async () => [1], redis: () => { throw new Error("Configuration missing."); } });
  assert.deepEqual(result, { healthy: false, database: "connected", redis: "offline" });
});
