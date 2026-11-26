import { it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { Queue, QueueEvents, Worker, UnrecoverableError } from "bullmq";
import Redis from "ioredis";
import { loadEnvConfig } from "@next/env";
import { enqueueResume, getResumeQueue, getOwnedResumeJob, enforceResumeRateLimit, closeResumeQueueConnections, redisConnectionOptions, resumeJobId, RESUME_JOB_OPTIONS } from "../../src/services/queue/resumeQueue";

const enabled = process.env.HUNTDECK_RUN_REDIS_TESTS === "1";
if (enabled) loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

it("verifies real local Redis deduplication, ownership, retries, forced worker recovery and Redis restart", { skip: !enabled, timeout: 60000 }, async () => {
  const url = new URL(process.env.REDIS_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1", "isolated local Redis only");
  assert.equal(url.port, "16379", "isolated test Redis port only");
  const connection = redisConnectionOptions(true);
  const redis = new Redis(connection);
  redis.on("error", () => {});
  const name = `huntdeck-synthetic-${randomUUID()}`;
  const queue = new Queue(name, { connection });
  const events = new QueueEvents(name, { connection });
  queue.on("error", () => {});
  events.on("error", () => {});
  const workers: Array<{ close(force?: boolean): Promise<void> }> = [];
  const owner = `synthetic_${randomUUID()}`;
  const references = { userId: owner, storageKey: `resumes/${owner}/${"b".repeat(64)}.pdf` };
  const id = resumeJobId(owner, Buffer.from("synthetic-deduplication"));
  let crashWorker: ReturnType<typeof spawn> | undefined;
  try {
    await events.waitUntilReady();
    assert.match(await redis.info("persistence"), /aof_enabled:1/);
    assert.deepEqual(await redis.config("GET", "maxmemory-policy"), ["maxmemory-policy", "noeviction"]);
    assert.deepEqual(await redis.config("GET", "appendfsync"), ["appendfsync", "everysec"]);

    await Promise.all(Array.from({ length: 12 }, () => enqueueResume(references, id)));
    const owned = await getOwnedResumeJob(id, owner);
    assert.ok(owned);
    assert.deepEqual(owned.data, references);
    assert.equal(await owned.getState(), "waiting");
    assert.equal((await getResumeQueue().getJobs(["waiting"])).filter((job) => job.id === id).length, 1);
    await assert.rejects(getOwnedResumeJob(id, "other_owner"), /Forbidden/);
    for (let attempt = 0; attempt < 15; attempt++) assert.equal(await enforceResumeRateLimit(owner), true);
    assert.equal(await enforceResumeRateLimit(owner), false);
    assert.equal(await enforceResumeRateLimit(`${owner}_other`), true);
    console.log("Synthetic Redis checks: references, ownership, concurrency and rate limit passed.");

    const timings: number[] = [];
    const retryJob = await queue.add("retry", references, RESUME_JOB_OPTIONS);
    const worker = new Worker(name, async () => {
      timings.push(Date.now());
      if (timings.length < 3) throw new Error("Synthetic transient failure.");
      return { resumeId: "synthetic-only" };
    }, { connection, stalledInterval: 1000 });
    workers.push(worker);
    assert.deepEqual(await retryJob.waitUntilFinished(events, 15000), { resumeId: "synthetic-only" });
    assert.equal(timings.length, 3);
    assert.ok(timings[1] - timings[0] >= 900);
    assert.ok(timings[2] - timings[1] >= 1900);
    await worker.close();
    console.log("Synthetic Redis checks: retry scheduling passed.");

    const permanent = await queue.add("permanent", references, RESUME_JOB_OPTIONS);
    const failingWorker = new Worker(name, async () => { throw new UnrecoverableError("Synthetic permanent failure."); }, { connection, stalledInterval: 1000 });
    workers.push(failingWorker);
    await assert.rejects(permanent.waitUntilFinished(events, 10000), /Synthetic permanent failure/);
    assert.equal((await queue.getJob(permanent.id!))?.attemptsMade, 1);
    await failingWorker.close();

    const exhausted = await queue.add("exhausted", references, RESUME_JOB_OPTIONS);
    const exhaustedWorker = new Worker(name, async () => { throw new Error("Synthetic transient failure."); }, { connection, stalledInterval: 1000 });
    workers.push(exhaustedWorker);
    await assert.rejects(exhausted.waitUntilFinished(events, 15000), /Synthetic transient failure/);
    assert.equal((await queue.getJob(exhausted.id!))?.attemptsMade, 3);
    await exhaustedWorker.close();
    console.log("Synthetic Redis checks: permanent failure and bounded exhaustion passed.");

    const stalledJob = await queue.add("stalled", references, RESUME_JOB_OPTIONS);
    crashWorker = spawn(process.execPath, ["--import", "tsx", "tests/fixtures/redis-stall-worker.ts"], { env: { ...process.env, HUNTDECK_SYNTHETIC_QUEUE: name }, stdio: ["ignore", "pipe", "pipe"] });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Synthetic worker did not become active.")), 10000);
      crashWorker!.stdout!.on("data", (chunk: Buffer) => { if (chunk.toString().includes("SYNTHETIC_ACTIVE")) { clearTimeout(timer); resolve(); } });
      crashWorker!.once("exit", () => { clearTimeout(timer); reject(new Error("Synthetic worker exited early.")); });
    });
    const exited = once(crashWorker, "exit");
    crashWorker.kill("SIGKILL");
    await exited;
    const recoveryWorker = new Worker(name, async () => ({ resumeId: "synthetic-recovered" }), { connection, lockDuration: 1000, stalledInterval: 1000 });
    workers.push(recoveryWorker);
    assert.deepEqual(await stalledJob.waitUntilFinished(events, 10000), { resumeId: "synthetic-recovered" });
    await recoveryWorker.close();

    const persisted = await queue.add("persisted", references, RESUME_JOB_OPTIONS);
    const restart = spawnSync("docker", ["restart", "huntdeck-worker-redis-dev"], { encoding: "utf8", timeout: 15000 });
    assert.equal(restart.status, 0, "isolated development Redis restart must succeed");
    // Worker-style Redis connections reconnect after the server comes back.
    assert.equal((await queue.getJob(persisted.id!))?.data.userId, owner);
    assert.equal(await persisted.getState(), "waiting");
    const stored = await redis.hgetall(`bull:${name}:${persisted.id}`);
    assert.deepEqual(JSON.parse(stored.data), references);
    assert.equal(JSON.stringify(stored).includes("Synthetic Candidate"), false);
    await owned.remove();
    console.log("Observed real Redis: AOF/noeviction, 12-way deduplication, owner rejection, 15/min limit, backoff and exhaustion, permanent failure, forced worker recovery, persisted job after Redis restart. Storage/providers/database were not involved.");
  } catch (error) {
    console.error("Synthetic Redis check failed:", error instanceof Error ? error.message : "unknown failure");
    throw error;
  } finally {
    if (crashWorker && crashWorker.exitCode === null) crashWorker.kill("SIGKILL");
    await Promise.all(workers.map((worker) => worker.close(true)));
    // This fresh UUID queue contains synthetic fixtures only. Never flush Redis.
    await queue.obliterate({ force: true });
    await (await getOwnedResumeJob(id, owner))?.remove();
    await queue.close();
    await events.close();
    await closeResumeQueueConnections();
    redis.disconnect();
  }
});
