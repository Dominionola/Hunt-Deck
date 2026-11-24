-- Migration: 20261117120000_add_bge_m3_1024_embeddings
-- Description: Adds separate 1,024-dimensional vector columns and model metadata for Cloudflare Workers AI @cf/baai/bge-m3
-- Preserves existing 1,536-dimensional embeddings in separate storage without data destruction

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Resumes: Add separate 1024-dim vector and model tracking
ALTER TABLE "resumes"
ADD COLUMN IF NOT EXISTS "embedding1024" vector(1024),
ADD COLUMN IF NOT EXISTS "embeddingModel" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "embeddingVersion" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "contentHash" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "embeddedAt" TIMESTAMPTZ;

-- Job Postings: Add separate 1024-dim vector and model tracking
ALTER TABLE "job_postings"
ADD COLUMN IF NOT EXISTS "embedding1024" vector(1024),
ADD COLUMN IF NOT EXISTS "embeddingModel" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "embeddingVersion" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "contentHash" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "embeddedAt" TIMESTAMPTZ;

-- Create lookup index for content hash deduplication
CREATE INDEX IF NOT EXISTS "idx_resumes_content_hash" ON "resumes" ("contentHash", "embeddingModel", "embeddingVersion");
CREATE INDEX IF NOT EXISTS "idx_jobs_content_hash" ON "job_postings" ("contentHash", "embeddingModel", "embeddingVersion");

COMMIT;
