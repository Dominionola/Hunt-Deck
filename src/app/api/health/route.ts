import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET() {
  const timestamp = new Date().toISOString();
  let dbStatus = "unknown";
  let redisStatus = "unknown";

  try {
    // Check PostgreSQL connection
    await db.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (error) {
    dbStatus = `disconnected (${(error as Error).message})`;
  }

  try {
    // Check Redis connection
    if (redis.status === "ready") {
      redisStatus = "connected";
    } else {
      redisStatus = `offline (status: ${redis.status})`;
    }
  } catch {
    redisStatus = "offline";
  }

  return NextResponse.json({
    status: dbStatus === "connected" ? "healthy" : "degraded",
    environment: process.env.NODE_ENV,
    timestamp,
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
  });
}
