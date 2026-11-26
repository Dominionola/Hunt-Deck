import { it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Queue, QueueEvents, Worker } from "bullmq";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { ResumeJobData, ResumeJobResult } from "../../src/services/queue/resumeQueue";
import { syntheticOnboardingPdf } from "../fixtures/syntheticResume";

it("bounds malformed extraction retries and stores only safe diagnostic codes", {
  skip: process.env.HUNTDECK_RUN_INVALID_OUTPUT_TEST !== "1", timeout: 60000,
}, async (t) => {
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const url = new URL(process.env.REDIS_URL || "");
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "16379");
  assert.equal(process.env.R2_BUCKET_NAME, "huntdeck-resumes-dev");
  const { redisConnectionOptions, resumeJobId, RESUME_JOB_OPTIONS } = await import("../../src/services/queue/resumeQueue");
  const { processQueuedResume } = await import("../../src/services/queue/resumeProcessor");
  const { stageResumeForWorker } = await import("../../src/services/storage/r2Service");
  const owner = `synthetic_retry_${randomUUID()}`;
  const bytes = syntheticOnboardingPdf();
  const connection = redisConnectionOptions(true);
  const name = `synthetic-retry-${randomUUID()}`;
  const queue = new Queue<ResumeJobData, ResumeJobResult>(name, { connection });
  const events = new QueueEvents(name, { connection });
  let worker: Worker<ResumeJobData, ResumeJobResult> | undefined;
  let key: string | undefined;
  const calls: number[] = [];
  try {
    key = await stageResumeForWorker(owner, "synthetic.pdf", bytes);
    await events.waitUntilReady();
    t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      assert.ok(String(input instanceof Request ? input.url : input).startsWith("https://api.groq.com/"));
      calls.push(Date.now());
      return Response.json({ choices: [{ message: { content: "PRIVATE_SYNTHETIC_PROVIDER_CANARY" }, finish_reason: "stop" }] });
    });
    const job = await queue.add("process", { userId: owner, storageKey: key }, { ...RESUME_JOB_OPTIONS, jobId: resumeJobId(owner, bytes) });
    worker = new Worker(name, processQueuedResume, { connection, concurrency: 1 });
    worker.on("error", () => {});
    await assert.rejects(job.waitUntilFinished(events, 30000), /temporarily unavailable/);
    const failed = await queue.getJob(job.id!); assert.ok(failed);
    assert.equal(await failed.getState(), "failed"); assert.equal(failed.attemptsMade, 3);
    assert.equal(calls.length, 3);
    assert.ok(calls[1] - calls[0] >= 900); assert.ok(calls[2] - calls[1] >= 1800);
    const { logs } = await queue.getJobLogs(job.id!);
    assert.equal(logs.length, 3);
    for (const line of logs) assert.deepEqual(JSON.parse(line), { event: "resume_processing_failed", stage: "extraction", code: "EXTRACTION_INVALID_OUTPUT" });
    assert.equal(JSON.stringify({ job: failed.toJSON(), logs }).includes("PRIVATE_SYNTHETIC_PROVIDER_CANARY"), false);
    assert.deepEqual(Object.keys(failed.data).sort(), ["storageKey", "userId"]);
    // A separately approved manual attempt must not reset the exhausted budget.
    await failed.retry("failed", { resetAttemptsMade: false, resetAttemptsStarted: false });
    await assert.rejects(failed.waitUntilFinished(events, 15000), /temporarily unavailable/);
    const once = await queue.getJob(job.id!); assert.ok(once);
    assert.equal(once.attemptsMade, 4); assert.equal(calls.length, 4);
    const pending = await queue.getJobCounts("wait", "active", "delayed");
    assert.equal(pending.wait + pending.active + pending.delayed, 0);
    console.log("Real Redis retry scheduling passed: exactly three malformed-output attempts, bounded backoff and content-free diagnostic codes. Extraction was mocked; only synthetic PDF bytes used in private R2.");
    console.log("A separate manual retry with preserved exhausted counters ran exactly once, without automatic retries.");
  } finally {
    await worker?.close(); await queue.obliterate({ force: true }); await queue.close(); await events.close();
    if (key) {
      const client = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } });
      try { await client.send(new DeleteObjectCommand({ Bucket: "huntdeck-resumes-dev", Key: key })); }
      catch { throw new Error("Synthetic retry fixture cleanup failed; details withheld."); }
      finally { client.destroy(); }
    }
  }
});
