import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { remoteFeedSaveSchema } from "@/lib/validations/remoteFeeds";
import { persistIngestedJob } from "@/services/jobs/persistJob";
import { redis } from "@/lib/redis";

const headers = { "Cache-Control": "no-store" };
const fallbackSaveBuckets = new Map<string, number[]>();

async function allowUserSave(userId: string, maxPerMinute = 20): Promise<boolean> {
  const hash = createHash("sha256").update(userId).digest("hex").slice(0, 24);
  const now = Date.now();
  const windowStart = now - 60_000;

  try {
    if (redis.status === "ready") {
      const key = `huntdeck:ratelimit:remote-feeds-save:${hash}`;
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

  const recent = (fallbackSaveBuckets.get(hash) ?? []).filter((ts) => ts > windowStart);
  if (recent.length >= maxPerMinute) {
    fallbackSaveBuckets.set(hash, recent);
    return false;
  }
  recent.push(now);
  fallbackSaveBuckets.set(hash, recent);
  return true;
}

/** Persists & embeds a Himalayas or Jobicy listing so the user can open the ATS tailoring workspace. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  }

  if (!(await allowUserSave(user.id))) {
    return NextResponse.json({ error: "Too many save requests. Please wait a moment." }, { status: 429, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400, headers });
  }

  const parsed = remoteFeedSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid job listing payload." }, { status: 400, headers });
  }

  try {
    const persisted = await persistIngestedJob({
      company: parsed.data.company,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      salaryMin: parsed.data.salaryMin,
      salaryMax: parsed.data.salaryMax,
      remoteType: parsed.data.remoteType,
      atsPlatform: parsed.data.atsPlatform,
      applicationUrl: parsed.data.applicationUrl,
      externalJobId: parsed.data.externalJobId,
      postedAt: parsed.data.postedAt ? new Date(parsed.data.postedAt) : new Date(),
    });

    return NextResponse.json(
      { success: true, jobId: persisted.id, embedded: persisted.embedded },
      { headers }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to save remote job listing." },
      { status: 500, headers }
    );
  }
}
