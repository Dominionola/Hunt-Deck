/**
 * Hunt Deck — Privacy-Safe AI Telemetry & Cost Accounting
 *
 * Strict Privacy Invariant:
 * - NEVER log secrets, API keys, resume text, job descriptions, prompts, or model responses.
 * - Records ONLY aggregate request counts, provider, model, token usage, latency, error codes, and estimated cost.
 */

export type AiProvider = "gemini" | "groq" | "cloudflare_workers_ai" | "anthropic" | "openai";

export interface AiUsageMetrics {
  provider: AiProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  timestamp: string;
  estimatedCostUsd: number;
}

export interface ProviderCostSummary {
  provider: AiProvider;
  model: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  totalEstimatedCostUsd: number;
}

// Pricing per million tokens (USD) - standard published rates
const PRICING_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  // Gemini 3.8 Flash (paid tier)
  "gemini-3.8-flash": { input: 0.075, output: 0.30 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  // Groq (hosted models)
  "openai/gpt-oss-120b": { input: 0.15, output: 0.60 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  // Cloudflare Workers AI (@cf/baai/bge-m3 embeddings)
  // Cloudflare charges ~$0.011 per 1,000 neurons (~$0.011 / 1M tokens equivalent)
  "@cf/baai/bge-m3": { input: 0.011, output: 0.0 },
  // Anthropic Claude 3.5 Sonnet
  "claude-3-5-sonnet-latest": { input: 3.0, output: 15.0 },
  // OpenAI text-embedding-3-large
  "text-embedding-3-large": { input: 0.13, output: 0.0 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = PRICING_PER_1M_TOKENS[model] || { input: 0.10, output: 0.40 };
  const inputCost = (inputTokens / 1_000_000) * rates.input;
  const outputCost = (outputTokens / 1_000_000) * rates.output;
  return Number((inputCost + outputCost).toFixed(6));
}

// In-memory telemetry accumulator
const telemetryStore: AiUsageMetrics[] = [];

export function recordAiCallTelemetry(params: {
  provider: AiProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
}): AiUsageMetrics {
  const estimatedCostUsd = estimateCost(params.model, params.inputTokens, params.outputTokens);

  const metric: AiUsageMetrics = {
    provider: params.provider,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    totalTokens: params.inputTokens + params.outputTokens,
    latencyMs: Math.round(params.latencyMs),
    success: params.success,
    errorCode: params.errorCode,
    timestamp: new Date().toISOString(),
    estimatedCostUsd,
  };

  telemetryStore.push(metric);
  if (telemetryStore.length > 1000) {
    telemetryStore.shift();
  }

  return metric;
}

export function getAiTelemetrySummary(): ProviderCostSummary[] {
  const summaryMap = new Map<string, ProviderCostSummary>();

  for (const m of telemetryStore) {
    const key = `${m.provider}:${m.model}`;
    let item = summaryMap.get(key);
    if (!item) {
      item = {
        provider: m.provider,
        model: m.model,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        avgLatencyMs: 0,
        totalEstimatedCostUsd: 0,
      };
      summaryMap.set(key, item);
    }

    const prevTotal = item.totalRequests;
    item.totalRequests += 1;
    if (m.success) {
      item.successfulRequests += 1;
    } else {
      item.failedRequests += 1;
    }
    item.totalInputTokens += m.inputTokens;
    item.totalOutputTokens += m.outputTokens;
    item.totalTokens += m.totalTokens;
    item.avgLatencyMs = Math.round((item.avgLatencyMs * prevTotal + m.latencyMs) / item.totalRequests);
    item.totalEstimatedCostUsd = Number((item.totalEstimatedCostUsd + m.estimatedCostUsd).toFixed(6));
  }

  return Array.from(summaryMap.values());
}

export function clearAiTelemetry(): void {
  telemetryStore.length = 0;
}
