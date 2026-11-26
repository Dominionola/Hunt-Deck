import { Prisma } from "@prisma/client";

/** SQL predicate for queries whose job_postings alias is j. Untracked jobs remain visible. */
export const visibleSourcePredicate = Prisma.sql`(
  NOT EXISTS (SELECT 1 FROM job_source_records sr WHERE sr."jobId" = j.id)
  OR EXISTS (SELECT 1 FROM job_source_records sr WHERE sr."jobId" = j.id AND sr."closedAt" IS NULL))`;
