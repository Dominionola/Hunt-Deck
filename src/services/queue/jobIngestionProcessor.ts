import { UnrecoverableError, Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { ingestionCheckpointSchema, ingestionJobSchema, type IngestionJob, type IngestionCounts, type IngestionSource } from "@/lib/validations/jobIngestion";
import { freehireIngestionJobSchema, type FreehireIngestionJob } from "@/lib/validations/freehire";
import { fetchPublicBoard, BoardRequestError } from "@/services/jobs/adapters/publicBoard";
import { fetchFreehireJobs } from "@/services/jobs/adapters/freehireAdapter";
import { persistIngestedJob } from "@/services/jobs/persistJob";
import { isTransientResumeError } from "./resumeProcessor";
import { redisConnectionOptions } from "./resumeQueue";
import { JOB_INGESTION_QUEUE, closeJobIngestionQueue, type AnyJobIngestionPayload } from "./jobIngestionQueue";
import { processObservedJobIngestion } from "./observedJobIngestion";
import { isScheduledSourceApproved, dispatchApprovedSources } from "@/services/jobs/approvedSources";

interface Dependencies {
  fetchBoard: typeof fetchPublicBoard;
  persist: typeof persistIngestedJob;
  allowSource: (source: IngestionSource) => Promise<boolean>;
  authorized: (userId: string) => Promise<boolean>;
}

interface FreehireDependencies {
  fetchFreehire: typeof fetchFreehireJobs;
  persist: typeof persistIngestedJob;
  allowQuery: (data: FreehireIngestionJob) => Promise<boolean>;
  authorized: (userId: string) => Promise<boolean>;
}

export async function processFreehireIngestion(
  job: Job<FreehireIngestionJob, IngestionCounts>,
  deps: FreehireDependencies
): Promise<IngestionCounts> {
  try {
    const data = freehireIngestionJobSchema.parse(job.data);
    if (!(await deps.authorized(data.userId))) {
      throw new UnrecoverableError("Ingestion authorization unavailable.");
    }
    if (!(await deps.allowQuery(data))) {
      throw new BoardRequestError(true);
    }

    const result: IngestionCounts = {
      fetched: 0,
      selected: 0,
      saved: 0,
      failed: 0,
      embedded: 0,
      sourcesFailed: 0,
      incompleteSources: 0,
    };

    const batch = await deps.fetchFreehire({
      query: data.query,
      workMode: data.workMode,
      sourceFilter: data.sourceFilter,
      limit: data.limit,
    });

    result.fetched = batch.fetched;
    result.selected = batch.selected;
    result.failed = batch.invalid;

    const total = Math.max(1, batch.jobs.length);
    for (let i = 0; i < batch.jobs.length; i++) {
      const posting = batch.jobs[i];
      try {
        const saved = await deps.persist(posting);
        result.saved++;
        if (saved.embedded) result.embedded++;
      } catch (error) {
        if (isTransientResumeError(error)) throw error;
        result.failed++;
      }
      const pct = Math.min(99, Math.floor(((i + 1) / total) * 100));
      await job.updateProgress(pct).catch(() => {});
    }

    await job.log(JSON.stringify(result));
    await job.updateProgress(100);
    return result;
  } catch (error) {
    if (error instanceof UnrecoverableError) {
      throw new UnrecoverableError("Ingestion authorization unavailable.");
    }
    if ((error instanceof BoardRequestError && error.transient) || isTransientResumeError(error)) {
      throw new Error("Job ingestion temporarily unavailable.");
    }
    throw new UnrecoverableError("Job ingestion failed.");
  }
}

export async function processJobIngestion(job: Job<IngestionJob, IngestionCounts>, deps: Dependencies): Promise<IngestionCounts> {
  try {
    const data = ingestionJobSchema.parse(job.data);
    if (!await deps.authorized(data.userId)) throw new UnrecoverableError("Ingestion authorization unavailable.");
    if (data.scheduleId && !await isScheduledSourceApproved(data)) throw new UnrecoverableError("Ingestion authorization unavailable.");
    const empty: IngestionCounts = { fetched: 0, selected: 0, saved: 0, failed: 0, embedded: 0, sourcesFailed: 0, incompleteSources: 0 };
    const checkpoint = typeof job.progress === "object" && job.progress !== null ? ingestionCheckpointSchema.parse(job.progress) : null;
    if (checkpoint && (checkpoint.sourceIndex > data.sources.length || (checkpoint.sourceIndex === data.sources.length && checkpoint.offset !== 0))) throw new Error("Invalid checkpoint.");
    const result: IngestionCounts = checkpoint?.counts ?? empty;
    const saveCheckpoint = async (sourceIndex: number, offset: number) => {
      try { await job.updateProgress({ version: 1, sourceIndex, offset, counts: result,
        progress: Math.min(99, Math.floor(sourceIndex / data.sources.length * 100)) }); }
      catch { throw new BoardRequestError(true); }
    };
    for (let index = checkpoint?.sourceIndex ?? 0; index < data.sources.length; index++) {
      const source = data.sources[index];
      let offset = index === checkpoint?.sourceIndex ? checkpoint.offset : 0;
      try {
        if (!await deps.allowSource(source)) throw new BoardRequestError(true);
        for (;;) {
          const board = await deps.fetchBoard(source, undefined, offset);
          const batch = { fetched: board.fetched, selected: board.selected, saved: 0, failed: board.invalid, embedded: 0 };
          for (const posting of board.jobs) {
            try { const saved = await deps.persist(posting); batch.saved++; if (saved.embedded) batch.embedded++; }
            catch (error) { if (isTransientResumeError(error)) throw error; batch.failed++; }
          }
          result.fetched += batch.fetched; result.selected += batch.selected; result.saved += batch.saved;
          result.failed += batch.failed; result.embedded += batch.embedded;
          if (board.incomplete && (board.nextOffset === null || board.nextOffset >= 1000)) {
            result.incompleteSources = (result.incompleteSources ?? 0) + 1;
          }
          if (!board.incomplete || board.nextOffset === null || board.nextOffset >= 1000) {
            await saveCheckpoint(index + 1, 0); break;
          }
          if (board.nextOffset !== offset + 200) throw new Error("Invalid source continuation.");
          offset = board.nextOffset;
          await saveCheckpoint(index, offset);
        }
      } catch (error) {
        if ((error instanceof BoardRequestError && error.transient) || isTransientResumeError(error)) {
          await job.log(JSON.stringify({ ...result, sourcesFailed: result.sourcesFailed + 1 }));
          throw new Error("Job ingestion temporarily unavailable.");
        }
        result.sourcesFailed++;
        await saveCheckpoint(index + 1, 0);
      }
    }
    await job.log(JSON.stringify(result));
    await job.updateProgress(100);
    return result;
  } catch (error) {
    // BullMQ persists errors/stacks: never attach provider bodies, job text or tokens.
    if (error instanceof UnrecoverableError) throw new UnrecoverableError("Ingestion authorization unavailable.");
    if (error instanceof Error && error.message === "Job ingestion temporarily unavailable.") throw new Error("Job ingestion temporarily unavailable.");
    throw new UnrecoverableError("Job ingestion failed.");
  }
}

export function startJobIngestionWorker() {
  const limiter = new Redis(redisConnectionOptions(true)); limiter.on("error", () => {});
  const processIngestion = process.env.JOB_SOURCE_OBSERVATIONS_ENABLED === "1" ? processObservedJobIngestion : processJobIngestion;
  const isAdmin = async (userId: string) =>
    (await db.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role === "ADMIN";

  const worker = new Worker<AnyJobIngestionPayload, IngestionCounts>(
    JOB_INGESTION_QUEUE,
    (job) => {
      if (job.name === "ingest-freehire") {
        return processFreehireIngestion(job as Job<FreehireIngestionJob, IngestionCounts>, {
          fetchFreehire: fetchFreehireJobs,
          persist: persistIngestedJob,
          allowQuery: async (data) => {
            const hash = createHash("sha256")
              .update(`${data.query}:${data.workMode}:${data.sourceFilter}`)
              .digest("hex");
            return (await limiter.set(`huntdeck:freehire-import:${hash}`, "1", "PX", 30000, "NX")) === "OK";
          },
          authorized: isAdmin,
        });
      }
      return processIngestion(job as Job<IngestionJob, IngestionCounts>, {
        fetchBoard: fetchPublicBoard,
        persist: persistIngestedJob,
        allowSource: async (source) => {
          const hash = createHash("sha256").update(`${source.platform}:${source.board}`).digest("hex");
          return await limiter.set(`huntdeck:job-source:${hash}`, "1", "PX", 30000, "NX") === "OK";
        },
        authorized: isAdmin,
      });
    },
    { connection: redisConnectionOptions(true), concurrency: 1, limiter: { max: 1, duration: 30000 } }
  );

  let scheduleTask: Promise<void> | undefined;
  const timer = process.env.JOB_SOURCE_SCHEDULER_ENABLED === "1" ? setInterval(() => {
    if (scheduleTask) return;
    scheduleTask = dispatchApprovedSources().then((result) => {
      if (result.dispatched || result.failed) console.info(JSON.stringify({ event: "source_schedule_tick", ...result }));
    }).catch(() => { console.error(JSON.stringify({ event: "source_schedule_unavailable" })); }).finally(() => { scheduleTask = undefined; });
  }, 60000) : undefined;
  if (timer) console.info(JSON.stringify({ event: "source_scheduler_started" }));
  timer?.unref();
  return { worker, close: async () => { if (timer) clearInterval(timer); await scheduleTask; await worker.close(); if (timer) await closeJobIngestionQueue(); limiter.disconnect(); } };
}
