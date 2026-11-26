import type { Prisma } from "@prisma/client";
import { consumeCloudflareBatch, cloudflareJobReferenceSchema, type CloudflareJobReference } from "./cloudflareBatch";
import {
  claimCloudflareResumeJob,
  completeCloudflareResumeJob,
  deadLetterCloudflareResumeJob,
  failCloudflareResumeJob,
  getCloudflareResumeJobState,
  updateCloudflareResumeProgress,
} from "./cloudflareResumeJobs";
import { resumeJobId } from "./resumeQueue";
import { isTransientResumeError } from "./resumeProcessor";
import { readStagedResume } from "@/services/storage/r2Service";
import { parsePdfBuffer } from "@/services/parsing/resumeParser";
import { extractResumeEntities } from "@/services/ai/resumeExtractor";
import { generateCandidateOrJobEmbedding, type TypedEmbedding } from "@/services/ai/cloudflareEmbeddingService";
import { classifyResumeFailure, isInvalidExtractionResponse, type ResumeProcessingStage } from "@/lib/resumeFailure";
import type { ResumeParsedData } from "@/lib/validations/resume";

export interface CloudflareResumeProcessorDeps {
  readStagedResume: (userId: string, storageKey: string) => Promise<Buffer>;
  parsePdfBuffer: (buffer: Buffer | Uint8Array) => Promise<{ text: string; pageCount: number }>;
  extractResumeEntities: (text: string) => Promise<ResumeParsedData>;
  generateEmbedding: (text: string) => Promise<TypedEmbedding>;
  r2BucketName?: string;
  leaseSeconds?: number;
}

const defaultDeps: CloudflareResumeProcessorDeps = {
  readStagedResume,
  parsePdfBuffer,
  extractResumeEntities,
  generateEmbedding: generateCandidateOrJobEmbedding,
};

/** Persist parsed resume and 1024-dim vector atomically inside the caller's fenced transaction. */
export async function persistCloudflareResumeResult(
  tx: Prisma.TransactionClient,
  input: {
    jobId: string;
    ownerId: string;
    storageKey: string;
    extractedText: string;
    parsedData: ResumeParsedData;
    embedding: TypedEmbedding;
    r2BucketName?: string;
  },
): Promise<void> {
  const resumeId = `resume_${input.jobId}`;
  const bucket = input.r2BucketName ?? process.env.R2_BUCKET_NAME ?? "huntdeck-resumes-dev";
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${input.ownerId}, 0))`;
  const existing = await tx.resume.findUnique({ where: { id: resumeId }, select: { userId: true } });
  if (existing && existing.userId !== input.ownerId) {
    throw new Error("Resume ownership mismatch.");
  }
  const count = await tx.resume.count({ where: { userId: input.ownerId } });
  await tx.resume.upsert({
    where: { id: resumeId },
    create: {
      id: resumeId,
      userId: input.ownerId,
      title: "Resume.pdf",
      originalFileUrl: `r2://${bucket}/${input.storageKey}`,
      extractedText: input.extractedText,
      parsedData: input.parsedData,
      isPrimary: count === 0,
    },
    update: {
      extractedText: input.extractedText,
      parsedData: input.parsedData,
    },
  });
  await tx.$executeRaw`UPDATE "resumes"
    SET "embedding1024" = ${JSON.stringify(input.embedding.vector)}::public.vector,
      "embeddingModel" = ${input.embedding.model},
      "embeddingVersion" = ${input.embedding.version},
      "contentHash" = ${input.embedding.contentHash},
      "embeddedAt" = NOW()
    WHERE "id" = ${resumeId} AND "userId" = ${input.ownerId}`;
}

/** Process one Cloudflare Queue resume reference with lease fencing, bounded retries, and safe failure states. */
export async function processCloudflareResumeMessage(
  reference: CloudflareJobReference,
  deps: CloudflareResumeProcessorDeps = defaultDeps,
): Promise<"settled" | "retry"> {
  if (reference.kind !== "resume") return "retry";

  const claimed = await claimCloudflareResumeJob(reference.jobId, deps.leaseSeconds ?? 900);
  if (!claimed) {
    const current = await getCloudflareResumeJobState(reference.jobId);
    if (current && (current.state === "completed" || current.state === "failed")) {
      return "settled";
    }
    if (current && current.state === "queued" && current.attempts >= current.max_attempts) {
      await deadLetterCloudflareResumeJob(reference.jobId);
      return "settled";
    }
    return "retry";
  }

  let stage: ResumeProcessingStage = "storage";
  try {
    await updateCloudflareResumeProgress(claimed.id, claimed.lease_token, 10);
    const buffer = await deps.readStagedResume(claimed.owner_id, claimed.storage_key);
    if (resumeJobId(claimed.owner_id, buffer) !== claimed.id) {
      throw new Error("Invalid job content reference.");
    }

    stage = "parsing";
    const extraction = await deps.parsePdfBuffer(buffer);
    if (!extraction.text.trim()) {
      throw new Error("Resume has no extractable text.");
    }
    await updateCloudflareResumeProgress(claimed.id, claimed.lease_token, 35);

    stage = "extraction";
    const parsedData = await deps.extractResumeEntities(extraction.text);
    await updateCloudflareResumeProgress(claimed.id, claimed.lease_token, 65);

    stage = "embedding";
    const embedding = await deps.generateEmbedding(extraction.text);
    await updateCloudflareResumeProgress(claimed.id, claimed.lease_token, 85);

    stage = "persistence";
    const completed = await completeCloudflareResumeJob(claimed.id, claimed.lease_token, async (tx, ownerId) => {
      await persistCloudflareResumeResult(tx, {
        jobId: claimed.id,
        ownerId,
        storageKey: claimed.storage_key,
        extractedText: extraction.text,
        parsedData,
        embedding,
        r2BucketName: deps.r2BucketName,
      });
    });

    return completed ? "settled" : "retry";
  } catch (error) {
    const code = classifyResumeFailure(stage, error);
    const retryable = isTransientResumeError(error) || (stage === "extraction" && isInvalidExtractionResponse(error));
    const outcome = await failCloudflareResumeJob(claimed.id, claimed.lease_token, { code, retryable });
    return outcome === "failed" ? "settled" : "retry";
  }
}

type QueueBatchMessage = {
  body: unknown;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
};

/** Consume a batch from the primary Cloudflare Queue. */
export async function consumeCloudflareResumeBatch(
  messages: readonly QueueBatchMessage[],
  deps: CloudflareResumeProcessorDeps = defaultDeps,
): Promise<void> {
  await consumeCloudflareBatch(messages, (reference) => processCloudflareResumeMessage(reference, deps));
}

/** Consume a batch from the configured dead-letter queue, durably recording failure without overwriting completed jobs. */
export async function consumeCloudflareResumeDeadLetterBatch(
  messages: readonly QueueBatchMessage[],
): Promise<void> {
  for (const message of messages) {
    const parsed = cloudflareJobReferenceSchema.safeParse(message.body);
    if (!parsed.success) {
      message.ack();
      continue;
    }
    if (parsed.data.kind !== "resume") {
      message.ack();
      continue;
    }
    try {
      await deadLetterCloudflareResumeJob(parsed.data.jobId);
      message.ack();
    } catch {
      message.retry();
    }
  }
}
