import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  decodeHnHtml,
  parseSalaryRange,
  parseHnJobComment,
  fetchHnWhoIsHiringJobs,
  type HnCommentHit,
} from "../../src/services/jobs/adapters/hackerNewsHiringAdapter";

import { hnHiringQuerySchema, hnSaveJobSchema } from "../../src/lib/validations/hackerNews";

describe("Hacker News 'Who is Hiring?' Ingestion Slice", () => {
  describe("1. HTML Entity Decoding & Formatting", () => {
    it("decodes HTML entities and normalizes paragraph breaks", () => {
      const raw = "Stripe | Staff SWE | Remote<p>We&#x27;re building &amp; scaling. Email us at jobs@stripe.com.<p>Apply: <a href=\"https:&#x2F;&#x2F;stripe.com&#x2F;jobs\">Link</a>";
      const decoded = decodeHnHtml(raw);

      assert.ok(!decoded.includes("&#x27;"));
      assert.ok(!decoded.includes("&amp;"));
      assert.ok(!decoded.includes("&#x2F;"));
      assert.ok(decoded.includes("We're building & scaling."));
      assert.ok(decoded.includes("https://stripe.com/jobs"));
      assert.ok(decoded.includes("jobs@stripe.com"));
    });
  });

  describe("2. Compensation Parsing", () => {
    it("extracts salary ranges across various currencies and formats", () => {
      const range1 = parseSalaryRange("Full-time | $140k - $180k + equity");
      assert.deepEqual(range1, { salaryMin: 140000, salaryMax: 180000 });

      const range2 = parseSalaryRange("Remote (EU) | €90,000 – €120,000");
      assert.deepEqual(range2, { salaryMin: 90000, salaryMax: 120000 });

      const range3 = parseSalaryRange("London | £80k to £110k");
      assert.deepEqual(range3, { salaryMin: 80000, salaryMax: 110000 });

      const range4 = parseSalaryRange("Competitive equity only");
      assert.deepEqual(range4, {});
    });
  });

  describe("3. Comment Parsing & Direct Contact Extraction", () => {
    it("parses structured HN comments into normalized RawIngestedJob items", () => {
      const mockComment: HnCommentHit = {
        objectID: "50500910",
        author: "alex_founder",
        comment_text: "Acme AI | Lead Distributed Systems Engineer | San Francisco, CA | REMOTE | $180k - $240k<p>We are building autonomous agents. Reach out directly to founder@acme.ai or apply at https://jobs.ashbyhq.com/acme-ai/12345.",
        created_at: "2026-11-02T16:30:00Z",
        created_at_i: 1793637000,
        parent_id: 50338728,
        story_id: 50338728,
      };

      const parsed = parseHnJobComment(mockComment);
      assert.ok(parsed !== null);
      assert.equal(parsed.company, "Acme AI");
      assert.equal(parsed.title, "Lead Distributed Systems Engineer");
      assert.equal(parsed.location, "San Francisco, CA");
      assert.equal(parsed.remoteType, "REMOTE_ONLY");
      assert.equal(parsed.salaryMin, 180000);
      assert.equal(parsed.salaryMax, 240000);
      assert.equal(parsed.directEmail, "founder@acme.ai");
      assert.equal(parsed.applicationUrl, "https://jobs.ashbyhq.com/acme-ai/12345");
      assert.equal(parsed.externalJobId, "hn-50500910");
      assert.equal(parsed.atsPlatform, "OTHER");
    });

    it("falls back to mailto: link when direct email is present and no HTTP URL is listed", () => {
      const mockComment: HnCommentHit = {
        objectID: "50500911",
        author: "cto_bob",
        comment_text: "Nova Dynamics | Senior Backend Engineer | Remote (Worldwide) | $150k - $190k<p>Early stage seed startup. No recruiters. Please email me directly: bob@novadynamics.dev.",
        created_at: "2026-11-02T17:00:00Z",
        created_at_i: 1793638800,
        parent_id: 50338728,
        story_id: 50338728,
      };

      const parsed = parseHnJobComment(mockComment);
      assert.ok(parsed !== null);
      assert.equal(parsed.company, "Nova Dynamics");
      assert.equal(parsed.directEmail, "bob@novadynamics.dev");
      assert.ok(parsed.applicationUrl.startsWith("mailto:bob@novadynamics.dev"));
    });

    it("discards meta / moderation comments", () => {
      const metaComment: HnCommentHit = {
        objectID: "50338729",
        author: "whoishiring",
        comment_text: "Ask HN: Who is hiring? (November 2026) Guidelines: Please only post if you are hiring directly.",
        created_at: "2026-11-02T16:01:00Z",
        created_at_i: 1793635260,
        parent_id: 50338728,
        story_id: 50338728,
      };

      const parsed = parseHnJobComment(metaComment);
      assert.equal(parsed, null);
    });
  });

  describe("4. End-to-End Fetcher with Mocked Algolia API", () => {
    it("fetches, parses, and applies remote filters accurately", async () => {
      const mockHits: HnCommentHit[] = [
        {
          objectID: "101",
          author: "dev1",
          comment_text: "Alpha Labs | Rust Engineer | Remote | $160k - $200k<p>Email: jobs@alphalabs.io",
          created_at: "2026-11-02T16:10:00Z",
          created_at_i: 1793635800,
          parent_id: 50338728,
          story_id: 50338728,
        },
        {
          objectID: "102",
          author: "dev2",
          comment_text: "Beta Corp | Office Admin | ONSITE (New York, NY) | $70k - $80k<p>Apply: https://betacorp.com/jobs",
          created_at: "2026-11-02T16:15:00Z",
          created_at_i: 1793636100,
          parent_id: 50338728,
          story_id: 50338728,
        },
      ];

      const mockFetcher = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({ hits: mockHits, nbHits: 2 }),
      })) as unknown as typeof fetch;

      // Without remote filter -> 2 jobs
      const resultAll = await fetchHnWhoIsHiringJobs({
        storyId: "50338728",
        fetcher: mockFetcher,
        remoteOnly: false,
      });
      assert.equal(resultAll.jobs.length, 2);

      // With remote filter -> 1 job (Alpha Labs)
      const resultRemote = await fetchHnWhoIsHiringJobs({
        storyId: "50338728",
        fetcher: mockFetcher,
        remoteOnly: true,
      });
      assert.equal(resultRemote.jobs.length, 1);
      assert.equal(resultRemote.jobs[0].company, "Alpha Labs");
    });
  });

  describe("5. Validation Schemas", () => {
    it("validates query inputs and save payloads correctly", () => {
      const validQuery = hnHiringQuerySchema.safeParse({
        page: "1",
        limit: "25",
        remoteOnly: "true",
        search: "Distributed Systems",
      });
      assert.ok(validQuery.success);
      if (validQuery.success) {
        assert.equal(validQuery.data.page, 1);
        assert.equal(validQuery.data.limit, 25);
        assert.equal(validQuery.data.remoteOnly, true);
      }

      const validSave = hnSaveJobSchema.safeParse({
        externalJobId: "hn-123456",
        company: "Stripe",
        title: "Staff Engineer",
        description: "Building global infrastructure.",
        applicationUrl: "https://stripe.com/jobs",
        remoteType: "REMOTE_ONLY",
        directEmail: "founder@stripe.com",
      });
      assert.ok(validSave.success);
    });
  });
});
