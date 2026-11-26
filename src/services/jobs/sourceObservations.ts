import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { ingestionSourceSchema } from "@/lib/validations/jobIngestion";
import { verifySourceSnapshots } from "./verifySourceSnapshot";

// Draft source tables must be installed in an isolated rehearsal before use.
// Verification does not close or hide jobs; two observations are not atomic proof.
const id = z.string().min(1).max(150);
const batchSchema = z.object({
  runId: z.string().uuid(), generation: z.number().int().positive(),
  offset: z.number().int().min(0).max(800).multipleOf(200),
  terminal: z.boolean(), invalidCount: z.number().int().min(0).max(200),
  entries: z.array(z.object({ externalId: id, jobId: id.optional() }).strict()).max(200),
}).strict();

export async function beginSourceObservation(input: unknown) {
  const source = ingestionSourceSchema.parse(input);
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; generation: number }[]>`
      INSERT INTO job_sources (id, platform, board, generation)
      VALUES (${randomUUID()}, ${source.platform}::"AtsPlatform", ${source.board}, 1)
      ON CONFLICT (platform, board) DO UPDATE SET generation = job_sources.generation + 1
      RETURNING id, generation`;
    const runId = randomUUID();
    await tx.$executeRaw`INSERT INTO job_source_runs (id, "sourceId", generation) VALUES (${runId}, ${rows[0].id}, ${rows[0].generation})`;
    return { runId, generation: rows[0].generation };
  });
}

/** Read a checkpoint after restart; every later write rechecks the generation under lock. */
export async function getSourceObservation(input: unknown) {
  const run = z.object({ runId: z.string().uuid(), generation: z.number().int().positive() }).strict().parse(input);
  const rows = await db.$queryRaw<{ state: string; nextOffset: number }[]>`
    SELECT r.state, r."nextOffset" FROM job_source_runs r JOIN job_sources s ON s.id = r."sourceId"
    WHERE r.id = ${run.runId} AND r.generation = ${run.generation} AND s.generation = r.generation`;
  if (!rows[0]) throw new Error("Source observation is stale or unavailable.");
  return rows[0];
}

export async function recordSourceObservation(input: unknown) {
  const batch = batchSchema.parse(input);
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ sourceId: string; sourceGeneration: number; generation: number; state: string; nextOffset: number; platform: string; board: string }[]>`
      SELECT r."sourceId", s.generation AS "sourceGeneration", r.generation, r.state, r."nextOffset", s.platform::text, s.board
      FROM job_source_runs r JOIN job_sources s ON s.id = r."sourceId"
      WHERE r.id = ${batch.runId} FOR UPDATE OF s, r`;
    const run = rows[0];
    if (!run || run.generation !== batch.generation || run.sourceGeneration !== batch.generation ||
        (run.state !== "collecting" && run.state !== "verifying") || run.nextOffset !== batch.offset) throw new Error("Source observation is stale or out of sequence.");
    const collecting = run.state === "collecting";
    const ids = batch.entries.map((entry) => entry.externalId);
    const invalid = batch.invalidCount > 0 || ids.length === 0 || new Set(ids).size !== ids.length ||
      (!batch.terminal && (ids.length !== 200 || batch.offset === 800)) ||
      batch.entries.some((entry) => collecting ? !entry.jobId : Boolean(entry.jobId));
    if (invalid) {
      await tx.$executeRaw`UPDATE job_source_runs SET state = 'rejected', "invalidCount" = "invalidCount" + ${Math.max(1, batch.invalidCount)}, "finishedAt" = NOW() WHERE id = ${batch.runId}`;
      return { state: "rejected" as const };
    }
    if (collecting) {
      const matches = await tx.$queryRaw<{ id: string; externalJobId: string | null }[]>`
        SELECT id, "externalJobId" FROM job_postings WHERE company = ${run.board} AND "atsPlatform"::text = ${run.platform}
        AND id IN (${Prisma.join(batch.entries.map((entry) => entry.jobId!))})`;
      const mapping = new Map(matches.map((match) => [match.id, match.externalJobId]));
      if (batch.entries.some((entry) => mapping.get(entry.jobId!) !== entry.externalId)) throw new Error("Source listing identity mismatch.");
      const previous = await tx.$queryRaw<{ externalId: string; jobId: string }[]>`
        SELECT "externalId", "jobId" FROM job_source_records WHERE "sourceId" = ${run.sourceId} AND "externalId" IN (${Prisma.join(ids)})`;
      const existing = new Map(previous.map((record) => [record.externalId, record.jobId]));
      if (batch.entries.some((entry) => existing.has(entry.externalId) && existing.get(entry.externalId) !== entry.jobId)) throw new Error("Source listing identity conflict.");
    }
    const pass = collecting ? 1 : 2;
    // A repeated ID across batches fails the unique constraint and rolls back the batch.
    await tx.$executeRaw`INSERT INTO job_source_observations ("runId", pass, "externalId") VALUES ${Prisma.join(ids.map((externalId) => Prisma.sql`(${batch.runId}, ${pass}, ${externalId})`))}`;
    if (collecting) {
      await tx.$executeRaw`INSERT INTO job_source_records ("sourceId", "externalId", "jobId", "lastGeneration") VALUES
        ${Prisma.join(batch.entries.map((entry) => Prisma.sql`(${run.sourceId}, ${entry.externalId}, ${entry.jobId!}, ${run.generation})`))}
        ON CONFLICT ("sourceId", "externalId") DO UPDATE SET "jobId" = EXCLUDED."jobId", "lastGeneration" = EXCLUDED."lastGeneration", "closedAt" = NULL`;
    }
    if (!batch.terminal) {
      await tx.$executeRaw`UPDATE job_source_runs SET "nextOffset" = ${batch.offset + 200} WHERE id = ${batch.runId}`;
      return { state: run.state as "collecting" | "verifying" };
    }
    if (collecting) {
      await tx.$executeRaw`UPDATE job_source_runs SET state = 'verifying', "nextOffset" = 0 WHERE id = ${batch.runId}`;
      return { state: "verifying" as const };
    }
    const observations = await tx.$queryRaw<{ pass: number; externalId: string }[]>`
      SELECT pass, "externalId" FROM job_source_observations WHERE "runId" = ${batch.runId}`;
    const snapshot = (number: number) => ({ sourceKey: run.sourceId, generation: run.generation, complete: true,
      invalidCount: 0, ids: observations.filter((row) => row.pass === number).map((row) => row.externalId) });
    const verified = verifySourceSnapshots(snapshot(1), snapshot(2));
    const state = verified ? "verified" : "rejected";
    await tx.$executeRaw`UPDATE job_source_runs SET state = ${state}, "finishedAt" = NOW() WHERE id = ${batch.runId}`;
    return { state };
  }, { timeout: 60000 });
}

/** Conservative evidence gate; a verified snapshot is still not an atomic provider snapshot. */
export async function reconcileVerifiedSource(input: unknown) {
  const run = z.object({ runId: z.string().uuid(), generation: z.number().int().positive() }).strict().parse(input);
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ sourceId: string; generation: number; sourceGeneration: number; state: string; finishedAt: Date | null }[]>`
      SELECT r."sourceId", r.generation, s.generation AS "sourceGeneration", r.state, r."finishedAt"
      FROM job_source_runs r JOIN job_sources s ON s.id = r."sourceId" WHERE r.id = ${run.runId} FOR UPDATE OF s, r`;
    const current = rows[0];
    if (!current || current.generation !== run.generation || current.sourceGeneration !== run.generation || current.state !== "verified" || !current.finishedAt) throw new Error("Source verification is stale or unavailable.");
    const previous = await tx.$queryRaw<{ generation: number; finishedAt: Date }[]>`
      SELECT generation, "finishedAt" FROM job_source_runs WHERE "sourceId" = ${current.sourceId}
      AND state = 'verified' AND generation < ${run.generation} AND "finishedAt" IS NOT NULL
      ORDER BY generation DESC LIMIT 1`;
    if (!previous[0] || current.finishedAt.getTime() - previous[0].finishedAt.getTime() < 24 * 60 * 60 * 1000) return { closed: 0, reason: "insufficient_history" as const };
    const total = await tx.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM job_source_records WHERE "sourceId" = ${current.sourceId} AND "closedAt" IS NULL`;
    const missing = await tx.$queryRaw<{ externalId: string }[]>`SELECT "externalId" FROM job_source_records
      WHERE "sourceId" = ${current.sourceId} AND "closedAt" IS NULL AND "lastGeneration" < ${previous[0].generation}`;
    // Fail closed on a sudden large disappearance, which may indicate provider instability.
    if (missing.length > Math.max(1, Math.floor(total[0].count * 0.1))) return { closed: 0, reason: "change_limit" as const };
    if (missing.length === 0) return { closed: 0, reason: "no_changes" as const };
    const count = await tx.$executeRaw`UPDATE job_source_records SET "closedAt" = NOW() WHERE "sourceId" = ${current.sourceId}
      AND "closedAt" IS NULL AND "externalId" IN (${Prisma.join(missing.map((item) => item.externalId))})`;
    return { closed: count, reason: "reconciled" as const };
  });
}
