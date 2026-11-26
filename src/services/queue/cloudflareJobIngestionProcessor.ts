import { db } from "@/lib/db";
import {
  ingestionCheckpointSchema,
  ingestionJobSchema,
  type IngestionCounts,
  type IngestionSource,
} from "@/lib/validations/jobIngestion";
import { fetchPublicBoard, BoardRequestError } from "@/services/jobs/adapters/publicBoard";
import { persistIngestedJob } from "@/services/jobs/persistJob";
import { isScheduledSourceApproved } from "@/services/jobs/approvedSources";
import type { CloudflareJobReference } from "./cloudflareBatch";
import { isTransientResumeError } from "./resumeProcessor";
import {
  claimCloudflareJobIngestionJob,
  completeCloudflareJobIngestionJob,
  deadLetterCloudflareJobIngestionJob,
  failCloudflareJobIngestionJob,
  getCloudflareJobIngestionState,
  updateCloudflareJobIngestionCheckpoint,
} from "./cloudflareJobIngestionJobs";

export interface CloudflareJobIngestionDeps {
  fetchBoard: typeof fetchPublicBoard;
  persist: typeof persistIngestedJob;
  allowSource: (source: IngestionSource) => Promise<boolean>;
  authorized: (userId: string) => Promise<boolean>;
  leaseSeconds?: number;
}

const defaultDeps: CloudflareJobIngestionDeps = {
  fetchBoard: fetchPublicBoard,
  persist: persistIngestedJob,
  allowSource: async () => true,
  authorized: async (userId: string) =>
    (await db.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role === "ADMIN",
};

/** Process one Cloudflare Queue job_ingestion reference with admin checks, checkpoints, and bounded retries. */
export async function processCloudflareJobIngestionMessage(
  reference: CloudflareJobReference,
  deps: CloudflareJobIngestionDeps = defaultDeps,
): Promise<"settled" | "retry"> {
  if (reference.kind !== "job_ingestion") return "retry";

  const claimed = await claimCloudflareJobIngestionJob(reference.jobId, deps.leaseSeconds ?? 900);
  if (!claimed) {
    const current = await getCloudflareJobIngestionState(reference.jobId);
    if (current && (current.state === "completed" || current.state === "failed")) return "settled";
    if (current && current.state === "queued" && current.attempts >= current.max_attempts) {
      await deadLetterCloudflareJobIngestionJob(reference.jobId);
      return "settled";
    }
    return "retry";
  }

  try {
    const data = ingestionJobSchema.parse({
      userId: claimed.owner_id,
      sources: claimed.sources,
      ...(claimed.schedule_id ? { scheduleId: claimed.schedule_id } : {}),
    });

    if (!await deps.authorized(data.userId)) {
      await failCloudflareJobIngestionJob(claimed.id, claimed.lease_token, { code: "UNAUTHORIZED", retryable: false });
      return "settled";
    }
    if (data.scheduleId && !await isScheduledSourceApproved(data)) {
      await failCloudflareJobIngestionJob(claimed.id, claimed.lease_token, { code: "UNAUTHORIZED", retryable: false });
      return "settled";
    }

    const checkpoint = claimed.checkpoint ? ingestionCheckpointSchema.parse(claimed.checkpoint) : null;
    if (
      checkpoint &&
      (checkpoint.sourceIndex > data.sources.length ||
        (checkpoint.sourceIndex === data.sources.length && checkpoint.offset !== 0))
    ) {
      throw new Error("Invalid checkpoint.");
    }

    const result: IngestionCounts = checkpoint?.counts ?? {
      fetched: 0,
      selected: 0,
      saved: 0,
      failed: 0,
      embedded: 0,
      sourcesFailed: 0,
      incompleteSources: 0,
    };

    const saveCheckpoint = async (sourceIndex: number, offset: number) => {
      const ok = await updateCloudflareJobIngestionCheckpoint(claimed.id, claimed.lease_token, {
        version: 1,
        sourceIndex,
        offset,
        counts: result,
        progress: Math.min(99, Math.floor((sourceIndex / data.sources.length) * 100)),
      });
      if (!ok) throw new BoardRequestError(true);
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
            try {
              const saved = await deps.persist(posting);
              batch.saved++;
              if (saved.embedded) batch.embedded++;
            } catch (error) {
              if (isTransientResumeError(error)) throw error;
              batch.failed++;
            }
          }
          result.fetched += batch.fetched;
          result.selected += batch.selected;
          result.saved += batch.saved;
          result.failed += batch.failed;
          result.embedded += batch.embedded;

          if (board.incomplete && (board.nextOffset === null || board.nextOffset >= 1000)) {
            result.incompleteSources = (result.incompleteSources ?? 0) + 1;
          }
          if (!board.incomplete || board.nextOffset === null || board.nextOffset >= 1000) {
            await saveCheckpoint(index + 1, 0);
            break;
          }
          if (board.nextOffset !== offset + 200) throw new Error("Invalid source continuation.");
          offset = board.nextOffset;
          await saveCheckpoint(index, offset);
        }
      } catch (error) {
        if ((error instanceof BoardRequestError && error.transient) || isTransientResumeError(error)) {
          const outcome = await failCloudflareJobIngestionJob(claimed.id, claimed.lease_token, {
            code: "TRANSIENT_UNAVAILABLE",
            retryable: true,
          });
          return outcome === "failed" ? "settled" : "retry";
        }
        result.sourcesFailed++;
        await saveCheckpoint(index + 1, 0);
      }
    }

    const completed = await completeCloudflareJobIngestionJob(claimed.id, claimed.lease_token, result);
    return completed ? "settled" : "retry";
  } catch {
    const outcome = await failCloudflareJobIngestionJob(claimed.id, claimed.lease_token, {
      code: "INGESTION_FAILED",
      retryable: false,
    });
    return outcome === "failed" ? "settled" : "retry";
  }
}
