import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { freehireLiveSearchQuerySchema } from "@/lib/validations/freehire";
import { fetchFreehireJobs } from "@/services/jobs/adapters/freehireAdapter";
import { redis } from "@/lib/redis";

const headers = { "Cache-Control": "no-store" };
const fallbackBuckets = new Map<string, number[]>();

async function allowUserSearch(userId: string, maxPerMinute = 25): Promise<boolean> {
  const hash = createHash("sha256").update(userId).digest("hex").slice(0, 24);
  const now = Date.now();
  const windowStart = now - 60_000;

  try {
    if (redis.status === "ready") {
      const key = `huntdeck:ratelimit:freehire-search:${hash}`;
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
    // Fall back to in-memory sliding window when Redis is offline
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

/** Authenticated live search across Freehire's public 4.7M+ job catalog. */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  }

  const allowed = await allowUserSearch(user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Too many search requests. Wait a moment and retry." }, { status: 429, headers });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = freehireLiveSearchQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Freehire search parameters." }, { status: 400, headers });
  }

  try {
    const result = await fetchFreehireJobs({
      query: parsed.data.q,
      workMode: parsed.data.workMode,
      sourceFilter: parsed.data.sourceFilter,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json(
      {
        success: true,
        totalAvailable: result.totalAvailable,
        items: result.jobs.map((job) => ({
          id: job.publicSlug,
          publicSlug: job.publicSlug,
          sourceName: job.sourceName,
          title: job.title,
          company: job.company,
          location: job.location ?? null,
          remoteType: job.remoteType,
          atsPlatform: job.atsPlatform,
          applicationUrl: job.applicationUrl,
          postedAt: (job.postedAt ?? new Date()).toISOString(),
          salaryMin: job.salaryMin ?? null,
          salaryMax: job.salaryMax ?? null,
          techStack: job.techStack,
        })),
      },
      { headers }
    );
  } catch {
    return NextResponse.json(
      { error: "Freehire global catalog is temporarily unavailable." },
      { status: 503, headers }
    );
  }
}
