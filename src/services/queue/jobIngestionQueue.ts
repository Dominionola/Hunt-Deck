import { createHash } from "node:crypto";
import { Queue } from "bullmq";
import { redisConnectionOptions } from "./resumeQueue";
import { ingestionJobSchema, ingestionRequestSchema, type IngestionJob, type IngestionCounts } from "@/lib/validations/jobIngestion";
import { freehireIngestionJobSchema, type FreehireIngestionJob } from "@/lib/validations/freehire";

export const JOB_INGESTION_QUEUE = "job-ingestion-v1";
export type AnyJobIngestionPayload = IngestionJob | FreehireIngestionJob;

let queue: Queue<AnyJobIngestionPayload, IngestionCounts> | undefined;
export function getJobIngestionQueue() {
  if (!queue) {
    queue = new Queue<AnyJobIngestionPayload, IngestionCounts>(JOB_INGESTION_QUEUE, {
      connection: redisConnectionOptions(),
    });
    queue.on("error", () => {});
  }
  return queue;
}

export async function enqueueJobIngestion(input: IngestionJob, now = Date.now()) {
  const parsed = ingestionJobSchema.parse(input);
  if (parsed.scheduleId) throw new Error("Scheduled jobs require a schedule slot.");
  const { sources } = ingestionRequestSchema.parse({ sources: parsed.sources });
  const data = { userId: parsed.userId, sources };
  const jobId = createHash("sha256").update(JSON.stringify(data)).update(String(Math.floor(now / 600000))).digest("hex");
  return getJobIngestionQueue().add("ingest", data, {
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 30000 },
    keepLogs: 3,
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 86400, count: 100 },
  });
}

export async function enqueueFreehireIngestion(input: FreehireIngestionJob, now = Date.now()) {
  const data = freehireIngestionJobSchema.parse(input);
  const jobId = createHash("sha256")
    .update("freehire:")
    .update(JSON.stringify(data))
    .update(String(Math.floor(now / 600000)))
    .digest("hex");
  return getJobIngestionQueue().add("ingest-freehire", data, {
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 30000 },
    keepLogs: 3,
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 86400, count: 100 },
  });
}

export function scheduledIngestionJobId(scheduleId: string, dueAt: Date) {
  if (!Number.isFinite(dueAt.getTime())) throw new Error("Invalid schedule slot.");
  return createHash("sha256").update(JSON.stringify([scheduleId, dueAt.toISOString()])).digest("hex");
}

export async function enqueueScheduledIngestion(input: IngestionJob & { scheduleId: string }, dueAt: Date) {
  const parsed = ingestionJobSchema.parse(input);
  if (!parsed.scheduleId || parsed.sources.length !== 1 || !Number.isFinite(dueAt.getTime())) {
    throw new Error("Invalid schedule slot.");
  }
  const jobId = scheduledIngestionJobId(parsed.scheduleId, dueAt);
  return getJobIngestionQueue().add("ingest", parsed, {
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 30000 },
    keepLogs: 3,
    removeOnComplete: { age: 604800, count: 1000 },
    removeOnFail: { age: 604800, count: 1000 },
  });
}

export async function closeJobIngestionQueue() {
  const current = queue;
  queue = undefined;
  await current?.close();
}
