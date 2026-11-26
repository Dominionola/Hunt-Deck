import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { DashboardMetrics } from "@/lib/validations/dashboard";

/** Monday-based UTC buckets. Dates describe recorded submissions, never record creation. */
export function dashboardWeeks(now: Date) {
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  return Array.from({ length: 6 }, (_, i) => ({
    start: new Date(monday.getTime() - (5 - i) * 7 * 86400000).toISOString(), count: 0,
  }));
}

export async function getDashboardMetrics(userId: string, now = new Date()): Promise<DashboardMetrics> {
  const weeks = dashboardWeeks(now);
  return db.$transaction(async (tx) => {
    const [statuses, submissions, recent, resume, profile] = await Promise.all([
      tx.application.groupBy({ by: ["status"], where: { userId }, _count: { status: true } }),
      tx.$queryRaw<{ start: Date; count: number }[]>`
        SELECT date_trunc('week', "appliedAt") AS start, count(*)::int AS count
        FROM applications WHERE "userId" = ${userId}
          AND "appliedAt" >= ${new Date(weeks[0].start)} AND "appliedAt" <= ${now}
        GROUP BY 1`,
      tx.application.findMany({ where: { userId }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 5,
        select: { id: true, status: true, updatedAt: true, followUpDate: true,
          job: { select: { title: true, company: true } } } }),
      tx.resume.findFirst({ where: { userId, isPrimary: true }, select: { id: true, title: true, updatedAt: true } }),
      tx.profile.findUnique({ where: { userId }, select: { targetTitles: true } }),
    ]);
    const counts = { SAVED: 0, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0 };
    for (const row of statuses) counts[row.status] = row._count.status;
    for (const week of weeks) week.count = submissions.find((row) => row.start.toISOString() === week.start)?.count ?? 0;
    return { success: true,
      pipeline: { total: counts.SAVED + counts.APPLIED + counts.INTERVIEWING + counts.OFFER,
        saved: counts.SAVED, applied: counts.APPLIED, interviewing: counts.INTERVIEWING,
        offers: counts.OFFER, rejected: counts.REJECTED },
      velocity: { applicationsThisWeek: weeks[5].count, weeks },
      recentApplications: recent.map((item) => ({ id: item.id, title: item.job.title, company: item.job.company,
        status: item.status, updatedAt: item.updatedAt.toISOString(), followUpDate: item.followUpDate?.toISOString() ?? null })),
      primaryResume: resume ? { id: resume.id, title: resume.title, lastUpdated: resume.updatedAt.toISOString() } : null,
      targetTitles: profile?.targetTitles ?? [] };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
