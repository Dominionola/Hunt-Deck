import { it } from "node:test";
import assert from "node:assert/strict";
import {
  generateCoverLetterWithGemini,
  coverLetterParagraphsSchema,
} from "../../src/services/ai/geminiWriter";
import {
  generateTailoredCoverLetter,
  buildDeterministicCoverLetter,
} from "../../src/services/ai/coverLetterGenerator";
import type { ResumeParsedData } from "../../src/lib/validations/resume";
import type { CompanyContextBrief } from "../../src/services/ai/companyResearchService";
import { getAiTelemetrySummary, clearAiTelemetry } from "../../src/services/ai/aiTelemetry";

const MOCK_CANDIDATE: ResumeParsedData = {
  fullName: "Alice Morgan",
  email: "alice@example.com",
  summary: "Distributed systems architect with 8 years building real-time databases.",
  skills: ["Go", "TypeScript", "Distributed Systems", "PostgreSQL", "Raft"],
  experience: [
    {
      company: "CloudScale Systems",
      title: "Lead Infrastructure Engineer",
      startDate: "2020",
      endDate: "Present",
      isCurrent: true,
      bullets: [
        "Architected distributed Raft consensus engine processing 45,000 queries per second with sub-10ms p99 latency.",
      ],
    },
  ],
  education: [
    {
      institution: "MIT",
      degree: "B.S.",
      fieldOfStudy: "Computer Science",
      graduationYear: "2018",
    },
  ],
  projects: [],
};

const MOCK_BRIEF: CompanyContextBrief = {
  companyName: "Acme Corp",
  domain: "acme.com",
  mission: "Accelerating global commerce through resilient cloud systems.",
  fundingStage: "Series D",
  headcountEstimate: "500-1000",
  recentNewsOrInitiatives: ["Expanded enterprise edge nodes to 45 regions"],
  techStack: ["Go", "PostgreSQL", "Kafka"],
  engineeringCultureValues: ["High agency and radical candor", "Obsession with low latency"],
  coreRoleChallenge: "Scale distributed transaction coordinator",
  verifiedFactHook: "Acme Corp's recent expansion of enterprise edge nodes across 45 regions",
};

it("fails closed when GEMINI_API_KEY is not configured and does not silently fall back to unpaid service", async () => {
  const prevGemini = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    await assert.rejects(
      generateCoverLetterWithGemini({
        candidate: MOCK_CANDIDATE,
        companyName: "Acme Corp",
        roleTitle: "Staff Systems Engineer",
        companyBrief: MOCK_BRIEF,
        tone: "executive",
      }),
      /Gemini API is not configured/
    );
  } finally {
    if (prevGemini !== undefined) process.env.GEMINI_API_KEY = prevGemini;
  }
});

it("rejects invalid Gemini responses that violate paragraph schema", () => {
  const invalidOutput = {
    hook: "Too short",
    evidence: "Also short",
  };
  const parseResult = coverLetterParagraphsSchema.safeParse(invalidOutput);
  assert.equal(parseResult.success, false);
});

it("validates structured Gemini response and accounts for tokens and cost", async () => {
  clearAiTelemetry();
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevFetch = globalThis.fetch;

  process.env.GEMINI_API_KEY = "mock-paid-gemini-key";
  process.env.GEMINI_MODEL = "gemini-3.8-flash";

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    hook: "Observing Acme Corp's recent expansion of enterprise edge nodes across 45 regions, it is evident that systems reliability dictates business velocity.",
                    evidence: "At CloudScale Systems, I architected a distributed Raft consensus engine processing 45,000 queries per second with sub-10ms p99 latency.",
                    connection: "Acme Corp's obsession with low latency matches how I lead distributed platform initiatives with high agency.",
                    close: "Let us coordinate a direct conversation this month to discuss how this experience will accelerate your quarterly roadmap.",
                  }),
                },
              ],
            },
            finishReason: "STOP",
          },
        ],
        usageMetadata: {
          promptTokenCount: 410,
          candidatesTokenCount: 190,
          totalTokenCount: 600,
        },
        modelVersion: "gemini-3.8-flash-2026",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const result = await generateCoverLetterWithGemini({
      candidate: MOCK_CANDIDATE,
      companyName: "Acme Corp",
      roleTitle: "Staff Systems Engineer",
      companyBrief: MOCK_BRIEF,
      tone: "executive",
    });

    assert.equal(result.provider, "gemini");
    assert.equal(result.model, "gemini-3.8-flash");
    assert.equal(result.modelVersion, "gemini-3.8-flash-2026");
    assert.equal(result.tokenUsage.totalTokens, 600);
    assert.ok(result.paragraphs.evidence.includes("45,000 queries per second"));

    const summary = getAiTelemetrySummary();
    const geminiSummary = summary.find((s) => s.provider === "gemini");
    assert.ok(geminiSummary);
    assert.equal(geminiSummary?.totalRequests, 1);
    assert.equal(geminiSummary?.totalInputTokens, 410);
    assert.equal(geminiSummary?.totalOutputTokens, 190);
    assert.ok(geminiSummary && geminiSummary.totalEstimatedCostUsd > 0);
  } finally {
    globalThis.fetch = prevFetch;
    if (prevGemini !== undefined) process.env.GEMINI_API_KEY = prevGemini;
    else delete process.env.GEMINI_API_KEY;
  }
});

it("deterministic cover letter does not invent canary deployments or unsupported claims", () => {
  const paragraphs = buildDeterministicCoverLetter(
    MOCK_CANDIDATE,
    MOCK_BRIEF,
    "Staff Systems Engineer",
    "executive"
  );

  // Must NOT contain the old hardcoded unsupported canary deployment claim
  assert.equal(
    paragraphs.evidence.toLowerCase().includes("canary deployments"),
    false,
    "Must not invent canary deployments not in candidate profile"
  );
  assert.equal(
    paragraphs.evidence.toLowerCase().includes("standardizing api contracts"),
    false,
    "Must not invent API contract claims not in candidate profile"
  );

  // Must include the candidate's actual bullet
  assert.ok(
    paragraphs.evidence.includes("Raft consensus engine"),
    "Must cite verified candidate achievement"
  );
});

it("does not generate a deterministic letter when Gemini is unconfigured", async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(generateTailoredCoverLetter(MOCK_CANDIDATE, "Acme Corp", "Staff Systems Engineer"), /Gemini API is not configured/);
  } finally {
    if (previous !== undefined) process.env.GEMINI_API_KEY = previous;
  }
});
