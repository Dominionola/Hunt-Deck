import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const userId = user.id;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Run parallel queries scoped strictly to verified userId
    const [statusCounts, weeklySubmitted, primaryResume, totalSaved] = await Promise.all([
      db.application.groupBy({
        by: ["status"],
        where: { userId },
        _count: { status: true },
      }),
      db.application.count({
        where: {
          userId,
          status: { in: ["APPLIED", "INTERVIEWING", "OFFER"] },
          createdAt: { gte: oneWeekAgo },
        },
      }),
      db.resume.findFirst({
        where: { userId, isPrimary: true },
        select: { id: true, title: true, atsScore: true, updatedAt: true },
      }),
      db.application.count({
        where: { userId, status: "SAVED" },
      }),
    ]);

    const countsMap: Record<string, number> = {
      SAVED: 0,
      APPLIED: 0,
      INTERVIEWING: 0,
      OFFER: 0,
      REJECTED: 0,
    };

    for (const sc of statusCounts) {
      countsMap[sc.status] = sc._count.status;
    }

    const totalPipeline =
      countsMap.SAVED +
      countsMap.APPLIED +
      countsMap.INTERVIEWING +
      countsMap.OFFER;

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        pipeline: {
          total: totalPipeline,
          saved: totalSaved,
          applied: countsMap.APPLIED,
          interviewing: countsMap.INTERVIEWING,
          offers: countsMap.OFFER,
          rejected: countsMap.REJECTED,
        },
        velocity: {
          applicationsThisWeek: weeklySubmitted,
          weeklyTarget: 12,
          pacingStatus: weeklySubmitted >= 10 ? "Optimal Pacing" : "Active Push",
        },
        primaryResume: primaryResume
          ? {
              id: primaryResume.id,
              title: primaryResume.title,
              atsScore: primaryResume.atsScore,
              lastUpdated: primaryResume.updatedAt,
            }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Dashboard metrics are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
