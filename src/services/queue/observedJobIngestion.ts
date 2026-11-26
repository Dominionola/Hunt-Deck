import { UnrecoverableError, type Job } from "bullmq";
import { ingestionCheckpointSchema, ingestionJobSchema, type IngestionCounts, type IngestionJob, type IngestionSource } from "@/lib/validations/jobIngestion";
import { BoardRequestError, type fetchPublicBoard } from "@/services/jobs/adapters/publicBoard";
import type { persistIngestedJob } from "@/services/jobs/persistJob";
import { beginSourceObservation, getSourceObservation, recordSourceObservation, reconcileVerifiedSource } from "@/services/jobs/sourceObservations";
import { isTransientResumeError } from "./resumeProcessor";
import { isScheduledSourceApproved } from "@/services/jobs/approvedSources";

type Observation = { runId: string; generation: number };
interface Dependencies {
  fetchBoard: typeof fetchPublicBoard;
  persist: typeof persistIngestedJob;
  allowSource: (source: IngestionSource) => Promise<boolean>;
  authorized: (userId: string) => Promise<boolean>;
  observations?: { begin: typeof beginSourceObservation; get: typeof getSourceObservation; record: typeof recordSourceObservation };
}

/** Opt-in until the additive schema and its recovery are rehearsed on the target. */
export async function processObservedJobIngestion(job: Job<IngestionJob, IngestionCounts>, deps: Dependencies): Promise<IngestionCounts> {
  try {
    const data = ingestionJobSchema.parse(job.data);
    if (!await deps.authorized(data.userId)) throw new UnrecoverableError("Ingestion authorization unavailable.");
    if (data.scheduleId && !await isScheduledSourceApproved(data)) throw new UnrecoverableError("Ingestion authorization unavailable.");
    const checkpoint = typeof job.progress === "object" && job.progress !== null ? ingestionCheckpointSchema.parse(job.progress) : null;
    if (checkpoint && (checkpoint.sourceIndex > data.sources.length || (checkpoint.sourceIndex === data.sources.length && checkpoint.observation))) throw new Error("Invalid checkpoint.");
    const counts: IngestionCounts = checkpoint?.counts ?? { fetched: 0, selected: 0, saved: 0, failed: 0, embedded: 0, sourcesFailed: 0, incompleteSources: 0 };
    const observations = deps.observations ?? { begin: beginSourceObservation, get: getSourceObservation, record: recordSourceObservation };
    const save = async (index: number, offset: number, observation?: Observation) => {
      try { await job.updateProgress({ version: 1, sourceIndex: index, offset, counts,
        progress: Math.min(99, Math.floor(index / data.sources.length * 100)), ...(observation ? { observation } : {}) }); }
      catch { throw new BoardRequestError(true); }
    };
    for (let index = checkpoint?.sourceIndex ?? 0; index < data.sources.length; index++) {
      const source = data.sources[index];
      try {
        if (!await deps.allowSource(source)) throw new BoardRequestError(true);
        let observation = index === checkpoint?.sourceIndex ? checkpoint.observation : undefined;
        if (!observation) { observation = await observations.begin(source); await save(index, 0, observation); }
        for (;;) {
          // PostgreSQL is authoritative: its batch commit can precede Redis progress.
          const state = await observations.get(observation);
          if (state.state === "verified") {
            if (process.env.JOB_SOURCE_CLOSURE_ENABLED === "1") await reconcileVerifiedSource(observation);
            await save(index + 1, 0); break;
          }
          if (state.state === "rejected") { counts.incompleteSources = (counts.incompleteSources ?? 0) + 1; await save(index + 1, 0); break; }
          if (state.state !== "collecting" && state.state !== "verifying") throw new Error("Invalid source state.");
          const board = await deps.fetchBoard(source, undefined, state.nextOffset);
          const collecting = state.state === "collecting";
          let invalid = board.invalid;
          const entries: { externalId: string; jobId?: string }[] = [];
          let saved = 0; let embedded = 0;
          for (const posting of board.jobs) {
            if (!posting.externalJobId) { invalid++; continue; }
            if (!collecting) { entries.push({ externalId: posting.externalJobId }); continue; }
            try { const result = await deps.persist(posting); entries.push({ externalId: posting.externalJobId, jobId: result.id }); saved++; if (result.embedded) embedded++; }
            catch (error) { if (isTransientResumeError(error)) throw error; invalid++; }
          }
          await observations.record({ ...observation, offset: state.nextOffset, terminal: !board.incomplete,
            invalidCount: Math.min(200, invalid), entries });
          if (collecting) { counts.fetched += board.fetched; counts.selected += board.selected; counts.saved += saved; counts.failed += invalid; counts.embedded += embedded; }
          await save(index, state.nextOffset, observation);
        }
      } catch (error) {
        if ((error instanceof BoardRequestError && error.transient) || isTransientResumeError(error)) {
          await job.log(JSON.stringify({ ...counts, sourcesFailed: counts.sourcesFailed + 1 }));
          throw new Error("Job ingestion temporarily unavailable.");
        }
        counts.sourcesFailed++; await save(index + 1, 0);
      }
    }
    await job.log(JSON.stringify(counts)); await job.updateProgress(100); return counts;
  } catch (error) {
    if (error instanceof UnrecoverableError) throw new UnrecoverableError("Ingestion authorization unavailable.");
    if (error instanceof Error && error.message === "Job ingestion temporarily unavailable.") throw new Error("Job ingestion temporarily unavailable.");
    throw new UnrecoverableError("Job ingestion failed.");
  }
}
