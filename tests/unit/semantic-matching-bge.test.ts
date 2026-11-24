import { it } from "node:test";
import assert from "node:assert/strict";
import {
  generateCloudflareEmbedding,
  generateCandidateOrJobEmbedding,
  generateMockBgeM3Embedding,
  safeCosineSimilarity,
  computeContentHash,
  CLOUDFLARE_BGE_M3_MODEL,
  type TypedEmbedding,
} from "../../src/services/ai/cloudflareEmbeddingService";
import { getAiTelemetrySummary, clearAiTelemetry } from "../../src/services/ai/aiTelemetry";

it("fails closed when Cloudflare credentials are missing", async () => {
  const prevAcc = process.env.CLOUDFLARE_ACCOUNT_ID;
  const prevTok = process.env.CLOUDFLARE_AI_API_TOKEN;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_AI_API_TOKEN;

  try {
    await assert.rejects(
      generateCloudflareEmbedding("Synthetic text"),
      /Cloudflare Workers AI is not configured/
    );
    await assert.rejects(generateCandidateOrJobEmbedding("Synthetic text"), /not configured/);
  } finally {
    if (prevAcc !== undefined) process.env.CLOUDFLARE_ACCOUNT_ID = prevAcc;
    if (prevTok !== undefined) process.env.CLOUDFLARE_AI_API_TOKEN = prevTok;
  }
});

it("computes deterministic SHA-256 content hashes to avoid re-embedding unchanged records", () => {
  const textA = "Senior Staff Systems Engineer at Stripe\nTypeScript & Distributed Systems";
  const textB = "senior staff systems engineer at stripe  typescript & distributed systems";
  const hashA = computeContentHash(textA);
  const hashB = computeContentHash(textB);

  assert.equal(hashA, hashB, "Normalized text must yield identical content hashes");
  assert.equal(hashA.length, 64, "SHA-256 hex string must be 64 characters");
});

it("generates normalized 1,024-dimensional mock vector for local dev/testing", () => {
  const embedding = generateMockBgeM3Embedding("Staff Platform Engineer");

  assert.equal(embedding.dimensions, 1024);
  assert.equal(embedding.vector.length, 1024);
  assert.equal(embedding.model, "synthetic-test-embedding");
  assert.notEqual(embedding.model, CLOUDFLARE_BGE_M3_MODEL);
  assert.throws(() => safeCosineSimilarity(embedding, { ...embedding, model: CLOUDFLARE_BGE_M3_MODEL }), /Model Isolation Violation/);

  // Compute L2 norm (should be ~1.0)
  const norm = Math.sqrt(embedding.vector.reduce((sum, v) => sum + v * v, 0));
  assert.ok(Math.abs(norm - 1.0) < 1e-4, "Vector must be unit normalized");
});

it("enforces strict model and version isolation: NEVER compares embeddings across models or versions", () => {
  const emb1: TypedEmbedding = {
    model: "@cf/baai/bge-m3",
    version: "1.0",
    dimensions: 1024,
    contentHash: "hash1",
    vector: new Array(1024).fill(0.03125),
    embeddedAt: new Date().toISOString(),
  };

  const embDifferentModel: TypedEmbedding = {
    model: "text-embedding-3-large",
    version: "1.0",
    dimensions: 1024,
    contentHash: "hash2",
    vector: new Array(1024).fill(0.03125),
    embeddedAt: new Date().toISOString(),
  };

  const embDifferentVersion: TypedEmbedding = {
    model: "@cf/baai/bge-m3",
    version: "2.0",
    dimensions: 1024,
    contentHash: "hash3",
    vector: new Array(1024).fill(0.03125),
    embeddedAt: new Date().toISOString(),
  };

  assert.throws(
    () => safeCosineSimilarity(emb1, embDifferentModel),
    /Model Isolation Violation/
  );

  assert.throws(
    () => safeCosineSimilarity(emb1, embDifferentVersion),
    /Model Isolation Violation/
  );
});

it("computes accurate cosine similarity between compatible 1024-dim embeddings", () => {
  const embA = generateMockBgeM3Embedding("Distributed database architecture");
  const embB = generateMockBgeM3Embedding("Distributed database architecture");
  const embC = generateMockBgeM3Embedding("Organic gardening and botanical tea brewing");

  const identicalScore = safeCosineSimilarity(embA, embB);
  assert.ok(Math.abs(identicalScore - 1.0) < 1e-4, "Identical text should have similarity ~1.0");

  const diffScore = safeCosineSimilarity(embA, embC);
  assert.ok(diffScore < 0.9, "Unrelated text should have lower similarity score");
});

it("validates Cloudflare API response and records telemetry", async () => {
  clearAiTelemetry();
  const prevAcc = process.env.CLOUDFLARE_ACCOUNT_ID;
  const prevTok = process.env.CLOUDFLARE_AI_API_TOKEN;
  const prevFetch = globalThis.fetch;

  process.env.CLOUDFLARE_ACCOUNT_ID = "mock-cf-account";
  process.env.CLOUDFLARE_AI_API_TOKEN = "mock-cf-token";

  const mockVector = new Array(1024).fill(0.03125);

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        result: {
          shape: [1, 1024],
          data: [mockVector],
        },
        success: true,
        errors: [],
        messages: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const result = await generateCloudflareEmbedding("Lead Systems Engineer");
    assert.equal(result.dimensions, 1024);
    assert.equal(result.vector.length, 1024);
    assert.equal(result.model, CLOUDFLARE_BGE_M3_MODEL);

    const summary = getAiTelemetrySummary();
    const cfSummary = summary.find((s) => s.provider === "cloudflare_workers_ai");
    assert.ok(cfSummary);
    assert.equal(cfSummary?.totalRequests, 1);
    mockVector[0] = Number.NaN;
    await assert.rejects(generateCloudflareEmbedding("Synthetic text"), /invalid vector dimensions/);
  } finally {
    globalThis.fetch = prevFetch;
    if (prevAcc !== undefined) process.env.CLOUDFLARE_ACCOUNT_ID = prevAcc;
    else delete process.env.CLOUDFLARE_ACCOUNT_ID;
    if (prevTok !== undefined) process.env.CLOUDFLARE_AI_API_TOKEN = prevTok;
    else delete process.env.CLOUDFLARE_AI_API_TOKEN;
  }
});

it("does not read content-bearing provider error messages for telemetry", async () => {
  const previous = { account: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_AI_API_TOKEN, fetch: globalThis.fetch };
  process.env.CLOUDFLARE_ACCOUNT_ID = "synthetic-account";
  process.env.CLOUDFLARE_AI_API_TOKEN = "synthetic-token";
  let messageRead = false;
  const failure = new Error();
  Object.defineProperty(failure, "message", { get() { messageRead = true; return "PRIVATE_RESPONSE_CONTENT"; } });
  globalThis.fetch = async () => { throw failure; };
  try {
    await assert.rejects(generateCloudflareEmbedding("Synthetic verification text"), (error: unknown) => error === failure);
    assert.equal(messageRead, false);
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.account === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = previous.account;
    if (previous.token === undefined) delete process.env.CLOUDFLARE_AI_API_TOKEN;
    else process.env.CLOUDFLARE_AI_API_TOKEN = previous.token;
  }
});
