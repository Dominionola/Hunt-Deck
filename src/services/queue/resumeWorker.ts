/**
 * Hunt Deck — Durable Resume Processing Worker
 * 
 * Implements TASK-BE-005:
 *  - Offloads slow operations (> 2.5s) from HTTP request handlers
 *  - Enforces server-side authentication and database ownership verification
 *  - Multi-stage truthful progress updates (20% -> 50% -> 75% -> 90% -> 100%)
 *  - Bounded retries for transient failures, fail-closed for permanent errors
 */

import { db } from "@/lib/db";
import { parsePdfBuffer } from "@/services/parsing/resumeParser";
import { extractResumeEntities } from "@/services/ai/resumeExtractor";
import { generateCandidateOrJobEmbedding } from "@/services/ai/cloudflareEmbeddingService";
import {
  updateJobProgress,
  completeJob,
  failJob,
  getJob,
} from "./durableQueue";
import type { ResumeProcessingJobData, ResumeProcessingJobResult } from "./queueTypes";

export async function processResumeJob(
  jobId: string,
  verifiedUserId: string
): Promise<ResumeProcessingJobResult> {
  const job = await getJob<ResumeProcessingJobData, ResumeProcessingJobResult>(
    "resume-processing",
    jobId,
    verifiedUserId
  );

  if (!job) {
    throw new Error(`Job ${jobId} not found.`);
  }

  const { resumeId, userId, fileBufferBase64 } = job.data;

  // 1. Verify database record ownership
  const resume = await db.resume.findUnique({
    where: { id: resumeId },
  });

  if (!resume || resume.userId !== userId) {
    const authError = new Error("Forbidden: User does not own this resume record.");
    await failJob("resume-processing", jobId, authError, false); // Permanent failure
    throw authError;
  }

  try {
    // Stage 1: Text extraction (20%)
    await updateJobProgress("resume-processing", jobId, 20, "Extracting text from PDF");

    let rawText = resume.extractedText;
    if ((!rawText || rawText.trim().length === 0) && fileBufferBase64) {
      const buffer = Buffer.from(fileBufferBase64, "base64");
      const extraction = await parsePdfBuffer(buffer);
      rawText = extraction.text;
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("Unable to extract text from provided resume document.");
    }

    // Stage 2: Structured Entity Extraction via Groq (50%)
    await updateJobProgress("resume-processing", jobId, 50, "Extracting structured entities via Groq");
    const parsedData = await extractResumeEntities(rawText);

    // Stage 3: Cloudflare Workers AI 1,024-dim dense embedding (75%)
    await updateJobProgress("resume-processing", jobId, 75, "Generating 1,024-dim dense embeddings via Cloudflare Workers AI");
    const embedding = await generateCandidateOrJobEmbedding(rawText);

    // Stage 4: Database Persistence (90%)
    await updateJobProgress("resume-processing", jobId, 90, "Saving structured profile and vector index");

    await db.$executeRaw`
      UPDATE "resumes"
      SET
        "extractedText" = ${rawText},
        "parsedData" = ${JSON.stringify(parsedData)}::jsonb,
        "embedding1024" = ${JSON.stringify(embedding.vector)}::vector,
        "embeddingModel" = ${embedding.model},
        "embeddingVersion" = ${embedding.version},
        "contentHash" = ${embedding.contentHash},
        "embeddedAt" = NOW(),
        "atsScore" = 85,
        "updatedAt" = NOW()
      WHERE "id" = ${resumeId} AND "userId" = ${userId}
    `;

    const result: ResumeProcessingJobResult = {
      resumeId,
      fullName: parsedData.fullName,
      skillsCount: parsedData.skills.length,
      hasEmbedding: true,
      contentHash: embedding.contentHash,
    };

    // Stage 5: Completed (100%)
    await completeJob("resume-processing", jobId, result);
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    // Determine if transient (network/rate-limit) or permanent
    const isTransient =
      err.message.includes("429") ||
      err.message.includes("503") ||
      err.message.includes("ECONNRESET") ||
      err.message.includes("ETIMEDOUT") ||
      err.message.includes("Rate limit");

    await failJob("resume-processing", jobId, err, isTransient);
    throw err;
  }
}
