import { it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Queue, Worker, type Job } from "bullmq";
import type { IngestionCounts, IngestionJob } from "../../src/lib/validations/jobIngestion";

it("resumes an interrupted import from Redis after a worker restart", { skip: process.env.HUNTDECK_RUN_JOB_REDIS_TEST !== "1", timeout: 30000 }, async () => {
  loadEnvConfig(process.cwd());
  const redisUrl = new URL(process.env.REDIS_URL ?? "");
  assert.ok(["127.0.0.1", "localhost", "::1"].includes(redisUrl.hostname), "Only local Redis is allowed");
  const { redisConnectionOptions } = await import("../../src/services/queue/resumeQueue");
  const { processJobIngestion } = await import("../../src/services/queue/jobIngestionProcessor");
  const { BoardRequestError } = await import("../../src/services/jobs/adapters/publicBoard");
  const name = `huntdeck-checkpoint-test-${randomUUID()}`;
  const queue = new Queue<IngestionJob, IngestionCounts>(name, { connection: redisConnectionOptions() });
  const offsets: number[] = []; let saved = 0;
  const board = { fetched: 1, selected: 1, invalid: 0, incomplete: true, nextOffset: 200,
    jobs: [{ title: "SYNTHETIC_PRIVATE_CANARY", company: "fixture", description: "Synthetic job description", remoteType: "ANY" as const,
      atsPlatform: "GREENHOUSE" as const, applicationUrl: "https://example.invalid/job", externalJobId: "fixture" }] };
  const deps = { authorized: async () => true, allowSource: async () => true,
    fetchBoard: async (_source: IngestionJob["sources"][number], _fetcher?: typeof fetch, offset = 0) => {
      offsets.push(offset);
      if (offset === 0) return board;
      if (offsets.filter((n) => n === 200).length === 1) throw new BoardRequestError(true);
      return { ...board, fetched: 0, selected: 0, incomplete: false, nextOffset: null, jobs: [] };
    }, persist: async () => { saved++; return { id: "synthetic", embedded: false }; } };
  const start = () => new Worker<IngestionJob, IngestionCounts>(name, (job: Job<IngestionJob, IngestionCounts>) => processJobIngestion(job, deps), { connection: redisConnectionOptions(true) });
  let worker = start();
  const waitFor = async (predicate: () => Promise<boolean>) => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) { if (await predicate()) return; await new Promise((resolve) => setTimeout(resolve, 50)); }
    throw new Error("Synthetic queue timed out.");
  };
  try {
    const job = await queue.add("synthetic", { userId: "synthetic", sources: [{ platform: "GREENHOUSE", board: "fixture" }] },
      { attempts: 2, backoff: { type: "fixed", delay: 3000 } });
    await waitFor(async () => (await job.getState()) === "delayed");
    const checkpoint = (await queue.getJob(job.id!))!.progress;
    assert.equal(JSON.stringify(checkpoint).includes("SYNTHETIC_PRIVATE_CANARY"), false);
    await worker.close(); worker = start();
    await waitFor(async () => (await job.getState()) === "completed");
    assert.deepEqual(offsets, [0, 200, 200]); assert.equal(saved, 1);
    const finished = await queue.getJob(job.id!);
    assert.equal(finished?.returnvalue.saved, 1);
    assert.equal(JSON.stringify(finished?.toJSON()).includes("SYNTHETIC_PRIVATE_CANARY"), false);
  } finally {
    await worker.close(); await queue.obliterate({ force: true }); await queue.close();
  }
});
