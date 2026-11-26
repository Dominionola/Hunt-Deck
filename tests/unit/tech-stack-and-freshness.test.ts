import assert from "node:assert/strict";
import test from "node:test";
import {
  extractTechStack,
  getJobFreshness,
  resolveStackSearchTerms,
} from "../../src/services/jobs/techStackExtractor";
import { jobQuerySchema } from "../../src/lib/validations/job";

test("extractTechStack prioritizes title matches and avoids false positives", () => {
  const stack = extractTechStack(
    "Senior React & TypeScript Engineer",
    "We build scalable services with Node.js, PostgreSQL, AWS, and Docker. Good communication is key.",
    6
  );
  assert.deepEqual(stack, ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "AWS"]);
  assert.ok(!stack.includes("Go"));
  assert.ok(!stack.includes("Java"));
});

test("resolveStackSearchTerms maps canonical tags to database search terms", () => {
  assert.deepEqual(resolveStackSearchTerms(["AI / LLM", "Next.js", "PostgreSQL"]), [
    "LLM",
    "Next",
    "Postgres",
  ]);
});

test("getJobFreshness returns <24h, <3d, day counts, and null for older jobs", () => {
  const now = new Date("2026-11-26T12:00:00Z");
  assert.deepEqual(getJobFreshness("2026-11-26T06:00:00Z", now), {
    label: "New · < 24h",
    isHighlight: true,
  });
  assert.deepEqual(getJobFreshness("2026-11-24T12:00:00Z", now), {
    label: "Recent · < 3d",
    isHighlight: true,
  });
  assert.deepEqual(getJobFreshness("2026-11-21T12:00:00Z", now), {
    label: "5d ago",
    isHighlight: false,
  });
  assert.equal(getJobFreshness("2026-11-01T12:00:00Z", now), null);
});

test("jobQuerySchema parses comma-separated stack filters", () => {
  const parsed = jobQuerySchema.safeParse({ stack: "React, TypeScript, React" });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.deepEqual(parsed.data.stack, ["React", "TypeScript"]);
  }
});
