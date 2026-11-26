import { createHash } from "node:crypto";
import { validatePdfUpload } from "@/lib/validations/upload";
import {
  CLOUDFLARE_BGE_M3_DIMENSIONS,
  CLOUDFLARE_BGE_M3_MODEL,
  CLOUDFLARE_BGE_M3_VERSION,
  computeContentHash,
  generateCandidateOrJobEmbedding,
  type TypedEmbedding,
} from "@/services/ai/cloudflareEmbeddingService";
import { recordAiCallTelemetry } from "@/services/ai/aiTelemetry";
import { extractResumeEntities } from "@/services/ai/resumeExtractor";
import { parsePdfBuffer } from "@/services/parsing/resumeParser";
import { readStagedResume } from "@/services/storage/r2Service";
import type { CloudflareResumeProcessorDeps } from "./cloudflareResumeProcessor";

export interface WorkersR2Object {
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface WorkersR2Bucket {
  get(key: string): Promise<WorkersR2Object | null>;
}

export interface WorkersAiBinding {
  run(model: string, input: { text: string[] }): Promise<unknown>;
}

export interface WorkersBindingEnv {
  RESUMES_BUCKET?: WorkersR2Bucket;
  AI?: WorkersAiBinding;
  R2_BUCKET_NAME?: string;
}

const VALID_USER_ID_RE = /^[a-zA-Z0-9_-]+$/;
const VALID_KEY_RE = /^resumes\/[a-zA-Z0-9_-]+\/[a-f0-9]{64}\.pdf$/;

/** Read and verify an owner-scoped PDF from a Cloudflare Worker R2 binding. */
export function createWorkersR2Reader(bucket: WorkersR2Bucket): (userId: string, key: string) => Promise<Buffer> {
  return async (userId: string, key: string) => {
    if (!VALID_USER_ID_RE.test(userId) || !key.startsWith(`resumes/${userId}/`) || !VALID_KEY_RE.test(key)) {
      throw new Error("Invalid resume storage reference.");
    }
    const obj = await bucket.get(key);
    if (!obj || obj.size > 10 * 1024 * 1024) {
      throw new Error("Invalid staged resume.");
    }
    const buffer = Buffer.from(await obj.arrayBuffer());
    if (!validatePdfUpload({ name: "resume.pdf", type: "application/pdf", size: buffer.length }, buffer)) {
      throw new Error("Invalid staged resume.");
    }
    const expectedHash = key.split("/").pop()?.slice(0, 64);
    if (createHash("sha256").update(buffer).digest("hex") !== expectedHash) {
      throw new Error("Invalid staged resume.");
    }
    return buffer;
  };
}

/** Generate a 1024-dim BGE-M3 embedding using a Cloudflare Worker AI binding. */
export function createWorkersAiEmbeddingGenerator(
  ai: WorkersAiBinding,
  options?: { model?: string; version?: string },
): (text: string) => Promise<TypedEmbedding> {
  const model = options?.model || CLOUDFLARE_BGE_M3_MODEL;
  const version = options?.version || CLOUDFLARE_BGE_M3_VERSION;

  return async (text: string): Promise<TypedEmbedding> => {
    const sanitized = text.replace(/\s+/g, " ").trim().slice(0, 8000);
    if (!sanitized) {
      throw new Error("Cannot generate embedding for empty text.");
    }
    const contentHash = computeContentHash(sanitized);
    const startTime = Date.now();
    try {
      const json = (await ai.run(model, { text: [sanitized] })) as {
        data?: unknown[];
        result?: { data?: unknown[] };
      } | null;
      const candidate = Array.isArray(json?.data?.[0])
        ? json?.data?.[0]
        : Array.isArray(json?.result?.data?.[0])
          ? json?.result?.data?.[0]
          : undefined;
      const vector = Array.isArray(candidate)
        ? (candidate as number[])
        : undefined;

      if (
        !vector ||
        vector.length !== CLOUDFLARE_BGE_M3_DIMENSIONS ||
        !vector.every((value) => typeof value === "number" && Number.isFinite(value))
      ) {
        throw new Error(`Cloudflare Workers AI returned invalid vector dimensions: expected ${CLOUDFLARE_BGE_M3_DIMENSIONS}, received ${vector?.length ?? 0}`);
      }

      const latencyMs = Date.now() - startTime;
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
      recordAiCallTelemetry({
        provider: "cloudflare_workers_ai",
        model,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
        success: false,
        errorCode: "EMBEDDING_ERROR",
      });
      throw error;
    }
  };
}

/** Build processor dependencies preferring Worker bindings when present. */
export function createWorkersProcessorDeps(env: WorkersBindingEnv): CloudflareResumeProcessorDeps {
  return {
    readStagedResume: env.RESUMES_BUCKET ? createWorkersR2Reader(env.RESUMES_BUCKET) : readStagedResume,
    parsePdfBuffer,
    extractResumeEntities,
    generateEmbedding: env.AI ? createWorkersAiEmbeddingGenerator(env.AI) : generateCandidateOrJobEmbedding,
    r2BucketName: env.R2_BUCKET_NAME,
  };
}
