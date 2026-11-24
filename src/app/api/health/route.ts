import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkServiceHealth } from "@/lib/serviceHealth";
import { getResumeQueue } from "@/services/queue/resumeQueue";

export async function GET() {
  const timestamp = new Date().toISOString();
  const health = await checkServiceHealth({
    database: () => db.$queryRaw`SELECT 1`,
    // Probe the configured queue connection rather than an unused lazy cache.
    redis: () => getResumeQueue().getJobCounts("wait", "active"),
  });

  return NextResponse.json({
    status: health.healthy ? "healthy" : "degraded",
    environment: process.env.NODE_ENV,
    timestamp,
    services: {
      database: health.database,
      redis: health.redis,
    },
  }, { status: health.healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
