/**
 * Hunt Deck — 1,024-Dimensional Dense Vector Embeddings via Cloudflare Workers AI
 *
 * Target Model: @cf/baai/bge-m3 (1024 dimensions)
 *
 * Invariants:
 *  - Both candidate resumes and job postings MUST be embedded with the identical model and version.
 *  - Separate storage from legacy 1536-dim vectors.
 *  - Model isolation: NEVER compare embeddings from different models or versions.
 *  - Content Hash: SHA-256 hash of normalized text avoids re-embedding unchanged records.
 *  - Privacy-Safe: Zero logging of raw resume or job text.
 */

import crypto from "node:crypto";
import { recordAiCallTelemetry } from "./aiTelemetry";

export const CLOUDFLARE_BGE_M3_MODEL = "@cf/baai/bge-m3";
export const CLOUDFLARE_BGE_M3_VERSION = "1.0";
export const CLOUDFLARE_BGE_M3_DIMENSIONS = 1024;

/**
 * Primary dense embedding generator using Cloudflare Workers AI @cf/baai/bge-m3 (1024-dim).
 * Embeds both candidate resume and job posting text with the same model and version.
 */
export async function generateCandidateOrJobEmbedding(text: string): Promise<TypedEmbedding> {
  return generateCloudflareEmbedding(text);
}

export interface TypedEmbedding {
  model: string;
  version: string;
  dimensions: number;
  contentHash: string;
  vector: number[];
  embeddedAt: string;
}

export function computeContentHash(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function getCloudflareAiConfig(): {
  accountId: string;
  apiToken: string;
  model: string;
  version: string;
  endpoint: string;
} {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error(
      "Cloudflare Workers AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN."
    );
  }

  const model = process.env.CLOUDFLARE_EMBEDDING_MODEL || CLOUDFLARE_BGE_M3_MODEL;
  const version = process.env.CLOUDFLARE_EMBEDDING_VERSION || CLOUDFLARE_BGE_M3_VERSION;
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  return { accountId, apiToken, model, version, endpoint };
}

/**
 * Generates 1,024-dim dense embedding vector using Cloudflare Workers AI @cf/baai/bge-m3
 */
export async function generateCloudflareEmbedding(text: string): Promise<TypedEmbedding> {
  const sanitized = text.replace(/\s+/g, " ").trim().slice(0, 8000);
  if (!sanitized) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  const contentHash = computeContentHash(sanitized);
  const { apiToken, model, version, endpoint } = getCloudflareAiConfig();
  const startTime = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [sanitized],
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      throw Object.assign(new Error(`Cloudflare Workers AI error HTTP ${response.status}`), { status: response.status });
    }

    const json = await response.json();
    let vector: number[] | undefined;

    // Cloudflare Workers AI returns { result: { data: [[...1024 floats...]] } }
    if (json?.result?.data?.[0] && Array.isArray(json.result.data[0])) {
      vector = json.result.data[0];
    } else if (json?.result && Array.isArray(json.result) && typeof json.result[0] === "number") {
      vector = json.result;
    }

    if (!vector || vector.length !== CLOUDFLARE_BGE_M3_DIMENSIONS || !vector.every((value) => typeof value === "number" && Number.isFinite(value))) {
      throw new Error(
        `Cloudflare Workers AI returned invalid vector dimensions: expected ${CLOUDFLARE_BGE_M3_DIMENSIONS}, received ${vector?.length ?? 0}`
      );
    }

    // Token accounting approximation (~1 token per 4 characters)
    const approxTokens = Math.max(1, Math.round(sanitized.length / 4));

    recordAiCallTelemetry({
      provider: "cloudflare_workers_ai",
      model,
      inputTokens: approxTokens,
      outputTokens: 0,
      latencyMs,
      success: true,
    });

    return {
      model,
      version,
      dimensions: CLOUDFLARE_BGE_M3_DIMENSIONS,
      contentHash,
      vector,
      embeddedAt: new Date().toISOString(),
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    recordAiCallTelemetry({
      provider: "cloudflare_workers_ai",
      model,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      success: false,
      // Parser/network error messages may quote a response or request content.
      errorCode: "EMBEDDING_ERROR",
    });

    throw error;
  }
}

/**
 * Computes cosine similarity between two typed embeddings.
 * Strict Invariant: NEVER compares embeddings across different models or versions.
 */
export function safeCosineSimilarity(a: TypedEmbedding, b: TypedEmbedding): number {
  if (a.model !== b.model || a.version !== b.version) {
    throw new Error(
      `Model Isolation Violation: Cannot compare embeddings from different models or versions: "${a.model}@${a.version}" vs "${b.model}@${b.version}".`
    );
  }

  if (a.dimensions !== b.dimensions || a.vector.length !== b.vector.length) {
    throw new Error(
      `Dimension Mismatch: Vector dimensions do not match (${a.dimensions} vs ${b.dimensions}).`
    );
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.vector.length; i++) {
    dotProduct += a.vector[i] * b.vector[i];
    normA += a.vector[i] * a.vector[i];
    normB += b.vector[i] * b.vector[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates deterministic 1024-dim mock vector for local testing when Cloudflare credentials are not set.
 */
export function generateMockBgeM3Embedding(text: string): TypedEmbedding {
  const contentHash = computeContentHash(text);
  const vector: number[] = new Array(CLOUDFLARE_BGE_M3_DIMENSIONS).fill(0);

  let hashVal = 0;
  for (let i = 0; i < contentHash.length; i++) {
    hashVal = (hashVal << 5) - hashVal + contentHash.charCodeAt(i);
    hashVal |= 0;
  }

  let sumSq = 0;
  for (let i = 0; i < CLOUDFLARE_BGE_M3_DIMENSIONS; i++) {
    const val = Math.sin((hashVal + i) * 0.17);
    vector[i] = val;
    sumSq += val * val;
  }

  const norm = Math.sqrt(sumSq);
  const normalizedVector = vector.map((v) => (norm > 0 ? v / norm : 0));

  return {
    model: "synthetic-test-embedding",
    version: "1",
    dimensions: CLOUDFLARE_BGE_M3_DIMENSIONS,
    contentHash,
    vector: normalizedVector,
    embeddedAt: new Date().toISOString(),
  };
}
