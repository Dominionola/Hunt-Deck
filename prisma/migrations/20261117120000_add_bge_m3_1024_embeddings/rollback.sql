-- Rollback Migration: 20261117120000_add_bge_m3_1024_embeddings
-- Description: Safely removes 1,024-dimensional embedding columns and indexes
-- Rollback Invariant: Leaves all legacy 1,536-dimensional vectors and primary user data intact
-- DESTRUCTIVE to new vectors/metadata. Prefer rolling back application reads while
-- retaining these nullable columns. Archive new data and reconcile Prisma history
-- before using this script; a successful migration cannot be marked rolled back
-- with `migrate resolve --rolled-back`.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DROP INDEX IF EXISTS "idx_resumes_content_hash";
DROP INDEX IF EXISTS "idx_jobs_content_hash";

ALTER TABLE "resumes"
DROP COLUMN IF EXISTS "embedding1024",
DROP COLUMN IF EXISTS "embeddingModel",
DROP COLUMN IF EXISTS "embeddingVersion",
DROP COLUMN IF EXISTS "contentHash",
DROP COLUMN IF EXISTS "embeddedAt";

ALTER TABLE "job_postings"
DROP COLUMN IF EXISTS "embedding1024",
DROP COLUMN IF EXISTS "embeddingModel",
DROP COLUMN IF EXISTS "embeddingVersion",
DROP COLUMN IF EXISTS "contentHash",
DROP COLUMN IF EXISTS "embeddedAt";

COMMIT;
