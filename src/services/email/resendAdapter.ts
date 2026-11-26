import { createHash } from "node:crypto";
import { z } from "zod";
import { emitTelemetryEvent } from "@/lib/telemetry";

export const sendTransactionalEmailSchema = z.object({
  ownerId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  to: z.string().email().max(320),
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(100_000),
  text: z.string().min(1).max(50_000),
  idempotencyKey: z.string().min(8).max(128).regex(/^[a-zA-Z0-9:_-]+$/),
}).strict();

export type SendTransactionalEmailInput = z.infer<typeof sendTransactionalEmailSchema>;

export interface ResendAdapterConfig {
  apiKey?: string;
  from?: string;
  maxPerHour?: number;
  maxAttempts?: number;
  fetcher?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  rateBuckets?: Map<string, number[]>;
}

export interface EmailSendResult {
  id: string;
  attempts: number;
}

const defaultRateBuckets = new Map<string, number[]>();

function isPlaceholderKey(key: string): boolean {
  return !key || key === "re_your_resend_api_key" || key.includes("your_resend_api_key");
}

function getResendConfig(config?: ResendAdapterConfig): { apiKey: string; from: string } {
  if (typeof window !== "undefined") {
    throw new Error("Resend email adapter is server-only.");
  }
  const apiKey = (config?.apiKey ?? process.env.RESEND_API_KEY ?? "").trim();
  const from = (config?.from ?? process.env.EMAIL_FROM ?? "").trim();

  if (isPlaceholderKey(apiKey) || !from || !from.includes("@")) {
    throw new Error("Transactional email service is not configured.");
  }
  return { apiKey, from };
}

function checkInMemoryRateLimit(buckets: Map<string, number[]>, ownerHash: string, maxPerHour: number, now: number): boolean {
  const windowStart = now - 3600_000;
  const recent = (buckets.get(ownerHash) ?? []).filter((ts) => ts > windowStart);
  if (recent.length >= maxPerHour) {
    buckets.set(ownerHash, recent);
    return false;
  }
  recent.push(now);
  buckets.set(ownerHash, recent);
  return true;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * Send a transactional email via Resend with strict server-only bounds,
 * per-owner sliding-window rate limiting, Idempotency-Key forwarding,
 * bounded exponential retries, and zero-PII telemetry/errors.
 */
export async function sendTransactionalEmail(
  rawInput: SendTransactionalEmailInput,
  config?: ResendAdapterConfig,
): Promise<EmailSendResult> {
  const { apiKey, from } = getResendConfig(config);
  const input = sendTransactionalEmailSchema.parse(rawInput);

  const maxPerHour = Math.max(1, Math.min(50, Math.trunc(config?.maxPerHour ?? 5)));
  const maxAttempts = Math.max(1, Math.min(5, Math.trunc(config?.maxAttempts ?? 3)));
  const fetcher = config?.fetcher ?? globalThis.fetch;
  const sleep = config?.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const buckets = config?.rateBuckets ?? defaultRateBuckets;

  const ownerHash = createHash("sha256").update(input.ownerId).digest("hex");
  if (!checkInMemoryRateLimit(buckets, ownerHash, maxPerHour, Date.now())) {
    emitTelemetryEvent("email_rate_limited", ownerHash, { maxPerHour });
    throw new Error("Email rate limit exceeded. Please try again later.");
  }

  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });

      lastStatus = response.status;
      if (response.ok) {
        const body = (await response.json()) as { id?: unknown } | null;
        const messageId = typeof body?.id === "string" && body.id ? body.id : "sent";
        emitTelemetryEvent("email_sent", ownerHash, { attempt, status: response.status });
        return { id: messageId, attempts: attempt };
      }

      await response.body?.cancel();
      if (!isRetryableStatus(response.status) || attempt >= maxAttempts) {
        emitTelemetryEvent("email_delivery_failed", ownerHash, {
          attempt,
          status: response.status,
          retryable: isRetryableStatus(response.status),
        });
        throw new Error("Transactional email delivery failed.");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Transactional email delivery failed.") {
        throw error;
      }
      if (attempt >= maxAttempts) {
        emitTelemetryEvent("email_delivery_failed", ownerHash, {
          attempt,
          status: lastStatus ?? 0,
          retryable: true,
        });
        throw new Error("Transactional email delivery failed.");
      }
    }

    await sleep(Math.min(5000, 250 * 2 ** (attempt - 1)));
  }

  throw new Error("Transactional email delivery failed.");
}
