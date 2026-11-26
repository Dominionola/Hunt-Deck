import { z } from "zod";
import type { QuotaBreachAlert } from "./usageQuotas";

const opsAlertPayloadSchema = z.object({
  service: z.literal("huntdeck"),
  severity: z.enum(["warning", "critical"]),
  category: z.enum(["quota_breach", "queue_health", "dead_letter"]),
  summary: z.string().min(1).max(200),
  counts: z.record(z.string(), z.number().int().min(0)).optional(),
  timestamp: z.string().datetime(),
}).strict();

export type OpsAlertPayload = z.infer<typeof opsAlertPayloadSchema>;

/** Dispatch an aggregate-only operational alert to an HTTPS webhook; never sends PII or secrets. */
export async function sendOpsAlert(
  payload: Omit<OpsAlertPayload, "service" | "timestamp">,
  options?: { webhookUrl?: string; fetcher?: typeof fetch },
): Promise<{ sent: boolean; skipped: boolean }> {
  const rawUrl = (options?.webhookUrl ?? process.env.OPS_ALERT_WEBHOOK_URL ?? "").trim();
  if (!rawUrl) {
    return { sent: false, skipped: true };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("Invalid OPS_ALERT_WEBHOOK_URL.");
  }
  if (parsedUrl.protocol !== "https:") {
    throw new Error("OPS_ALERT_WEBHOOK_URL must use HTTPS.");
  }

  const body = opsAlertPayloadSchema.parse({
    service: "huntdeck",
    ...payload,
    timestamp: new Date().toISOString(),
  });

  const fetcher = options?.fetcher ?? globalThis.fetch;
  const response = await fetcher(parsedUrl.toString(), {
    method: "POST",
    signal: AbortSignal.timeout(5_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await response.body?.cancel();

  if (!response.ok) {
    throw new Error("Operational alert webhook failed.");
  }
  return { sent: true, skipped: false };
}

export function formatQuotaBreachSummary(alerts: readonly QuotaBreachAlert[]): string {
  if (!alerts.length) return "All provider quotas healthy.";
  return `Provider quota alerts: ${alerts.map((a) => `${a.provider}:${a.reason}`).join(", ").slice(0, 170)}`;
}
