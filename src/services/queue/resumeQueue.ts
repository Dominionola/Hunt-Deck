import { createHash, randomUUID } from "crypto";
import { Queue, type JobsOptions } from "bullmq";
import Redis from "ioredis";
import { resumeJobDataSchema, resumeJobIdSchema } from "@/lib/validations/resumeJob";

export const RESUME_QUEUE = "resume-processing-v2";
export interface ResumeJobData { userId: string; storageKey: string }
export interface ResumeJobResult { resumeId: string }
export const RESUME_JOB_OPTIONS: JobsOptions = {
  attempts: 3, backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: { age: 24 * 60 * 60 }, removeOnFail: { age: 24 * 60 * 60 },
};

export function resumeJobId(userId: string, bytes: Uint8Array): string {
  return createHash("sha256").update(userId).update("\0").update(bytes).digest("hex");
}

export function redisConnectionOptions(worker = false) {
  if (!process.env.REDIS_URL) throw new Error("Resume queue is not configured.");
  const url = new URL(process.env.REDIS_URL);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") throw new Error("Invalid Redis URL.");
  const db = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0;
  if (!Number.isInteger(db) || db < 0) throw new Error("Invalid Redis database.");
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db,
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: worker ? null : 1,
    ...(worker ? {} : { enableOfflineQueue: false, connectTimeout: 5000 }),
  };
}

let queue: Queue<ResumeJobData, ResumeJobResult> | undefined;
let limiter: Redis | undefined;
export function getResumeQueue() {
  if (!queue) {
    queue = new Queue<ResumeJobData, ResumeJobResult>(RESUME_QUEUE, { connection: redisConnectionOptions() });
    queue.on("error", () => {});
  }
  return queue;
}

export async function enforceResumeRateLimit(userId: string): Promise<boolean> {
  if (!limiter || limiter.status === "end") {
    limiter = new Redis({ ...redisConnectionOptions(), lazyConnect: true, retryStrategy: () => null });
    limiter.on("error", () => {});
  }
  if (limiter.status === "wait") await limiter.connect();
  const redis = limiter;
  const key = `huntdeck:resume-rate:${createHash("sha256").update(userId).digest("hex")}`;
  const allowed = await redis.eval("local t = redis.call('TIME'); local now = t[1] * 1000 + math.floor(t[2] / 1000); redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - 60000); if redis.call('ZCARD', KEYS[1]) >= 15 then return 0 end; redis.call('ZADD', KEYS[1], now, ARGV[1]); redis.call('EXPIRE', KEYS[1], 65); return 1", 1, key, randomUUID());
  return allowed === 1;
}

export async function enqueueResume(data: ResumeJobData, id: string) {
  const references = resumeJobDataSchema.parse(data);
  return getResumeQueue().add("process", references, {
    ...RESUME_JOB_OPTIONS, jobId: resumeJobIdSchema.parse(id),
  });
}

export async function getOwnedResumeJob(id: string, userId: string) {
  const job = await getResumeQueue().getJob(id);
  if (!job) return null;
  assertResumeJobOwner(job.data.userId, userId);
  return job;
}

export function assertResumeJobOwner(ownerId: string, userId: string) {
  if (!ownerId || ownerId !== userId) throw new Error("Forbidden");
}

export async function closeResumeQueueConnections() {
  const activeQueue = queue;
  const activeLimiter = limiter;
  queue = undefined;
  limiter = undefined;
  await activeQueue?.close();
  activeLimiter?.disconnect();
}
