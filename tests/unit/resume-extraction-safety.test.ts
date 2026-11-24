import { it } from "node:test";
import assert from "node:assert/strict";
import { extractResumeEntities } from "../../src/services/ai/resumeExtractor";
import { resumeParsedDataSchema } from "../../src/lib/validations/resume";
import { extractResumeEntitiesWithGroq } from "../../src/services/ai/groqExtractor";
import { getAiTelemetrySummary, clearAiTelemetry } from "../../src/services/ai/aiTelemetry";

it("fails closed rather than fabricating a resume when extraction is unconfigured", async () => {
  const prevGroq = process.env.GROQ_API_KEY;
  const prevOpenAI = process.env.OPENAI_API_KEY;
  const prevFallback = process.env.ALLOW_LEGACY_OPENAI_FALLBACK;
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ALLOW_LEGACY_OPENAI_FALLBACK;

  try {
    await assert.rejects(extractResumeEntities("Synthetic candidate resume"), /not configured/);
    await assert.rejects(
      extractResumeEntities("Synthetic candidate resume"),
      /Resume extraction is not configured\. Set GROQ_API_KEY\./
    );
  } finally {
    if (prevGroq !== undefined) process.env.GROQ_API_KEY = prevGroq;
    if (prevOpenAI !== undefined) process.env.OPENAI_API_KEY = prevOpenAI;
    if (prevFallback !== undefined) process.env.ALLOW_LEGACY_OPENAI_FALLBACK = prevFallback;
  }
});

it("does NOT silently fall back to legacy provider unless explicitly approved", async () => {
  const prevGroq = process.env.GROQ_API_KEY;
  const prevOpenAI = process.env.OPENAI_API_KEY;
  const prevFallback = process.env.ALLOW_LEGACY_OPENAI_FALLBACK;
  delete process.env.GROQ_API_KEY;
  process.env.OPENAI_API_KEY = "legacy-key";
  delete process.env.ALLOW_LEGACY_OPENAI_FALLBACK;

  try {
    await assert.rejects(
      extractResumeEntities("Synthetic candidate resume"),
      /Resume extraction is not configured\. Set GROQ_API_KEY\./
    );
  } finally {
    if (prevGroq !== undefined) process.env.GROQ_API_KEY = prevGroq;
    if (prevOpenAI !== undefined) process.env.OPENAI_API_KEY = prevOpenAI;
    if (prevFallback !== undefined) process.env.ALLOW_LEGACY_OPENAI_FALLBACK = prevFallback;
  }
});

it("rejects malformed candidate profiles", () => {
  assert.equal(resumeParsedDataSchema.safeParse({ fullName: "Synthetic Candidate", skills: "invented" }).success, false);
  assert.equal(
    resumeParsedDataSchema.safeParse({ fullName: "Synthetic Candidate", skills: "invented" }).success,
    false
  );
});

it("validates structured extraction output and records token accounting", async () => {
  clearAiTelemetry();
  const prevGroq = process.env.GROQ_API_KEY;
  const prevFetch = globalThis.fetch;

  process.env.GROQ_API_KEY = "mock-groq-key";
  process.env.GROQ_MODEL = "openai/gpt-oss-120b";

  // Mock Groq API response using synthetic data
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        id: "chatcmpl-mock",
        object: "chat.completion",
        created: Date.now(),
        model: "openai/gpt-oss-120b",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: JSON.stringify({
                fullName: "Synthetic Candidate",
                email: "synthetic@example.com",
                phone: "+1-555-0100",
                location: "San Francisco, CA",
                summary: "Systems architect specializing in distributed services.",
                skills: ["TypeScript", "Distributed Systems", "PostgreSQL"],
                experience: [
                  {
                    company: "Synthetic Labs",
                    title: "Staff Engineer",
                    startDate: "2022",
                    isCurrent: true,
                    bullets: ["Engineered streaming pipelines with 99.99% availability"],
                  },
                ],
                education: [
                  {
                    institution: "Tech University",
                    degree: "B.S. Computer Science",
                    fieldOfStudy: "Computer Science",
                    graduationYear: "2020",
                  },
                ],
                projects: [],
              }),
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 350,
          completion_tokens: 180,
          total_tokens: 530,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const result = await extractResumeEntitiesWithGroq("Synthetic resume content");
    assert.equal(result.data.fullName, "Synthetic Candidate");
    assert.equal(result.data.skills[0], "TypeScript");
    assert.equal(result.provider, "groq");
    assert.equal(result.model, "openai/gpt-oss-120b");
    assert.equal(result.tokenUsage.totalTokens, 530);

    const summary = getAiTelemetrySummary();
    const groqSummary = summary.find((s) => s.provider === "groq");
    assert.ok(groqSummary);
    assert.equal(groqSummary?.totalRequests, 1);
    assert.equal(groqSummary?.totalInputTokens, 350);
    assert.equal(groqSummary?.totalOutputTokens, 180);
    assert.ok(groqSummary && groqSummary.totalEstimatedCostUsd > 0);
  } finally {
    globalThis.fetch = prevFetch;
    if (prevGroq !== undefined) {
      process.env.GROQ_API_KEY = prevGroq;
    } else {
      delete process.env.GROQ_API_KEY;
    }
  }
});
