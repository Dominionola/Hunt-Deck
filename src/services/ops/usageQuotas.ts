import { getAiTelemetrySummary, type AiProvider, type ProviderCostSummary } from "@/services/ai/aiTelemetry";

export interface ProviderQuotaLimit {
  maxRequests: number;
  maxEstimatedCostUsd: number;
  maxFailureRate: number;
}

export const DEFAULT_PROVIDER_QUOTAS: Record<AiProvider, ProviderQuotaLimit> = {
  groq: { maxRequests: 500, maxEstimatedCostUsd: 5.0, maxFailureRate: 0.25 },
  cloudflare_workers_ai: { maxRequests: 2000, maxEstimatedCostUsd: 2.0, maxFailureRate: 0.2 },
  gemini: { maxRequests: 300, maxEstimatedCostUsd: 10.0, maxFailureRate: 0.25 },
  anthropic: { maxRequests: 200, maxEstimatedCostUsd: 15.0, maxFailureRate: 0.25 },
  openai: { maxRequests: 200, maxEstimatedCostUsd: 10.0, maxFailureRate: 0.25 },
};

export const RETENTION_AND_SLO_POLICY = {
  stagedOrphanR2MaxAgeHours: 24,
  completedQueueJobRetentionHours: 24,
  failedQueueJobRetentionHours: 24,
  uploadEnqueueP95Ms: 500,
  statusPollP95Ms: 250,
  resumeWorkerP95Ms: 20_000,
  healthProbeTimeoutMs: 5_000,
  signedDownloadMaxTtlSeconds: 300,
  signedUploadMaxTtlSeconds: 900,
} as const;

export interface QuotaBreachAlert {
  provider: AiProvider;
  model: string;
  reason: "requests_exceeded" | "cost_exceeded" | "failure_rate_exceeded";
}

/** Evaluate aggregate provider usage against configured budgets without reading user data. */
export function evaluateProviderQuotaStatus(
  summaries: readonly ProviderCostSummary[] = getAiTelemetrySummary(),
  quotas: Record<AiProvider, ProviderQuotaLimit> = DEFAULT_PROVIDER_QUOTAS,
): { ok: boolean; alerts: QuotaBreachAlert[] } {
  const alerts: QuotaBreachAlert[] = [];

  for (const item of summaries) {
    const limit = quotas[item.provider];
    if (!limit) continue;
    if (item.totalRequests > limit.maxRequests) {
      alerts.push({ provider: item.provider, model: item.model, reason: "requests_exceeded" });
    }
    if (item.totalEstimatedCostUsd > limit.maxEstimatedCostUsd) {
      alerts.push({ provider: item.provider, model: item.model, reason: "cost_exceeded" });
    }
    if (item.totalRequests >= 5 && item.failedRequests / item.totalRequests > limit.maxFailureRate) {
      alerts.push({ provider: item.provider, model: item.model, reason: "failure_rate_exceeded" });
    }
  }

  return { ok: alerts.length === 0, alerts };
}
