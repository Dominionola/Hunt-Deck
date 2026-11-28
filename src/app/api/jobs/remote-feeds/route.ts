import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { remoteFeedQuerySchema } from "@/lib/validations/remoteFeeds";
import { fetchHimalayasJobs } from "@/services/jobs/adapters/himalayasAdapter";
import { fetchJobicyJobs } from "@/services/jobs/adapters/jobicyAdapter";
import { getOrSetCached } from "@/lib/cache";
import { redis } from "@/lib/redis";

const headers = { "Cache-Control": "no-store" };
const fallbackBuckets = new Map<string, number[]>();

async function allowRemoteFeedQuery(userId: string, provider: string, maxPerMinute = 20): Promise<boolean> {
  const hash = createHash("sha256").update(`${userId}:${provider}`).digest("hex").slice(0, 24);
  const now = Date.now();
  const windowStart = now - 60_000;

  try {
    if (redis.status === "ready") {
      const key = `huntdeck:ratelimit:remote-feeds:${hash}`;
      const tx = redis.multi();
      tx.zremrangebyscore(key, 0, windowStart);
      tx.zcard(key);
      tx.zadd(key, String(now), `${now}:${Math.random()}`);
      tx.pexpire(key, 60_000);
      const res = await tx.exec();
      const count = Number(res?.[1]?.[1] ?? 0);
      return count < maxPerMinute;
    }
  } catch {
    // Fall back to in-memory window when Redis is offline
  }

  const recent = (fallbackBuckets.get(hash) ?? []).filter((ts) => ts > windowStart);
  if (recent.length >= maxPerMinute) {
    fallbackBuckets.set(hash, recent);
    return false;
  }
  recent.push(now);
  fallbackBuckets.set(hash, recent);
  return true;
}

/**
 * Authenticated live search & feed endpoint for Himalayas (100k+ remote jobs)
 * and Jobicy (fresh 7-day remote feed).
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  }

  const { searchParams } = new URL(request.url);
  const parsed = remoteFeedQuerySchema.safeParse({
    provider: searchParams.get("provider") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    geo: searchParams.get("geo") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid remote feed parameters." }, { status: 400, headers });
  }

  const allowed = await allowRemoteFeedQuery(user.id, parsed.data.provider);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Wait a moment and retry." }, { status: 429, headers });
  }

  try {
    const ttlSeconds = parsed.data.provider === "jobicy" ? 900 : 900;
    const { data: payload, cached } = await getOrSetCached(
      `remote-feeds:${parsed.data.provider}`,
      parsed.data,
      ttlSeconds,
      async () => {
        if (parsed.data.provider === "jobicy") {
          const result = await fetchJobicyJobs({
            query: parsed.data.q,
            geo: parsed.data.geo,
            cursor: parsed.data.cursor,
            limit: parsed.data.limit,
          });
          return {
            success: true as const,
            provider: result.provider,
            totalAvailable: result.totalAvailable,
            nextCursor: result.nextCursor,
            items: result.jobs,
          };
        }

        const result = await fetchHimalayasJobs({
          query: parsed.data.q,
          cursor: parsed.data.cursor,
          limit: parsed.data.limit,
        });
        return {
          success: true as const,
          provider: result.provider,
          totalAvailable: result.totalAvailable,
          nextCursor: result.nextCursor,
          items: result.jobs,
        };
      }
    );

    return NextResponse.json(
      { ...payload, cached },
      { headers }
    );
  } catch {
    return NextResponse.json(
      { error: "Remote job feed is temporarily unavailable." },
      { status: 502, headers }
    );
  }
}
