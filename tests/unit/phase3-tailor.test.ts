import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  decomposeJobDescription,
  calculateBulletRelevance,
  injectKeywordsNatural,
  alignGoogleXYZ,
  verifyAntiHallucination,
  rewriteBulletThreePass,
} from "../../src/services/ai/bulletRewriter";

import {
  auditAtsFormatting,
  isValidAtsDate,
} from "../../src/services/parsing/formattingValidator";

import {
  validateCoverLetterAntiCliches,
  scrubBannedCliches,
} from "../../src/services/ai/clicheFilter";

import {
  generateCompanyContextBrief,
} from "../../src/services/ai/companyResearchService";

import {
  generateTailoredCoverLetter,
} from "../../src/services/ai/coverLetterGenerator";

import type { ResumeParsedData } from "../../src/lib/validations/resume";

const MOCK_PROFILE: ResumeParsedData = {
  fullName: "Elena Rostova",
  email: "elena.rostova@engineer.io",
  phone: "+1 (555) 234-5678",
  location: "New York, NY",
  summary: "Senior Backend Engineer with 6 years experience in distributed systems.",
  skills: ["TypeScript", "Node.js", "PostgreSQL", "Redis", "Docker", "AWS"],
  experience: [
    {
      company: "CloudScale Inc",
      title: "Senior Backend Engineer",
      startDate: "Jan 2021",
      endDate: "Present",
      isCurrent: true,
      bullets: [
        "Architected distributed caching layer in Redis, reducing p99 API latency by 45% (from 180ms to 99ms).",
        "Managed database schema migrations across relational database clusters handling 12,000 rps.",
        "Attended weekly standups with engineering team.",
      ],
    },
  ],
  education: [
    {
      institution: "Columbia University",
      degree: "B.S. in Computer Science",
      graduationYear: "2018",
    },
  ],
  projects: [],
};

const SAMPLE_JD = `
We are seeking a Senior Distributed Systems Engineer.
Requirements:
- 5+ years building backend services in TypeScript and Node.js.
- Deep expertise in PostgreSQL and Redis distributed caching.
- Experience with Docker, Kubernetes, and high-throughput systems.
- Must have strong cross-functional communication and performance optimization skills.
`;

describe("Phase 3: ATS Resume Writer & Deep Cover Letter Engine", () => {
  // ─────────────────────────────────────────────────────────────
  // 1. JD Decomposition & 3-Pass Bullet Rewriter
  // ─────────────────────────────────────────────────────────────
  describe("JD Decomposition & 3-Pass Bullet Rewriting", () => {
    test("should extract must-have skills, implicit signals, and seniority signals from JD", () => {
      const decomp = decomposeJobDescription(SAMPLE_JD);

      assert.ok(decomp.mustHaveSkills.includes("typescript"));
      assert.ok(decomp.mustHaveSkills.includes("postgresql"));
      assert.ok(decomp.mustHaveSkills.includes("redis"));
      assert.ok(decomp.implicitSkills.includes("cross-functional") || decomp.implicitSkills.includes("performance optimization"));
      assert.ok(decomp.senioritySignals.some((s) => s.includes("SENIOR") || s.includes("5+ years")));
    });

    test("Pass 1: Relevance scoring should prioritize high-match bullets and drop irrelevant ones", () => {
      const decomp = decomposeJobDescription(SAMPLE_JD);

      const highMatchBullet = "Architected distributed caching layer in Redis, reducing p99 latency by 45%.";
      const lowMatchBullet = "Organized company holiday lunch and ordered catering supplies.";

      const highRelevance = calculateBulletRelevance(highMatchBullet, decomp);
      const lowRelevance = calculateBulletRelevance(lowMatchBullet, decomp);

      assert.ok(highRelevance >= 0.5, `Expected >= 0.5, got ${highRelevance}`);
      assert.ok(lowRelevance < 0.3, `Expected < 0.3 for irrelevant bullet, got ${lowRelevance}`);
    });

    test("Pass 2: Keyword injection naturally replaces generic terms with verbatim JD keywords", () => {
      const decomp = decomposeJobDescription(SAMPLE_JD);
      const genericBullet = "Managed schema migrations across relational database clusters.";

      const { rewrittenText, injectedKeywords } = injectKeywordsNatural(genericBullet, decomp);

      assert.ok(rewrittenText.includes("PostgreSQL"));
      assert.ok(injectedKeywords.includes("PostgreSQL"));
    });

    test("Pass 3: Google XYZ alignment preserves metrics and flags missing metrics without fabricating", () => {
      const quantifiedBullet = "Engineered sub-50ms cache over PostgreSQL, reducing query latency by 40%.";
      const unquantifiedBullet = "Built an internal metrics dashboard for team members.";

      const resQuantified = alignGoogleXYZ(quantifiedBullet);
      assert.strictEqual(resQuantified.isFormatted, true);
      assert.ok(resQuantified.xyzText.includes("40%"));

      const resUnquantified = alignGoogleXYZ(unquantifiedBullet);
      assert.strictEqual(resUnquantified.isFormatted, false);
      assert.ok(resUnquantified.xyzText.includes("[quantify: add metric"));
      assert.ok(resUnquantified.missingMetricFlag !== undefined);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Anti-Hallucination Guardrails
  // ─────────────────────────────────────────────────────────────
  describe("Anti-Hallucination Guardrail Enforcement", () => {
    test("should pass verification when rewritten bullet contains only source metrics", () => {
      const source = "Scaled Redis cluster to handle 14,000 rps with 99.99% uptime.";
      const rewritten = "Architected Redis cluster, maintaining 99.99% uptime at 14,000 rps throughput.";

      const check = verifyAntiHallucination(source, rewritten);
      assert.strictEqual(check.passed, true);
      assert.strictEqual(check.violations.length, 0);
    });

    test("should REJECT and flag rewritten bullets introducing fabricated numbers or percentages", () => {
      const source = "Improved database queries and optimized indexing.";
      const hallucinated = "Improved database queries, reducing AWS infrastructure costs by $85,000 and 70%.";

      const check = verifyAntiHallucination(source, hallucinated);
      assert.strictEqual(check.passed, false);
      assert.ok(check.violations.some((v) => v.includes("Fabricated metric detected")));
    });

    test("rewriteBulletThreePass never injects fabricated metrics even when rewriting", () => {
      const decomp = decomposeJobDescription(SAMPLE_JD);
      const source = "Refactored user authentication service.";

      const rewritten = rewriteBulletThreePass(source, decomp);
      assert.strictEqual(rewritten.sourceVerified, true);
      // Metric prompt is added rather than inventing fake 99.9% or $100k
      assert.ok(rewritten.rewrittenBullet.includes("[quantify: add metric"));
      assert.ok(!rewritten.rewrittenBullet.includes("$"));
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. ATS Hard Formatting Validator & Pre-Flight Audit
  // ─────────────────────────────────────────────────────────────
  describe("ATS Hard Formatting Validator & Pre-Flight Audit", () => {
    test("should accept standard single-column text with valid dates and standard sections", () => {
      const validText = `
Elena Rostova
elena.rostova@engineer.io • +1 (555) 234-5678 • New York, NY

Summary
Senior Backend Engineer with 6 years experience in distributed systems.

Technical Skills
TypeScript, Node.js, PostgreSQL, Redis, Docker, AWS

Work Experience
Senior Backend Engineer — CloudScale Inc (Jan 2021 – Present)
• Architected distributed caching layer in Redis, reducing p99 API latency by 45%.
• Managed database schema migrations across PostgreSQL clusters handling 12,000 rps.

Education
B.S. in Computer Science — Columbia University (2018)
      `;

      const report = auditAtsFormatting(validText, MOCK_PROFILE, ["TypeScript", "PostgreSQL", "Redis"]);

      assert.strictEqual(report.isAtsCompliant, true);
      assert.ok(report.overallScore >= 90, `Expected score >= 90, got ${report.overallScore}`);
      assert.strictEqual(report.formatComplianceScore, 100);
      assert.ok(report.estimatedAtsRankPercentile >= 85);
    });

    test("should REJECT HTML tables and Markdown tables as critical formatting violations", () => {
      const htmlTableText = `
<table>
  <tr><td>Title</td><td>Senior Engineer</td></tr>
</table>
      `;

      const markdownTableText = `
| Company | Role | Dates |
| --- | --- | --- |
| Stripe | Staff Eng | 2022-2024 |
      `;

      const reportHtml = auditAtsFormatting(htmlTableText, MOCK_PROFILE);
      assert.strictEqual(reportHtml.isAtsCompliant, false);
      assert.ok(reportHtml.violations.some((v) => v.rule === "HTML Table"));

      const reportMd = auditAtsFormatting(markdownTableText, MOCK_PROFILE);
      assert.strictEqual(reportMd.isAtsCompliant, false);
      assert.ok(reportMd.violations.some((v) => v.rule === "Markdown Table"));
    });

    test("should validate standard ATS date formats (Month YYYY or MM/YYYY)", () => {
      assert.strictEqual(isValidAtsDate("Jan 2022"), true);
      assert.strictEqual(isValidAtsDate("January 2022"), true);
      assert.strictEqual(isValidAtsDate("05/2021"), true);
      assert.strictEqual(isValidAtsDate("Present"), true);
      assert.strictEqual(isValidAtsDate("2020"), true);

      // Rejects vague or non-standard dates
      assert.strictEqual(isValidAtsDate("Summer 21"), false);
      assert.strictEqual(isValidAtsDate("few months ago"), false);
      assert.strictEqual(isValidAtsDate(""), false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Banned Clichés & Anti-Bot Cover Letter Filter
  // ─────────────────────────────────────────────────────────────
  describe("Banned Clichés & Buzzwords Filter", () => {
    test("should flag letters opening with 'I am writing to express my enthusiastic interest'", () => {
      const badOpening = "I am writing to express my enthusiastic interest in the Senior Engineer role.";
      const res = validateCoverLetterAntiCliches(badOpening);

      assert.strictEqual(res.isValid, false);
      assert.ok(res.violations.some((v) => v.includes("Generic 'I am writing to apply' opening")));
    });

    test("should flag letters where the very first word is 'I'", () => {
      const startsWithI = "I have built distributed systems for the past 6 years.";
      const res = validateCoverLetterAntiCliches(startsWithI);

      assert.strictEqual(res.isValid, false);
      assert.ok(res.violations.some((v) => v.includes("Letter begins with 'I' as the first word")));
    });

    test("should flag empty corporate buzzwords (results-driven, team player, rockstar)", () => {
      const buzzwords = "Following Stripe's infrastructure growth, as a results-driven team player and rockstar engineer, my focus is systems.";
      const res = validateCoverLetterAntiCliches(buzzwords);

      assert.strictEqual(res.isValid, false);
      assert.ok(res.violations.some((v) => v.includes("Results-driven")));
      assert.ok(res.violations.some((v) => v.includes("Team player")));
      assert.ok(res.violations.some((v) => v.includes("rockstar")));
    });

    test("scrubBannedCliches automatically refactors prohibited phrases into executive language", () => {
      const rawText = "Following Stripe's growth, I am passionate about distributed systems and consider myself a results-driven team player.";
      const scrubbed = scrubBannedCliches(rawText);

      assert.ok(!scrubbed.includes("I am passionate about"));
      assert.ok(!scrubbed.includes("results-driven"));
      assert.ok(!scrubbed.includes("team player"));
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Multi-Source Company Intelligence & 4-Paragraph Engine
  // ─────────────────────────────────────────────────────────────
  describe("4-Paragraph Bespoke Cover Letter Engine", () => {
    test("should synthesize structured CompanyContextBrief with verified fact hook", async () => {
      const brief = await generateCompanyContextBrief("PostHog", "Senior Full-Stack Engineer");

      assert.strictEqual(brief.companyName, "PostHog");
      assert.ok(brief.verifiedFactHook.length > 10);
      assert.ok(brief.techStack.length > 0);
      assert.ok(brief.engineeringCultureValues.length > 0);
    });

    test("should generate 4 distinct paragraphs conforming to Hook, Evidence, Connection, and Close", async () => {
      const letter = await generateTailoredCoverLetter(
        MOCK_PROFILE,
        "Vercel",
        "Staff Frontend Infrastructure Engineer",
        SAMPLE_JD,
        "modern_tech"
      );

      assert.ok(letter.paragraphs.hook.length > 40, "P1 Hook should be substantive");
      assert.ok(letter.paragraphs.evidence.length > 40, "P2 Evidence should be substantive");
      assert.ok(letter.paragraphs.connection.length > 40, "P3 Connection should be substantive");
      assert.ok(letter.paragraphs.close.length > 20, "P4 Close should be substantive");

      // Verify P1 Hook does not start with "I"
      assert.ok(!letter.paragraphs.hook.trim().startsWith("I "), "Cover letter must not start with 'I'");

      // Verify P1 Hook does not have "I am writing to"
      assert.ok(!letter.paragraphs.hook.toLowerCase().includes("i am writing to"));

      // Verify length between 180 and 450 words
      assert.ok(letter.wordCount >= 180 && letter.wordCount <= 450, `Word count: ${letter.wordCount}`);

      // Verify verified company fact is present
      assert.ok(letter.paragraphs.hook.includes("Vercel") || letter.paragraphs.hook.includes(letter.verifiedFactUsed));
    });

    test("supports executive, warm, and modern_tech tone calibrations", async () => {
      const execLetter = await generateTailoredCoverLetter(
        MOCK_PROFILE,
        "Stripe",
        "Staff Systems Engineer",
        SAMPLE_JD,
        "executive"
      );

      const warmLetter = await generateTailoredCoverLetter(
        MOCK_PROFILE,
        "Stripe",
        "Staff Systems Engineer",
        SAMPLE_JD,
        "warm"
      );

      assert.notStrictEqual(execLetter.paragraphs.hook, warmLetter.paragraphs.hook);
      assert.strictEqual(execLetter.tone, "executive");
      assert.strictEqual(warmLetter.tone, "warm");
    });
  });
});
