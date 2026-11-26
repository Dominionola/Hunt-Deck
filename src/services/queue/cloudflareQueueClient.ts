import { cloudflareJobReferenceSchema, type CloudflareJobReference } from "./cloudflareBatch";
import { publishCloudflareResumeOutbox } from "./cloudflareResumeJobs";
import { enforceResumeRateLimit } from "./resumeQueue";
import { db } from "@/lib/db";

export interface CloudflareQueueBinding {
  send(body: unknown): Promise<void>;
}

export type CloudflareQueueSender = (message: CloudflareJobReference) => Promise<unknown>;

export interface CloudflareQueueRestConfig {
  accountId?: string;
  queueId?: string;
  apiToken?: string;
}

const HEX_32_RE = /^[a-f0-9]{32}$/i;

export function isCloudflareResumeQueueEnabled(): boolean {
  return process.env.RESUME_QUEUE_BACKEND === "cloudflare";
}

/** Create a fail-closed Cloudflare Queues REST API sender; never logs tokens or payloads. */
export function createCloudflareQueueRestSender(config?: CloudflareQueueRestConfig): CloudflareQueueSender {
  const accountId = (config?.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  const queueId = (config?.queueId ?? process.env.CLOUDFLARE_RESUME_QUEUE_ID ?? "").trim();
  const apiToken = (config?.apiToken ?? process.env.CLOUDFLARE_QUEUES_API_TOKEN ?? "").trim();

  if (!HEX_32_RE.test(accountId) || !HEX_32_RE.test(queueId) || !apiToken) {
    throw new Error("Cloudflare resume queue is not configured.");
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/queues/${queueId}/messages`;

  return async (message: CloudflareJobReference) => {
    const validated = cloudflareJobReferenceSchema.parse(message);
    const response = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: validated }),
    });

    if (!response.ok) {
      throw Object.assign(new Error("Cloudflare queue publish failed."), { status: response.status });
    }

    const payload = (await response.json()) as { success?: boolean } | null;
    if (!payload || payload.success !== true) {
      throw new Error("Cloudflare queue publish failed.");
    }
  };
}

/** Wrap a Cloudflare Worker Queue binding with strict reference-only validation. */
export function createCloudflareQueueBindingSender(binding: CloudflareQueueBinding): CloudflareQueueSender {
  return async (message: CloudflareJobReference) => {
    const validated = cloudflareJobReferenceSchema.parse(message);
    await binding.send(validated);
  };
}

/** Drain up to `limit` pending outbox rows without holding DB locks across network I/O. */
export async function drainCloudflareResumeOutbox(
  send: CloudflareQueueSender,
  options?: { limit?: number; maxPublishAttempts?: number },
): Promise<{ published: number; leaseLost: number; empty: boolean; failed: boolean }> {
  const limit = Math.max(1, Math.min(50, Math.trunc(options?.limit ?? 10)));
  const maxPublishAttempts = options?.maxPublishAttempts ?? 5;
  let published = 0;
  let leaseLost = 0;
  let empty = false;

  for (let i = 0; i < limit; i++) {
    try {
      const outcome = await publishCloudflareResumeOutbox(send, maxPublishAttempts);
      if (outcome === "empty") {
        empty = true;
        break;
      }
      if (outcome === "published") published++;
      else leaseLost++;
    } catch {
      return { published, leaseLost, empty: false, failed: true };
    }
  }

  return { published, leaseLost, empty, failed: false };
}

/** Enforce 15 uploads/min/user using Redis when available, or PostgreSQL otherwise. */
export async function enforceCloudflareResumeRateLimit(userId: string): Promise<boolean> {
  if (process.env.REDIS_URL) {
    return enforceResumeRateLimit(userId);
  }
  const rows = await db.$queryRaw<{ count: number }[]>`
    SELECT count(*)::int AS count FROM cloudflare_resume_jobs
    WHERE owner_id = ${userId} AND created_at > now() - interval '60 seconds'`;
  return (rows[0]?.count ?? 0) < 15;
}
