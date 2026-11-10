import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  generateSocialPostFingerprint,
  isSocialHiringUrl,
  hasHiringIntent,
  harvestSocialHiringPosts,
} from "../../src/services/jobs/socialHiringIngestion";

import {
  extractPosterIdentity,
  extractRoleAndKeywords,
  normalizeSocialHiringPost,
} from "../../src/services/jobs/socialEntityExtractor";

import {
  generateSocialOutreachPitch,
} from "../../src/services/ai/socialPitchGenerator";

import type { ResumeParsedData } from "../../src/lib/validations/resume";

const MOCK_CANDIDATE: ResumeParsedData = {
  fullName: "Alex Rivera",
  email: "alex@rivera.dev",
  skills: ["TypeScript", "Next.js", "PostgreSQL", "Redis", "Distributed Systems"],
  experience: [
    {
      company: "EdgeScale",
      title: "Senior Infrastructure Engineer",
      startDate: "Jan 2022",
      isCurrent: true,
      bullets: [
        "Architected multi-region event streaming pipeline processing 14,000 rps with 99.99% uptime.",
      ],
    },
  ],
  education: [],
  projects: [],
};

describe("Phase 4.5: Social Hiring Post Ingestion & Direct Outreach Engine", () => {
  // ─────────────────────────────────────────────────────────────
  // 1. SHA-256 Deduplication & Fingerprinting (TASK-039A, TASK-039E)
  // ─────────────────────────────────────────────────────────────
  describe("SHA-256 Deduplication & Canonicalization", () => {
    test("should generate identical SHA-256 fingerprints for duplicate posts with minor whitespace or case variations", () => {
      const url1 = "https://www.linkedin.com/posts/guillermorauch_nextjs-hiring-activity-712389";
      const content1 = "We are hiring a Staff Frontend Engineer for Next.js!";

      const url2 = "https://www.LINKEDIN.com/posts/guillermorauch_nextjs-hiring-activity-712389";
      const content2 = "  We are hiring a Staff Frontend Engineer for Next.js!  \n";

      const hash1 = generateSocialPostFingerprint(url1, content1);
      const hash2 = generateSocialPostFingerprint(url2, content2);

      assert.strictEqual(hash1, hash2);
      assert.strictEqual(hash1.length, 64); // SHA-256 produces 64 hex characters
    });

    test("should generate distinct fingerprints for different URLs or different post snippets", () => {
      const hashA = generateSocialPostFingerprint("https://x.com/rauchg/status/123", "Hiring engineers");
      const hashB = generateSocialPostFingerprint("https://x.com/rauchg/status/456", "Hiring engineers");
      const hashC = generateSocialPostFingerprint("https://x.com/rauchg/status/123", "Hiring designers");

      assert.notStrictEqual(hashA, hashB);
      assert.notStrictEqual(hashA, hashC);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Platform Identification & Intent Filtering (TASK-039A)
  // ─────────────────────────────────────────────────────────────
  describe("Social Platform & Hiring Intent Filtering", () => {
    test("should identify canonical LinkedIn and X/Twitter post URLs", () => {
      assert.deepStrictEqual(
        isSocialHiringUrl("https://www.linkedin.com/posts/jameshawkins_posthog-clickhouse-activity-123"),
        { isSocial: true, platform: "linkedin" }
      );

      assert.deepStrictEqual(
        isSocialHiringUrl("https://x.com/rauchg/status/1782910293"),
        { isSocial: true, platform: "x" }
      );

      assert.deepStrictEqual(
        isSocialHiringUrl("https://twitter.com/amasad/status/987654321"),
        { isSocial: true, platform: "x" }
      );

      assert.deepStrictEqual(
        isSocialHiringUrl("https://boards.greenhouse.io/stripe/jobs/123"),
        { isSocial: false, platform: "linkedin" }
      );
    });

    test("should detect explicit hiring intent and reject unrelated social banter", () => {
      assert.strictEqual(hasHiringIntent("We are looking to hire a Senior Systems Engineer for our data team."), true);
      assert.strictEqual(hasHiringIntent("Excited to announce my team is expanding! DM me if interested."), true);
      assert.strictEqual(hasHiringIntent("Just launched our new blog post about database index optimization."), false);
    });

    test("harvestSocialHiringPosts should execute dork queries and return deduplicated crawled posts", async () => {
      const posts = await harvestSocialHiringPosts("Staff Systems Engineer", "Stripe");

      assert.ok(Array.isArray(posts));
      // Ensures fingerprints are unique
      const fingerprints = posts.map((p) => p.fingerprint);
      const uniqueFingerprints = new Set(fingerprints);
      assert.strictEqual(fingerprints.length, uniqueFingerprints.size);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Entity Extraction & Poster Resolution (TASK-039B)
  // ─────────────────────────────────────────────────────────────
  describe("Entity Extraction & Poster Identity Resolution", () => {
    test("should extract author name and company from LinkedIn snippet", () => {
      const title = "Guillermo Rauch on LinkedIn: We are expanding the Next.js team and looking for a Staff...";
      const snippet = "Vercel is looking for a Staff Frontend Engineer to scale our compiler and edge routing.";

      const identity = extractPosterIdentity(title, snippet);
      assert.strictEqual(identity.authorName, "Guillermo Rauch");
      assert.strictEqual(identity.authorCompany, "Vercel");
    });

    test("should extract author name and company from X/Twitter snippet", () => {
      const title = "James Hawkins (@james_hawkins) / X: PostHog is hiring a Senior Full-Stack Engineer...";
      const snippet = "We're expanding PostHog and looking to hire a Senior Full-Stack Engineer in remote EU/US.";

      const identity = extractPosterIdentity(title, snippet);
      assert.strictEqual(identity.authorName, "James Hawkins");
      assert.strictEqual(identity.authorCompany, "PostHog");
    });

    test("should extract target role, remote status, and technology keywords", () => {
      const snippet = "We are hiring a Staff Systems Engineer remote. Deep expertise in TypeScript, PostgreSQL, and Redis required.";
      const extracted = extractRoleAndKeywords(snippet);

      assert.strictEqual(extracted.targetRole, "Staff Systems Engineer");
      assert.strictEqual(extracted.workArrangement, "remote");
      assert.ok(extracted.highlightedKeywords.includes("TypeScript"));
      assert.ok(extracted.highlightedKeywords.includes("PostgreSQL"));
      assert.ok(extracted.highlightedKeywords.includes("Redis"));
    });

    test("normalizeSocialHiringPost produces complete SocialHiringPost entity", () => {
      const crawled = {
        fingerprint: "abc123def4567890123456789012345678901234567890123456789012345678",
        platform: "linkedin" as const,
        rawTitle: "Guillermo Rauch on LinkedIn: We are looking for a Staff Frontend Engineer",
        rawSnippet: "Vercel is looking for a Staff Frontend Engineer to lead React & Next.js infrastructure.",
        originalPostUrl: "https://www.linkedin.com/posts/guillermorauch_vercel-staff-eng",
        sourceDomain: "linkedin.com",
      };

      const normalized = normalizeSocialHiringPost(crawled, 94);
      assert.strictEqual(normalized.authorName, "Guillermo Rauch");
      assert.strictEqual(normalized.authorCompany, "Vercel");
      assert.strictEqual(normalized.platform, "linkedin");
      assert.strictEqual(normalized.fitScore, 94);
      assert.ok(normalized.matchingSkills.length > 0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. AI 2-Sentence Pitch Generator (TASK-039C)
  // ─────────────────────────────────────────────────────────────
  describe("AI Conversational Pitch Generator (TASK-039C)", () => {
    test("should generate conversational 2-sentence pitch strictly <= 280 characters", () => {
      const post = {
        authorName: "Guillermo Rauch",
        authorCompany: "Vercel",
        targetRole: "Staff Frontend Engineer",
        highlightedKeywords: ["Next.js", "TypeScript"],
        postContent: "Looking for an engineer to lead web performance across our core developer platform.",
      };

      const pitch = generateSocialOutreachPitch({
        candidate: MOCK_CANDIDATE,
        post,
      });

      assert.ok(pitch.length > 30, "Pitch should be substantive");
      assert.ok(pitch.length <= 280, `Pitch length is ${pitch.length}, must be <= 280 characters`);
      assert.ok(pitch.includes("Guillermo"));
      assert.ok(pitch.includes("Vercel"));
      assert.ok(pitch.includes("Staff Frontend Engineer"));

      // Anti-bot check: no generic canned clichés
      assert.ok(!pitch.toLowerCase().includes("i am writing to apply"));
      assert.ok(!pitch.toLowerCase().includes("perfect fit"));
    });
  });
});

