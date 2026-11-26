import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { ingestionSourceSchema, type IngestionJob } from "@/lib/validations/jobIngestion";
import { enqueueScheduledIngestion } from "@/services/queue/jobIngestionQueue";

export const sourceApprovalSchema = z.object({ source: ingestionSourceSchema, intervalHours: z.number().int().min(24).max(168), termsReviewed: z.literal(true) }).strict();
export const sourceDisableSchema = z.object({ scheduleId: z.string().uuid() }).strict();

export async function listApprovedSources() {
  return db.$queryRaw<{ id: string; platform: string; board: string; enabled: boolean; nextRunAt: Date; intervalHours: number }[]>`
    SELECT id, platform::text, board, enabled, "nextRunAt", "intervalHours" FROM job_source_schedules ORDER BY enabled DESC, board, platform LIMIT 100`;
}

/** Explicit admin attestation; source selection alone never creates a schedule. */
export async function approveSource(userId: string, input: unknown) {
  const approval = sourceApprovalSchema.parse(input);
  if ((await db.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role !== "ADMIN") throw new Error("Admin authorization required.");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended('huntdeck:source-schedule-cap', 0))`;
    const active = await tx.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM job_source_schedules WHERE enabled = true`;
    const existing = await tx.$queryRaw<{ enabled: boolean }[]>`SELECT enabled FROM job_source_schedules WHERE platform::text = ${approval.source.platform} AND board = ${approval.source.board}`;
    if (active[0].count >= 10 && !existing[0]?.enabled) throw new Error("Source schedule limit reached.");
    const rows = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO job_source_schedules (id, platform, board, "approvedBy", enabled, "nextRunAt", "intervalHours", "reviewedAt")
      VALUES (${randomUUID()}, ${approval.source.platform}::"AtsPlatform", ${approval.source.board}, ${userId}, true, date_trunc('milliseconds', NOW()), ${approval.intervalHours}, NOW())
      ON CONFLICT (platform, board) DO UPDATE SET "approvedBy" = EXCLUDED."approvedBy", enabled = true,
        "nextRunAt" = GREATEST(job_source_schedules."nextRunAt", EXCLUDED."nextRunAt"),
        "intervalHours" = EXCLUDED."intervalHours", "reviewedAt" = NOW() RETURNING id`;
    return rows[0];
  }, { maxWait: 10000, timeout: 30000 });
}

export async function disableSource(userId: string, input: unknown) {
  const { scheduleId } = sourceDisableSchema.parse(input);
  if ((await db.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role !== "ADMIN") throw new Error("Admin authorization required.");
  return db.$executeRaw`UPDATE job_source_schedules SET enabled = false WHERE id = ${scheduleId}`;
}

/** Rechecked by the worker immediately before any provider request. */
export async function isScheduledSourceApproved(job: IngestionJob) {
  if (!job.scheduleId) return true;
  if (job.sources.length !== 1) return false;
  const source = job.sources[0];
  const rows = await db.$queryRaw<{ id: string }[]>`SELECT id FROM job_source_schedules WHERE id = ${job.scheduleId}
    AND enabled = true AND "approvedBy" = ${job.userId} AND platform::text = ${source.platform} AND board = ${source.board}`;
  return rows.length === 1;
}

/** At most five due sources per tick; a deterministic job ID makes concurrent dispatch replay-safe. */
export async function dispatchApprovedSources(now = new Date(), enqueue = enqueueScheduledIngestion) {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid schedule time.");
  const due = await db.$queryRaw<{ id: string; platform: "GREENHOUSE" | "LEVER" | "ASHBY"; board: string; approvedBy: string; nextRunAt: Date; intervalHours: number }[]>`
    SELECT s.id, s.platform::text, s.board, s."approvedBy", s."nextRunAt", s."intervalHours" FROM job_source_schedules s
    JOIN users u ON u.id = s."approvedBy" AND u.role::text = 'ADMIN'
    WHERE s.enabled = true AND s."nextRunAt" <= ${now} ORDER BY s."nextRunAt", s.id LIMIT 5`;
  let dispatched = 0; let failed = 0;
  for (const source of due) {
    try {
      if ((await db.user.findUnique({ where: { id: source.approvedBy }, select: { role: true } }))?.role !== "ADMIN") { failed++; continue; }
      await enqueue({ userId: source.approvedBy, scheduleId: source.id, sources: [{ platform: source.platform, board: source.board }] }, source.nextRunAt);
      const next = new Date(now.getTime() + source.intervalHours * 60 * 60 * 1000);
      await db.$executeRaw`UPDATE job_source_schedules SET "nextRunAt" = ${next} WHERE id = ${source.id} AND enabled = true AND "nextRunAt" = ${source.nextRunAt}`;
      dispatched++;
    } catch { failed++; }
  }
  return { dispatched, failed };
}
