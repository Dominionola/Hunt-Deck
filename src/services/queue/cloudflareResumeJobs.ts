import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { RESUME_FAILURE_MESSAGES, type ResumeFailureCode } from "@/lib/resumeFailure";
import { resumeJobDataSchema, resumeJobIdSchema } from "@/lib/validations/resumeJob";

export type CloudflareResumeJobState = "queued" | "processing" | "completed" | "failed";

export type ResumeJobRecord = {
  id: string;
  owner_id: string;
  storage_key: string;
  state: CloudflareResumeJobState;
  attempts: number;
  max_attempts: number;
  progress: number;
  resume_id: string | null;
  failure_code: string | null;
  last_failure_code: string | null;
  dead_lettered_at: Date | null;
};

export type ClaimedResumeJob = ResumeJobRecord & { lease_token: string; lease_until: Date };

const UUID_V4_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

function normalizeFailureCode(code: string): ResumeFailureCode {
  return Object.hasOwn(RESUME_FAILURE_MESSAGES, code) ? (code as ResumeFailureCode) : "UNKNOWN";
}

function assertLeaseToken(token: string): void {
  if (!UUID_V4_RE.test(token)) throw new Error("Invalid lease token.");
}

/** Create one owner-scoped reference; a collision cannot overwrite an existing job. */
export async function createCloudflareResumeJob(id: string, ownerId: string, storageKey: string): Promise<ResumeJobRecord> {
  const jobId = resumeJobIdSchema.parse(id);
  const data = resumeJobDataSchema.parse({ userId: ownerId, storageKey });
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`INSERT INTO cloudflare_resume_jobs (id, owner_id, storage_key)
      VALUES (${jobId}, ${data.userId}, ${data.storageKey}) ON CONFLICT (id) DO NOTHING`;
    const rows = await tx.$queryRaw<ResumeJobRecord[]>`
      SELECT id, owner_id, storage_key, state, attempts, max_attempts, progress, resume_id, failure_code, last_failure_code, dead_lettered_at
      FROM cloudflare_resume_jobs WHERE id = ${jobId}`;
    if (rows.length !== 1 || rows[0].owner_id !== data.userId || rows[0].storage_key !== data.storageKey) {
      throw new Error("Job reference conflict.");
    }
    await tx.$executeRaw`INSERT INTO cloudflare_resume_outbox (job_id) VALUES (${jobId}) ON CONFLICT (job_id) DO NOTHING`;
    return rows[0];
  });
}

/** Explicitly requeue an owner's failed job, resetting bounded retry counters and outbox state. */
export async function retryFailedCloudflareResumeJob(id: string, ownerId: string, storageKey: string): Promise<ResumeJobRecord | null> {
  const jobId = resumeJobIdSchema.parse(id);
  const data = resumeJobDataSchema.parse({ userId: ownerId, storageKey });
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<ResumeJobRecord[]>`UPDATE cloudflare_resume_jobs
      SET state = 'queued', attempts = 0, progress = 0, failure_code = NULL, last_failure_code = NULL,
        dead_lettered_at = NULL, lease_token = NULL, lease_until = NULL, updated_at = clock_timestamp()
      WHERE id = ${jobId} AND owner_id = ${data.userId} AND storage_key = ${data.storageKey} AND state = 'failed'
      RETURNING id, owner_id, storage_key, state, attempts, max_attempts, progress, resume_id, failure_code, last_failure_code, dead_lettered_at`;
    if (!rows.length) return null;
    await tx.$executeRaw`INSERT INTO cloudflare_resume_outbox (job_id, published_at, publish_attempts, last_error_code, dead_lettered_at, lease_token, lease_until)
      VALUES (${jobId}, NULL, 0, NULL, NULL, NULL, NULL)
      ON CONFLICT (job_id) DO UPDATE SET published_at = NULL, publish_attempts = 0, last_error_code = NULL,
        dead_lettered_at = NULL, lease_token = NULL, lease_until = NULL`;
    return rows[0];
  });
}

/** Never look up an owner's job using a caller-supplied owner without server authentication. */
export async function getCloudflareResumeJobForOwner(id: string, ownerId: string): Promise<ResumeJobRecord | null> {
  const jobId = resumeJobIdSchema.parse(id);
  const rows = await db.$queryRaw<ResumeJobRecord[]>`
    SELECT id, owner_id, storage_key, state, attempts, max_attempts, progress, resume_id, failure_code, last_failure_code, dead_lettered_at
    FROM cloudflare_resume_jobs WHERE id = ${jobId} AND owner_id = ${ownerId}`;
  return rows[0] ?? null;
}

/** Read minimal state for queue settlement decisions; never expose to unauthenticated callers. */
export async function getCloudflareResumeJobState(id: string): Promise<Pick<ResumeJobRecord, "id" | "state" | "attempts" | "max_attempts"> | null> {
  const jobId = resumeJobIdSchema.parse(id);
  const rows = await db.$queryRaw<Pick<ResumeJobRecord, "id" | "state" | "attempts" | "max_attempts">[]>`
    SELECT id, state, attempts, max_attempts FROM cloudflare_resume_jobs WHERE id = ${jobId}`;
  return rows[0] ?? null;
}

/** Atomic claim permits recovery after a lease expires while enforcing max_attempts. */
export async function claimCloudflareResumeJob(id: string, leaseSeconds = 900): Promise<ClaimedResumeJob | null> {
  const jobId = resumeJobIdSchema.parse(id);
  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 900) throw new Error("Invalid lease duration.");
  const token = randomUUID();
  const rows = await db.$queryRaw<ClaimedResumeJob[]>`UPDATE cloudflare_resume_jobs
    SET state = 'processing', attempts = attempts + 1, lease_token = ${token}::uuid,
      lease_until = now() + (${leaseSeconds} * interval '1 second'), updated_at = now()
    WHERE id = ${jobId} AND attempts < max_attempts
      AND (state = 'queued' OR (state = 'processing' AND lease_until <= now()))
    RETURNING id, owner_id, storage_key, state, attempts, max_attempts, progress, resume_id, failure_code, last_failure_code, dead_lettered_at, lease_token, lease_until`;
  return rows[0] ?? null;
}

/** Update progress only while holding an active lease. */
export async function updateCloudflareResumeProgress(id: string, token: string, progress: number): Promise<boolean> {
  const jobId = resumeJobIdSchema.parse(id);
  assertLeaseToken(token);
  const bounded = Math.max(0, Math.min(100, Math.trunc(progress)));
  const count = await db.$executeRaw`UPDATE cloudflare_resume_jobs
    SET progress = ${bounded}, updated_at = clock_timestamp()
    WHERE id = ${jobId} AND state = 'processing' AND lease_token = ${token}::uuid AND lease_until > clock_timestamp()`;
  return count === 1;
}

/** Claim a pending outbox row without holding a database transaction during queue I/O. */
export async function claimCloudflareResumeOutbox(maxPublishAttempts = 5): Promise<{ jobId: string; token: string; publishAttempts: number } | null> {
  const token = randomUUID();
  const rows = await db.$queryRaw<{ job_id: string; publish_attempts: number }[]>`UPDATE cloudflare_resume_outbox SET
    lease_token = ${token}::uuid, lease_until = now() + interval '1 minute', publish_attempts = publish_attempts + 1
    WHERE job_id = (SELECT job_id FROM cloudflare_resume_outbox
      WHERE published_at IS NULL AND dead_lettered_at IS NULL AND publish_attempts < ${maxPublishAttempts}
        AND (lease_until IS NULL OR lease_until <= now())
      ORDER BY created_at, job_id FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING job_id, publish_attempts`;
  return rows.length ? { jobId: rows[0].job_id, token, publishAttempts: rows[0].publish_attempts } : null;
}

/** An ambiguous publish can be delivered twice; the consumer must be idempotent. */
export async function publishCloudflareResumeOutbox(
  send: (message: { version: 1; kind: "resume"; jobId: string }) => Promise<unknown>,
  maxPublishAttempts = 5,
): Promise<"empty" | "published" | "lease_lost"> {
  const claim = await claimCloudflareResumeOutbox(maxPublishAttempts);
  if (!claim) return "empty";
  try {
    await send({ version: 1, kind: "resume", jobId: claim.jobId });
  } catch {
    await db.$executeRaw`UPDATE cloudflare_resume_outbox
      SET last_error_code = 'QUEUE_PUBLISH_FAILED',
        dead_lettered_at = CASE WHEN publish_attempts >= ${maxPublishAttempts} THEN clock_timestamp() ELSE dead_lettered_at END,
        lease_token = NULL, lease_until = NULL
      WHERE job_id = ${claim.jobId} AND published_at IS NULL AND lease_token = ${claim.token}::uuid`;
    throw new Error("Unable to publish resume job to Cloudflare queue.");
  }
  const count = await db.$executeRaw`UPDATE cloudflare_resume_outbox SET published_at = now(), last_error_code = NULL, lease_token = NULL, lease_until = NULL
    WHERE job_id = ${claim.jobId} AND published_at IS NULL AND lease_token = ${claim.token}::uuid AND lease_until > now()`;
  return count === 1 ? "published" : "lease_lost";
}

/** Persist database writes only: the callback can roll back and must not call external services. */
export async function completeCloudflareResumeJob(
  id: string,
  token: string,
  persist: (tx: Prisma.TransactionClient, ownerId: string) => Promise<void>,
): Promise<boolean> {
  const jobId = resumeJobIdSchema.parse(id);
  assertLeaseToken(token);
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ owner_id: string }[]>`SELECT owner_id FROM cloudflare_resume_jobs
      WHERE id = ${jobId} AND state = 'processing' AND lease_token = ${token}::uuid AND lease_until > now() FOR UPDATE`;
    if (!rows.length) return false;
    await persist(tx, rows[0].owner_id);
    const count = await tx.$executeRaw`UPDATE cloudflare_resume_jobs SET state = 'completed', progress = 100,
      resume_id = ${`resume_${jobId}`}, failure_code = NULL, dead_lettered_at = NULL,
      lease_token = NULL, lease_until = NULL, updated_at = clock_timestamp()
      WHERE id = ${jobId} AND state = 'processing' AND lease_token = ${token}::uuid AND lease_until > clock_timestamp()`;
    if (count !== 1) throw new Error("Job lease expired.");
    return true;
  });
}

/** Record a retryable requeue or permanent/exhausted failure, fenced on the active lease. */
export async function failCloudflareResumeJob(
  id: string,
  token: string,
  failure: { code: ResumeFailureCode; retryable: boolean },
): Promise<"retry" | "failed" | "stale"> {
  const jobId = resumeJobIdSchema.parse(id);
  assertLeaseToken(token);
  const safeCode = normalizeFailureCode(failure.code);
  const rows = await db.$queryRaw<{ state: CloudflareResumeJobState }[]>`UPDATE cloudflare_resume_jobs
    SET state = CASE WHEN ${failure.retryable} AND attempts < max_attempts THEN 'queued' ELSE 'failed' END,
      failure_code = CASE WHEN ${failure.retryable} AND attempts < max_attempts THEN NULL ELSE ${safeCode} END,
      last_failure_code = ${safeCode},
      dead_lettered_at = CASE WHEN ${failure.retryable} AND attempts < max_attempts THEN NULL ELSE clock_timestamp() END,
      lease_token = NULL, lease_until = NULL, updated_at = clock_timestamp()
    WHERE id = ${jobId} AND state = 'processing' AND lease_token = ${token}::uuid AND lease_until > clock_timestamp()
    RETURNING state`;
  if (!rows.length) return "stale";
  return rows[0].state === "queued" ? "retry" : "failed";
}

/** Mark an exhausted or dead-lettered job failed without overwriting completed work. */
export async function deadLetterCloudflareResumeJob(id: string, fallbackCode: ResumeFailureCode = "TEMPORARILY_UNAVAILABLE"): Promise<boolean> {
  const jobId = resumeJobIdSchema.parse(id);
  const safeCode = normalizeFailureCode(fallbackCode);
  const count = await db.$executeRaw`UPDATE cloudflare_resume_jobs
    SET state = 'failed',
      failure_code = COALESCE(last_failure_code, ${safeCode}),
      last_failure_code = COALESCE(last_failure_code, ${safeCode}),
      dead_lettered_at = COALESCE(dead_lettered_at, clock_timestamp()),
      lease_token = NULL, lease_until = NULL, updated_at = clock_timestamp()
    WHERE id = ${jobId} AND state IN ('queued', 'processing')`;
  return count === 1;
}
