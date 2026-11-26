import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { freehireSaveSlugSchema } from "@/lib/validations/freehire";
import { fetchFreehireJobBySlug } from "@/services/jobs/adapters/freehireAdapter";
import { persistIngestedJob } from "@/services/jobs/persistJob";
import { redis } from "@/lib/redis";

const headers = { "Cache-Control": "no-store" };
const fallbackSaveBuckets = new Map<string, number[]>();

async function allowUserSave(userId: string, maxPerMinute = 15): Promise<boolean> {
  const hash = createHash("sha256").update(userId).digest("hex").slice(0, 24);
  const now = Date.now();
  const windowStart = now - 60_000;

  try {
    if (redis.status === "ready") {
      const key = `huntdeck:ratelimit:freehire-save:${hash}`;
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

/** Persists & embeds a single Freehire posting so the user can open the tailoring workspace. */
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

  const parsed = freehireSaveSlugSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Freehire posting slug." }, { status: 400, headers });
  }

  try {
    const posting = await fetchFreehireJobBySlug(parsed.data.publicSlug);
    if (!posting) {
      return NextResponse.json({ error: "Freehire job posting not found." }, { status: 404, headers });
    }
    const saved = await persistIngestedJob(posting);
    return NextResponse.json({ success: true, jobId: saved.id }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Could not save this job posting right now. Please try again." },
      { status: 503, headers }
    );
  }
}
