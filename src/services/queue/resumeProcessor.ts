import { UnrecoverableError, Worker, type Job } from "bullmq";
import { db } from "@/lib/db";
import { readStagedResume } from "@/services/storage/r2Service";
import { parsePdfBuffer } from "@/services/parsing/resumeParser";
import { extractResumeEntities } from "@/services/ai/resumeExtractor";
import { generateCandidateOrJobEmbedding } from "@/services/ai/cloudflareEmbeddingService";
import { resumeJobDataSchema, resumeJobIdSchema } from "@/lib/validations/resumeJob";
import { redisConnectionOptions, resumeJobId, RESUME_QUEUE, type ResumeJobData, type ResumeJobResult } from "./resumeQueue";

export function isTransientResumeError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: unknown; status?: unknown; statusCode?: unknown; code?: unknown; cause?: { code?: unknown }; $metadata?: { httpStatusCode?: unknown } };
  const status = value.status ?? value.statusCode ?? value.$metadata?.httpStatusCode;
  const code = value.code ?? value.cause?.code;
  return value.name === "TimeoutError" || value.name === "APIConnectionTimeoutError" ||
    status === 429 || (typeof status === "number" && status >= 500 && status <= 599) ||
    (typeof code === "string" && ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN", "P1001", "P1002", "P1017"].includes(code));
}

export async function processQueuedResume(job: Job<ResumeJobData, ResumeJobResult>): Promise<ResumeJobResult> {
  try {
    const { userId, storageKey } = resumeJobDataSchema.parse(job.data);
    const jobId = resumeJobIdSchema.parse(job.id);
    await job.updateProgress(10);
    const buffer = await readStagedResume(userId, storageKey);
    if (resumeJobId(userId, buffer) !== jobId) throw new Error("Invalid job content reference.");
    const extraction = await parsePdfBuffer(buffer);
    if (!extraction.text.trim()) throw new Error("Resume has no extractable text.");
    await job.updateProgress(35);
    const parsedData = await extractResumeEntities(extraction.text);
    await job.updateProgress(65);
    const embedding = await generateCandidateOrJobEmbedding(extraction.text);
    await job.updateProgress(85);

    const resumeId = `resume_${job.id}`;
    await db.$transaction(async (tx) => {
      // Serialize persistence for an owner, including replays after a lost worker
      // lock. Different uploads must not both become the first primary resume.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
      const existing = await tx.resume.findUnique({ where: { id: resumeId }, select: { userId: true } });
      if (existing && existing.userId !== userId) throw new Error("Resume ownership mismatch.");
      const count = await tx.resume.count({ where: { userId } });
      await tx.resume.upsert({
        where: { id: resumeId },
        create: { id: resumeId, userId, title: "Resume.pdf", originalFileUrl: `r2://${process.env.R2_BUCKET_NAME}/${storageKey}`, extractedText: extraction.text, parsedData, isPrimary: count === 0 },
        update: { extractedText: extraction.text, parsedData },
      });
      await tx.$executeRaw`UPDATE "resumes" SET "embedding1024" = ${JSON.stringify(embedding.vector)}::vector, "embeddingModel" = ${embedding.model}, "embeddingVersion" = ${embedding.version}, "contentHash" = ${embedding.contentHash}, "embeddedAt" = NOW() WHERE "id" = ${resumeId} AND "userId" = ${userId}`;
    });
    await job.updateProgress(100);
    return { resumeId };
  } catch (error) {
    // Queue metadata must never contain provider response text or resume content.
    if (isTransientResumeError(error)) throw new Error("Resume processing temporarily unavailable.");
    throw new UnrecoverableError("Resume processing failed. Please try another file or contact support.");
  }
}

export function startResumeWorker() {
  return new Worker<ResumeJobData, ResumeJobResult>(RESUME_QUEUE, processQueuedResume, { connection: redisConnectionOptions(true), concurrency: 2 });
}
