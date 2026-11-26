import { it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { syntheticOnboardingPdf } from "../fixtures/syntheticResume";

it("processes a synthetic document with the actual running development worker", {
  skip: process.env.HUNTDECK_RUN_EXISTING_WORKER_TEST !== "1", timeout: 120000,
}, async () => {
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const redis = new URL(process.env.REDIS_URL || "");
  assert.equal(redis.hostname, "127.0.0.1"); assert.equal(redis.port, "16379");
  assert.equal(process.env.R2_BUCKET_NAME, "huntdeck-resumes-dev");
  assert.equal(process.env.R2_ACCOUNT_ID, "093d489fa9bb46a82db650872b75b57e");
  const database = new URL(process.env.DATABASE_URL || "");
  assert.ok(database.hostname === "db.jeufaeryqcvblejxfanq.supabase.co" ||
    (database.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(database.username) === "postgres.jeufaeryqcvblejxfanq"));
  const { db } = await import("../../src/lib/db");
  const { getResumeQueue, enqueueResume, resumeJobId, closeResumeQueueConnections } = await import("../../src/services/queue/resumeQueue");
  const { stageResumeForWorker } = await import("../../src/services/storage/r2Service");
  const owner = `synthetic_worker_${randomUUID()}`;
  const bytes = syntheticOnboardingPdf();
  const id = resumeJobId(owner, bytes);
  const queue = getResumeQueue();
  let key: string | undefined;
  let created = false;
  try {
    assert.equal((await queue.getWorkers()).length, 1, "Expected exactly one normal development worker.");
    await db.user.create({ data: { id: owner, email: `${owner}@example.invalid` } }); created = true;
    key = await stageResumeForWorker(owner, "synthetic.pdf", bytes);
    await enqueueResume({ userId: owner, storageKey: key }, id);
    const deadline = Date.now() + 90000;
    let completed = false;
    while (Date.now() < deadline) {
      const job = await queue.getJob(id); assert.ok(job);
      const state = await job.getState();
      if (state === "failed") throw new Error(`Synthetic running worker failed at progress ${job.progress}; attempts ${job.attemptsMade}. Provider details withheld.`);
      if (state === "completed") { completed = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.equal(completed, true, "Running worker did not finish within the bounded wait.");
    const result = await db.resume.findFirstOrThrow({ where: { id: `resume_${id}`, userId: owner } });
    const data = result.parsedData as { fullName: string; skills: string[] };
    assert.equal(data.fullName, "Morgan Synthetic");
    assert.ok(data.skills.includes("Python"));
    console.log("Actual normal worker completed a synthetic PDF through private R2, Groq, Workers AI and hosted persistence.");
  } finally {
    const job = await queue.getJob(id);
    if (job && job.data.userId === owner) await job.remove();
    if (created) {
      await db.resume.deleteMany({ where: { userId: owner } });
      await db.user.delete({ where: { id: owner } });
    }
    if (key) {
      const client = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } });
      try { await client.send(new DeleteObjectCommand({ Bucket: "huntdeck-resumes-dev", Key: key })); }
      catch { throw new Error("Synthetic staging cleanup failed; details withheld."); }
      finally { client.destroy(); }
    }
    await closeResumeQueueConnections(); await db.$disconnect();
  }
});
