import { it } from "node:test";
import assert from "node:assert/strict";
import { normalizeMissingResumeFields, groqResumeJsonSchema } from "../../src/lib/validations/resumeExtraction";
import { resumeParsedDataSchema } from "../../src/lib/validations/resume";
import { classifyResumeFailure, decodeResumeFailure, decodeResumeDiagnostic, resumeFailureMessage, resumeFailureReason, safeResumeIssuePaths } from "../../src/lib/resumeFailure";
import { extractResumeEntitiesWithGroq } from "../../src/services/ai/groqExtractor";
import { pollResumeJob } from "../../src/features/resume/pollResumeJob";

it("requires closed structured objects with every field present at the provider boundary", () => {
  const check = (schema: unknown) => {
    if (!schema || typeof schema !== "object") return;
    const node = schema as { type?: string; properties?: Record<string, unknown>; required?: string[]; additionalProperties?: boolean; items?: unknown };
    if (node.type === "object") {
      assert.equal(node.additionalProperties, false);
      assert.deepEqual(new Set(node.required), new Set(Object.keys(node.properties || {})));
      Object.values(node.properties || {}).forEach(check);
    }
    if (node.items) check(node.items);
  };
  check(groqResumeJsonSchema);
});

it("accepts missing nullable facts without fabricating a candidate or accepting wrong types", () => {
  const parsed = resumeParsedDataSchema.parse(normalizeMissingResumeFields({
    fullName: "Synthetic Candidate", email: null, phone: null, skills: ["Python"],
    experience: [{ company: "Example Test Labs", title: "Engineer", startDate: "2022", endDate: null, location: null }],
    education: [{ institution: "Example College", degree: "BSc", graduationYear: null }],
    projects: null,
  }));
  assert.equal(parsed.email, undefined); assert.equal(parsed.phone, undefined);
  assert.equal(parsed.experience[0].endDate, undefined);
  assert.equal(parsed.education[0].graduationYear, undefined);
  assert.deepEqual(parsed.projects, []);
  assert.equal(resumeParsedDataSchema.safeParse(normalizeMissingResumeFields({ fullName: "Synthetic", skills: "invented" })).success, false);
});

it("normalizes explicit bare web links and flags unusable optional contacts without rejecting the CV", () => {
  const parsed = resumeParsedDataSchema.parse(normalizeMissingResumeFields({
    fullName: "Synthetic Candidate", email: "not an email", linkedinUrl: "",
    skills: ["Python"], projects: [
      { name: "Synthetic", description: "Example", url: "github.com/synthetic/project" },
      { name: "Other", description: "Example", url: "PRIVATE_MALFORMED_LINK" },
    ],
  }));
  assert.equal(parsed.email, ""); assert.equal(parsed.linkedinUrl, undefined);
  assert.equal(parsed.projects[0].url, "https://github.com/synthetic/project");
  assert.equal(parsed.projects[1].url, undefined);
  assert.deepEqual(parsed.extractionWarnings, ["email_needs_review", "project_url_needs_review"]);
  assert.equal(resumeParsedDataSchema.parse(normalizeMissingResumeFields({ fullName: "Synthetic", email: "mailto:synthetic@example.invalid" })).email, "synthetic@example.invalid");
});

it("requests strict JSON schema for the configured GPT-OSS extractor", async (t) => {
  const previous = { key: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL };
  process.env.GROQ_API_KEY = "synthetic-test-key"; process.env.GROQ_MODEL = "openai/gpt-oss-120b";
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.response_format.type, "json_schema");
    assert.equal(body.response_format.json_schema.strict, true);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ fullName: "Synthetic Candidate", skills: [] }) }, finish_reason: "stop" }] });
  });
  try { assert.equal((await extractResumeEntitiesWithGroq("Synthetic source only")).data.fullName, "Synthetic Candidate"); }
  finally {
    if (previous.key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previous.key;
    if (previous.model === undefined) delete process.env.GROQ_MODEL; else process.env.GROQ_MODEL = previous.model;
  }
});

it("classifies failures without reading message text or exposing arbitrary provider content", () => {
  const failure = { status: 401, get message(): string { throw new Error("must not inspect document-bearing text"); } };
  assert.equal(classifyResumeFailure("extraction", failure), "EXTRACTION_CONFIGURATION");
  assert.equal(classifyResumeFailure("extraction", new SyntaxError("PRIVATE_DOCUMENT_CANARY")), "EXTRACTION_INVALID_OUTPUT");
  assert.equal(decodeResumeFailure("PRIVATE_DOCUMENT_CANARY"), "UNKNOWN");
  assert.equal(decodeResumeFailure(resumeFailureReason("INVALID_PDF")), "INVALID_PDF");
  assert.equal(resumeFailureMessage("PRIVATE_DOCUMENT_CANARY").includes("CANARY"), false);
  assert.equal(resumeFailureMessage("__proto__"), resumeFailureMessage("UNKNOWN"));
  assert.equal(classifyResumeFailure("extraction", { status: 429 }), "EXTRACTION_RATE_LIMITED");
  assert.equal(decodeResumeDiagnostic(JSON.stringify({ event: "resume_processing_failed", code: "EXTRACTION_RATE_LIMITED", ignored: "PRIVATE_CANARY" })), "EXTRACTION_RATE_LIMITED");
  assert.equal(decodeResumeDiagnostic("PRIVATE_CANARY"), "UNKNOWN");
  assert.deepEqual(safeResumeIssuePaths({ issues: [{ path: ["projects", 0, "url"] }, { path: ["PRIVATE_CANARY"] }] }), ["projects.0.url", "$field"]);
});

it("shows only an allowlisted owner-facing failure message while polling", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ status: "failed", errorCode: "INVALID_PDF", error: "PRIVATE_DOCUMENT_CANARY" }));
  await assert.rejects(pollResumeJob("synthetic", () => {}), (error: unknown) => error instanceof Error && /text-based PDF/.test(error.message) && !error.message.includes("CANARY"));
});
