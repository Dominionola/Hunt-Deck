import assert from "node:assert/strict";
import test from "node:test";
import { inspectWorkerQueue, workerQueueHealthy } from "../../src/services/queue/workerHealth";

test("health inspection returns aggregate queue data and no job contents", async () => {
  const status = await inspectWorkerQueue("jobs", {
    getWorkers: async () => [{ confidential: "not included" }],
    getJobCounts: async () => ({ waiting: 2, active: 1, delayed: 0, failed: 3 }),
  });
  assert.deepEqual(status, { queue: "jobs", workers: 1, waiting: 2, active: 1, delayed: 0, failed: 3 });
  assert.equal(workerQueueHealthy(status, 2), true);
  assert.equal(workerQueueHealthy(status, 1), false);
  assert.equal(workerQueueHealthy({ ...status, workers: 0 }, 2), false);
});

test("health inspection fails when Redis cannot be queried", async () => {
  await assert.rejects(inspectWorkerQueue("jobs", {
    getWorkers: async () => { throw new Error("unavailable"); },
    getJobCounts: async () => ({}),
  }));
});
