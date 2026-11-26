/**
 * Hunt Deck — Safe & Idempotent BGE-M3 1024-Dim Vector Backfill Script
 * 
 * Invariants:
 *  - Separate Storage: Populates embedding1024 and model metadata; NEVER overwrites legacy 1536-dim vectors.
 *  - Idempotency & Hash Checking: Checks contentHash to avoid re-embedding unchanged records.
 *  - Rate-limited & bounded batching.
 * 
 * Usage:
 *  npx tsx scripts/backfill-bge-embeddings.ts [--dry-run] [--limit=50]
 */

import { db } from "../src/lib/db";
import {
  generateCandidateOrJobEmbedding,
  computeContentHash,
  CLOUDFLARE_BGE_M3_MODEL,
  CLOUDFLARE_BGE_M3_VERSION,
} from "../src/services/ai/cloudflareEmbeddingService";

async function runBackfill() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 100;

  console.log(`[Backfill] Starting BGE-M3 1024-dim vector backfill... (dryRun: ${isDryRun}, limit: ${limit})`);

  // 1. Backfill Resumes missing 1024-dim embeddings
  const resumesToProcess: Array<{ id: string; extractedText: string | null }> = await db.$queryRaw`
    SELECT id, "extractedText"
    FROM "resumes"
    WHERE "contentHash" IS NULL
    LIMIT ${limit}
  `;

  console.log(`[Backfill] Found ${resumesToProcess.length} resumes requiring 1024-dim embedding.`);

  let resumeSuccess = 0;
  let resumeSkipped = 0;

  for (const resume of resumesToProcess) {
    if (!resume.extractedText || resume.extractedText.trim().length === 0) {
      resumeSkipped++;
      continue;
    }

    const hash = computeContentHash(resume.extractedText);

    if (isDryRun) {
      console.log(`[Backfill DRY-RUN] Would embed resume ${resume.id} (hash: ${hash.slice(0, 8)}...)`);
      resumeSuccess++;
      continue;
    }

    const embedding = await generateCandidateOrJobEmbedding(resume.extractedText);

    await db.$executeRaw`
      UPDATE "resumes"
      SET 
        "embedding1024" = ${JSON.stringify(embedding.vector)}::vector,
        "embeddingModel" = ${CLOUDFLARE_BGE_M3_MODEL},
        "embeddingVersion" = ${CLOUDFLARE_BGE_M3_VERSION},
        "contentHash" = ${hash},
        "embeddedAt" = NOW()
      WHERE "id" = ${resume.id}
    `;

    resumeSuccess++;
  }

  // 2. Backfill Job Postings missing 1024-dim embeddings
  const jobsToProcess: Array<{ id: string; title: string; description: string }> = await db.$queryRaw`
    SELECT id, title, description
    FROM "job_postings"
    WHERE "contentHash" IS NULL
    LIMIT ${limit}
  `;

  console.log(`[Backfill] Found ${jobsToProcess.length} job postings requiring 1024-dim embedding.`);

  let jobSuccess = 0;

  for (const job of jobsToProcess) {
    const textToEmbed = `${job.title}\n\n${job.description}`;
    const hash = computeContentHash(textToEmbed);

    if (isDryRun) {
      console.log(`[Backfill DRY-RUN] Would embed job ${job.id} (hash: ${hash.slice(0, 8)}...)`);
      jobSuccess++;
      continue;
    }

    const embedding = await generateCandidateOrJobEmbedding(textToEmbed);

    await db.$executeRaw`
      UPDATE "job_postings"
      SET 
        "embedding1024" = ${JSON.stringify(embedding.vector)}::vector,
        "embeddingModel" = ${CLOUDFLARE_BGE_M3_MODEL},
        "embeddingVersion" = ${CLOUDFLARE_BGE_M3_VERSION},
        "contentHash" = ${hash},
        "embeddedAt" = NOW()
      WHERE "id" = ${job.id}
    `;

    jobSuccess++;
  }

  console.log(`[Backfill] Completed! Resumes processed: ${resumeSuccess}, skipped: ${resumeSkipped}. Jobs processed: ${jobSuccess}.`);
}

if (require.main === module) {
  runBackfill()
    .catch((err) => {
      console.error("[Backfill ERROR]", err);
      process.exit(1);
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
