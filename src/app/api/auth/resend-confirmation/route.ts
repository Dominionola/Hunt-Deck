import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resendConfirmationSchema } from "@/lib/validations/auth";
import { createClient } from "@/utils/supabase/server";
import { redis } from "@/lib/redis";

const headers = { "Cache-Control": "no-store" };
const fallbackResendBuckets = new Map<string, number[]>();

async function allowResend(email: string, maxPerTenMinutes = 4): Promise<boolean> {
  const hash = createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 24);
  const now = Date.now();
  const windowStart = now - 600_000;

  try {
    if (redis.status === "ready") {
      const key = `huntdeck:ratelimit:resend-confirm:${hash}`;
      const tx = redis.multi();
      tx.zremrangebyscore(key, 0, windowStart);
      tx.zcard(key);
      tx.zadd(key, String(now), `${now}:${Math.random()}`);
      tx.pexpire(key, 600_000);
      const res = await tx.exec();
      const count = Number(res?.[1]?.[1] ?? 0);
      return count < maxPerTenMinutes;
    }
  } catch {
    // Fall back to in-memory sliding window when Redis is offline
  }

  const recent = (fallbackResendBuckets.get(hash) ?? []).filter((ts) => ts > windowStart);
  if (recent.length >= maxPerTenMinutes) {
    fallbackResendBuckets.set(hash, recent);
    return false;
  }
  recent.push(now);
  fallbackResendBuckets.set(hash, recent);
  return true;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400, headers });
  }

  const parsed = resendConfirmationSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400, headers });
  }

  if (!(await allowResend(parsed.data.email))) {
    return NextResponse.json(
      { error: "Too many confirmation emails requested. Please wait a few minutes and check your spam folder." },
      { status: 429, headers }
    );
  }

  try {
    const supabase = createClient(await cookies());
    const callbackUrl = new URL("/auth/callback", origin || requestOrigin).toString();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: { emailRedirectTo: callbackUrl },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Unable to resend verification email." },
        { status: 400, headers }
      );
    }

    return NextResponse.json(
      { success: true, message: "Verification link sent. Please check your inbox and spam folder." },
      { headers }
    );
  } catch {
    return NextResponse.json(
      { error: "Email verification service is temporarily unavailable." },
      { status: 503, headers }
    );
  }
}
