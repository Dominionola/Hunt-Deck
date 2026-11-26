import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  ingestionCheckpointSchema,
  ingestionJobSchema,
  type IngestionCounts,
  type IngestionSource,
} from "@/lib/validations/jobIngestion";
import { resumeJobIdSchema } from "@/lib/validations/resumeJob";

export type IngestionCheckpoint = z.infer<typeof ingestionCheckpointSchema>;

export type CloudflareJobIngestionState = "queued" | "processing" | "completed" | "failed";

export type JobIngestionJobRecord = {
  id: string;
  owner_id: string;
  sources: IngestionSource[];
  schedule_id: string | null;
  state: CloudflareJobIngestionState;
  attempts: number;
  max_attempts: number;
  progress: number;
  checkpoint: IngestionCheckpoint | null;
  counts: IngestionCounts | null;
  failure_code: string | null;
  last_failure_code: string | null;
  dead_lettered_at: Date | null;
};

export type ClaimedJobIngestionJob = JobIngestionJobRecord & { lease_token: string; lease_until: Date };

const UUID_V4_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ALLOWED_FAILURE_CODES = new Set(["UNAUTHORIZED", "SOURCE_FAILED", "TRANSIENT_UNAVAILABLE", "INGESTION_FAILED"]);

function assertLeaseToken(token: string): void {
  if (!UUID_V4_RE.test(token)) throw new Error("Invalid lease token.");
}

function normalizeFailureCode(code: string): string {
  return ALLOWED_FAILURE_CODES.has(code) ? code : "INGESTION_FAILED";
}

/** Create one owner-scoped ingestion job and outbox row atomically. */
export async function createCloudflareJobIngestionJob(
  id: string,
  ownerId: string,
  sources: IngestionSource[],
  scheduleId?: string,
): Promise<JobIngestionJobRecord> {
  const jobId = resumeJobIdSchema.parse(id);
  const validated = ingestionJobSchema.parse({ userId: ownerId, sources, ...(scheduleId ? { scheduleId } : {}) });
  const sourcesJson = JSON.stringify(validated.sources);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`INSERT INTO cloudflare_job_ingestion_jobs (id, owner_id, sources, schedule_id)
      VALUES (${jobId}, ${validated.userId}, ${sourcesJson}::jsonb, ${validated.scheduleId ?? null})
      ON CONFLICT (id) DO NOTHING`;
    const rows = await tx.$queryRaw<JobIngestionJobRecord[]>`
      SELECT id, owner_id, sources, schedule_id, state, attempts, max_attempts, progress, checkpoint, counts, failure_code, last_failure_code, dead_lettered_at
      FROM cloudflare_job_ingestion_jobs WHERE id = ${jobId}`;
    if (rows.length !== 1 || rows[0].owner_id !== validated.userId) {
      throw new Error("Job reference conflict.");
    }
    await tx.$executeRaw`INSERT INTO cloudflare_job_ingestion_outbox (job_id) VALUES (${jobId}) ON CONFLICT (job_id) DO NOTHING`;
    return rows[0];
  });
}

export async function getCloudflareJobIngestionJobForOwner(id: string, ownerId: string): Promise<JobIngestionJobRecord | null> {
  const jobId = resumeJobIdSchema.parse(id);
  const rows = await db.$queryRaw<JobIngestionJobRecord[]>`
    SELECT id, owner_id, sources, schedule_id, state, attempts, max_attempts, progress, checkpoint, counts, failure_code, last_failure_code, dead_lettered_at
    FROM cloudflare_job_ingestion_jobs WHERE id = ${jobId} AND owner_id = ${ownerId}`;
  return rows[0] ?? null;
}

export async function getCloudflareJobIngestionState(id: string): Promise<Pick<JobIngestionJobRecord, "id" | "state" | "attempts" | "max_attempts"> | null> {
  const jobId = resumeJobIdSchema.parse(id);
  const rows = await db.$queryRaw<Pick<JobIngestionJobRecord, "id" | "state" | "attempts" | "max_attempts">[]>`
    SELECT id, state, attempts, max_attempts FROM cloudflare_job_ingestion_jobs WHERE id = ${jobId}`;
  return rows[0] ?? null;
}

export async function claimCloudflareJobIngestionJob(id: string, leaseSeconds = 900): Promise<ClaimedJobIngestionJob | null> {
  const jobId = resumeJobIdSchema.parse(id);
  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 900) throw new Error("Invalid lease duration.");
  const token = randomUUID();
  const rows = await db.$queryRaw<ClaimedJobIngestionJob[]>`UPDATE cloudflare_job_ingestion_jobs
    SET state = 'processing', attempts = attempts + 1, lease_token = ${token}::uuid,
      lease_until = now() + (${leaseSeconds} * interval '1 second'), updated_at = now()
    WHERE id = ${jobId} AND attempts < max_attempts
      AND (state = 'queued' OR (state = 'processing' AND lease_until <= now()))
    RETURNING id, owner_id, sources, schedule_id, state, attempts, max_attempts, progress, checkpoint, counts, failure_code, last_failure_code, dead_lettered_at, lease_token, lease_until`;
  return rows[0] ?? null;
}

export async function updateCloudflareJobIngestionCheckpoint(id: string, token: string, checkpoint: IngestionCheckpoint): Promise<boolean> {
  const jobId = resumeJobIdSchema.parse(id);
  assertLeaseToken(token);
  const validated = ingestionCheckpointSchema.parse(checkpoint);
  const count = await db.$executeRaw`UPDATE cloudflare_job_ingestion_jobs
    SET checkpoint = ${JSON.stringify(validated)}::jsonb,
      progress = ${validated.progress},
      updated_at = clock_timestamp()
    WHERE id = ${jobId} AND state = 'processing' AND lease_token = ${token}::uuid AND lease_until > clock_timestamp()`;
  return count === 1;
}

export async function completeCloudflareJobIngestionJob(id: string, token: string, counts: IngestionCounts): Promise<boolean> {
  const jobId = resumeJobIdSchema.parse(id);
  assertLeaseToken(token);
  const count = await db.$executeRaw`UPDATE cloudflare_job_ingestion_jobs
    SET state = 'completed', progress = 100, counts = ${JSON.stringify(counts)}::jsonb,
      failure_code = NULL, dead_lettered_at = NULL, lease_token = NULL, lease_until = NULL, updated_at = clock_timestamp()
    WHERE id = ${jobId} AND state = 'processing' AND lease_token = ${token}::uuid AND lease_until > clock_timestamp()`;
  return count === 1;
}

export async function failCloudflareJobIngestionJob(
  id: string,
  token: string,
  failure: { code: string; retryable: boolean },
): Promise<"retry" | "failed" | "stale"> {
  const jobId = resumeJobIdSchema.parse(id);
  assertLeaseToken(token);
  const safeCode = normalizeFailureCode(failure.code);
  const rows = await db.$queryRaw<{ state: CloudflareJobIngestionState }[]>`UPDATE cloudflare_job_ingestion_jobs
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

export async function deadLetterCloudflareJobIngestionJob(id: string, fallbackCode = "TRANSIENT_UNAVAILABLE"): Promise<boolean> {
  const jobId = resumeJobIdSchema.parse(id);
  const safeCode = normalizeFailureCode(fallbackCode);
  const count = await db.$executeRaw`UPDATE cloudflare_job_ingestion_jobs
    SET state = 'failed',
      failure_code = COALESCE(last_failure_code, ${safeCode}),
      last_failure_code = COALESCE(last_failure_code, ${safeCode}),
      dead_lettered_at = COALESCE(dead_lettered_at, clock_timestamp()),
      lease_token = NULL, lease_until = NULL, updated_at = clock_timestamp()
    WHERE id = ${jobId} AND state IN ('queued', 'processing')`;
  return count === 1;
}

export async function publishCloudflareJobIngestionOutbox(
  send: (message: { version: 1; kind: "job_ingestion"; jobId: string }) => Promise<unknown>,
  maxPublishAttempts = 5,
): Promise<"empty" | "published" | "lease_lost"> {
  const token = randomUUID();
  const rows = await db.$queryRaw<{ job_id: string }[]>`UPDATE cloudflare_job_ingestion_outbox SET
    lease_token = ${token}::uuid, lease_until = now() + interval '1 minute', publish_attempts = publish_attempts + 1
    WHERE job_id = (SELECT job_id FROM cloudflare_job_ingestion_outbox
      WHERE published_at IS NULL AND dead_lettered_at IS NULL AND publish_attempts < ${maxPublishAttempts}
        AND (lease_until IS NULL OR lease_until <= now())
      ORDER BY created_at, job_id FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING job_id`;
  if (!rows.length) return "empty";
  const jobId = rows[0].job_id;
  try {
    await send({ version: 1, kind: "job_ingestion", jobId });
  } catch {
    await db.$executeRaw`UPDATE cloudflare_job_ingestion_outbox
      SET last_error_code = 'QUEUE_PUBLISH_FAILED',
        dead_lettered_at = CASE WHEN publish_attempts >= ${maxPublishAttempts} THEN clock_timestamp() ELSE dead_lettered_at END,
        lease_token = NULL, lease_until = NULL
      WHERE job_id = ${jobId} AND published_at IS NULL AND lease_token = ${token}::uuid`;
    throw new Error("Unable to publish job ingestion task to Cloudflare queue.");
  }
  const count = await db.$executeRaw`UPDATE cloudflare_job_ingestion_outbox SET published_at = now(), last_error_code = NULL, lease_token = NULL, lease_until = NULL
    WHERE job_id = ${jobId} AND published_at IS NULL AND lease_token = ${token}::uuid AND lease_until > now()`;
  return count === 1 ? "published" : "lease_lost";
}
