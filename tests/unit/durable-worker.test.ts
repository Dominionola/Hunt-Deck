import { it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  enqueueJob,
  getJob,
  updateJobProgress,
  completeJob,
  failJob,
  checkRateLimit,
  clearInMemoryQueue,
} from "../../src/services/queue/durableQueue";
import type { ResumeProcessingJobData, ResumeProcessingJobResult } from "../../src/services/queue/queueTypes";

beforeEach(() => {
  clearInMemoryQueue();
});

it("enqueues a background job and retrieves it with verified user ownership", async () => {
  const userId = "usr_verified_123";
  const job = await enqueueJob<ResumeProcessingJobData, ResumeProcessingJobResult>(
    "resume-processing",
    "RESUME_PARSE_AND_EMBED",
    userId,
    {
      resumeId: "res_abc",
      userId,
      originalFileName: "test-resume.pdf",
      storageUrl: "https://storage.huntdeck.internal/resumes/res_abc.pdf",
      storageKey: "resumes/res_abc.pdf",
    },
    { maxAttempts: 3 }
  );

  assert.ok(job.id);
  assert.equal(job.status, "waiting");
  assert.equal(job.progress, 0);
  assert.equal(job.userId, userId);

  // Retrieve with matching owner succeeds
  const retrieved = await getJob("resume-processing", job.id, userId);
  assert.ok(retrieved);
  assert.equal(retrieved?.id, job.id);
});

it("strictly rejects cross-user access to background tasks (server-side ownership invariant)", async () => {
  const legitUser = "usr_legit_owner";
  const attackerUser = "usr_malicious_spy";

  const job = await enqueueJob(
    "resume-processing",
    "RESUME_PARSE_AND_EMBED",
    legitUser,
    { resumeId: "res_private" }
  );

  await assert.rejects(
    getJob("resume-processing", job.id, attackerUser),
    /Forbidden: You do not have permission to access this background task\./
  );
});

it("enforces idempotency using unique idempotency key", async () => {
  const userId = "usr_idempotent_1";
  const idempotencyKey = "upload_hash_sha256_unique_123";

  const job1 = await enqueueJob(
    "resume-processing",
    "RESUME_PARSE_AND_EMBED",
    userId,
    { file: "file1.pdf" },
    { idempotencyKey }
  );

  const job2 = await enqueueJob(
    "resume-processing",
    "RESUME_PARSE_AND_EMBED",
    userId,
    { file: "file1_duplicate.pdf" },
    { idempotencyKey }
  );

  assert.equal(job1.id, job2.id, "Second call with same idempotency key must return existing job");
});

it("records truthful multi-stage progress and completion", async () => {
  const userId = "usr_progress_user";
  const job = await enqueueJob("resume-processing", "PROCESS", userId, {});

  await updateJobProgress("resume-processing", job.id, 25, "Extracting PDF text stream");
  let current = await getJob("resume-processing", job.id, userId);
  assert.equal(current?.progress, 25);
  assert.equal(current?.currentStep, "Extracting PDF text stream");
  assert.equal(current?.status, "active");

  await updateJobProgress("resume-processing", job.id, 75, "Generating BGE-M3 1024-dim embedding");
  current = await getJob("resume-processing", job.id, userId);
  assert.equal(current?.progress, 75);

  await completeJob("resume-processing", job.id, { skillsFound: 12 });
  current = await getJob("resume-processing", job.id, userId);
  assert.equal(current?.status, "completed");
  assert.equal(current?.progress, 100);
  assert.ok(current?.completedAt);
});

it("handles transient errors with bounded retries and marks permanent failure on exhaustion", async () => {
  const userId = "usr_retry_user";
  const job = await enqueueJob("resume-processing", "PROCESS", userId, {}, { maxAttempts: 2 });

  // First transient error -> should trigger retry (attempt 1)
  const retry1 = await failJob("resume-processing", job.id, new Error("Cloudflare 503 Service Unavailable"), true);
  assert.equal(retry1.retried, true);
  assert.equal(retry1.attempts, 1);

  let status = await getJob("resume-processing", job.id, userId);
  assert.equal(status?.status, "waiting");
  assert.ok(status?.currentStep.includes("Retrying"));

  // Second transient error -> maxAttempts reached -> permanent failure
  const retry2 = await failJob("resume-processing", job.id, new Error("Cloudflare 503 Service Unavailable"), true);
  assert.equal(retry2.retried, false);
  assert.equal(retry2.attempts, 2);

  status = await getJob("resume-processing", job.id, userId);
  assert.equal(status?.status, "failed");
  assert.ok(status?.failedAt);
  assert.ok(status?.error?.includes("503"));
});

it("enforces rate limits per user per queue", async () => {
  const userId = "usr_flooder_999";

  // Simulate 15 allowed requests
  for (let i = 0; i < 15; i++) {
    const allowed = await checkRateLimit(userId, "resume-processing");
    assert.equal(allowed, true);
  }

  // 16th request must be rejected
  const allowed16th = await checkRateLimit(userId, "resume-processing");
  assert.equal(allowed16th, false);
});
