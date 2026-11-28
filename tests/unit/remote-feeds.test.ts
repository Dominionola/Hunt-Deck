import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeHimalayasItem,
  fetchHimalayasJobs,
} from "../../src/services/jobs/adapters/himalayasAdapter";
import {
  normalizeJobicyItem,
  fetchJobicyJobs,
} from "../../src/services/jobs/adapters/jobicyAdapter";
import {
  remoteFeedQuerySchema,
  remoteFeedSaveSchema,
} from "../../src/lib/validations/remoteFeeds";

describe("Remote Feeds Vertical Slice (Himalayas & Jobicy)", () => {
  describe("1. Himalayas Adapter & Normalization", () => {
    it("normalizes a valid Himalayas job item with salary, timezone restrictions, and prefixed ID", () => {
      const normalized = normalizeHimalayasItem({
        title: "Senior Full-Stack Engineer",
        companyName: "Acme Remote",
        companySlug: "acme-remote",
        employmentType: "Full Time",
        minSalary: 140000,
        maxSalary: 185000,
        salaryPeriod: "annual",
        currency: "USD",
        seniority: ["Senior"],
        locationRestrictions: ["United States", "Canada"],
        timezoneRestrictions: [-8, -5],
        categories: ["Full-Stack-Engineer", "React"],
        description: "<p>Build distributed TypeScript and React systems at scale.</p>",
        pubDate: 1795823000,
        applicationLink: "https://himalayas.app/companies/acme-remote/jobs/senior-full-stack?utm_source=api",
        guid: "https://himalayas.app/companies/acme-remote/jobs/senior-full-stack",
      });

      assert.ok(normalized !== null);
      assert.equal(normalized.provider, "himalayas");
      assert.equal(normalized.company, "Acme Remote");
      assert.equal(normalized.title, "Senior Full-Stack Engineer");
      assert.equal(normalized.location, "United States, Canada");
      assert.equal(normalized.salaryMin, 140000);
      assert.equal(normalized.salaryMax, 185000);
      assert.equal(normalized.remoteType, "REMOTE_ONLY");
      assert.ok(normalized.externalJobId?.startsWith("himalayas:"));
      assert.equal(
        normalized.applicationUrl,
        "https://himalayas.app/companies/acme-remote/jobs/senior-full-stack?utm_source=api"
      );
    });

    it("ignores hourly/non-annual salaries and rejects non-https applicationLink", () => {
      const hourly = normalizeHimalayasItem({
        title: "Contract React Developer",
        companyName: "Hourly Co",
        minSalary: 85,
        maxSalary: 110,
        salaryPeriod: "hourly",
        currency: "USD",
        description: "<p>Contract frontend work with TypeScript and Next.js across teams.</p>",
        applicationLink: "https://jobs.lever.co/hourly/123",
      });

      assert.ok(hourly !== null);
      assert.equal(hourly.salaryMin, undefined);
      assert.equal(hourly.salaryMax, undefined);
      assert.equal(hourly.atsPlatform, "LEVER");

      const insecure = normalizeHimalayasItem({
        title: "Insecure Job",
        companyName: "HTTP Corp",
        description: "<p>Long enough description for validation check.</p>",
        applicationLink: "http://example.com/apply",
      });
      assert.equal(insecure, null);
    });

    it("fetches search results with cursor pagination from mocked Himalayas endpoint", async () => {
      let capturedUrl = "";
      const mockFetcher = (async (input: RequestInfo | URL) => {
        capturedUrl = String(input);
        return new Response(
          JSON.stringify({
            totalCount: 420,
            nextCursor: "cursor_page_2",
            jobs: [
              {
                title: "Staff Platform Engineer",
                companyName: "CloudScale",
                description: "<p>Architect cloud infrastructure with Kubernetes and Go.</p>",
                applicationLink: "https://himalayas.app/companies/cloudscale/jobs/staff-platform",
                guid: "https://himalayas.app/companies/cloudscale/jobs/staff-platform",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as unknown as typeof fetch;

      const res = await fetchHimalayasJobs({ query: "kubernetes", limit: 15 }, mockFetcher);
      assert.ok(capturedUrl.startsWith("https://himalayas.app/jobs/api/search?"));
      assert.ok(capturedUrl.includes("q=kubernetes"));
      assert.equal(res.provider, "himalayas");
      assert.equal(res.totalAvailable, 420);
      assert.equal(res.nextCursor, "cursor_page_2");
      assert.equal(res.jobs.length, 1);
      assert.equal(res.jobs[0].company, "CloudScale");
    });
  });

  describe("2. Jobicy Adapter & Normalization", () => {
    it("normalizes a Jobicy listing and decodes HTML entities cleanly", () => {
      const normalized = normalizeJobicyItem({
        id: 164597,
        url: "https://jobicy.com/jobs/164597-platform-engineer",
        jobTitle: "Senior Backend &amp; Platform Engineer",
        companyName: "ScaleOps",
        jobIndustry: ["Engineering", "Cloud"],
        jobType: ["Full-Time"],
        jobGeo: "Europe",
        jobLevel: "Senior, Lead",
        jobDescription: "<p>Build reliable distributed APIs in Node.js and PostgreSQL.</p>",
        pubDate: "2026-11-27T18:53:41+00:00",
      });

      assert.ok(normalized !== null);
      assert.equal(normalized.provider, "jobicy");
      assert.equal(normalized.externalJobId, "jobicy:164597");
      assert.equal(normalized.title, "Senior Backend & Platform Engineer");
      assert.equal(normalized.company, "ScaleOps");
      assert.equal(normalized.location, "Europe");
      assert.equal(normalized.applicationUrl, "https://jobicy.com/jobs/164597-platform-engineer");
      assert.deepEqual(normalized.seniority, ["Senior", "Lead"]);
    });

    it("fetches from Jobicy unified endpoint with geo and tag params", async () => {
      let capturedUrl = "";
      const mockFetcher = (async (input: RequestInfo | URL) => {
        capturedUrl = String(input);
        return new Response(
          JSON.stringify({
            jobCount: 1,
            nextCursor: "jobicy_next_1",
            jobs: [
              {
                id: 99911,
                url: "https://jobicy.com/jobs/99911-ai-engineer",
                jobTitle: "AI Systems Engineer",
                companyName: "NeuralStack",
                jobGeo: "USA",
                jobDescription: "<p>Design LLM evaluation workflows and vector retrieval services.</p>",
                pubDate: "2026-11-27T12:00:00+00:00",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as unknown as typeof fetch;

      const res = await fetchJobicyJobs({ query: "ai", geo: "usa", limit: 20 }, mockFetcher);
      assert.ok(capturedUrl.startsWith("https://jobicy.com/api/jobs?"));
      assert.ok(capturedUrl.includes("tag=ai"));
      assert.ok(capturedUrl.includes("geo=usa"));
      assert.equal(res.provider, "jobicy");
      assert.equal(res.nextCursor, "jobicy_next_1");
      assert.equal(res.jobs.length, 1);
      assert.equal(res.jobs[0].externalJobId, "jobicy:99911");
    });
  });

  describe("3. Zod Validation Schemas", () => {
    it("enforces HTTPS URLs and strict provider enums", () => {
      const queryOk = remoteFeedQuerySchema.safeParse({
        provider: "himalayas",
        q: "TypeScript",
        limit: "20",
      });
      assert.ok(queryOk.success);

      const queryBadProvider = remoteFeedQuerySchema.safeParse({
        provider: "unknown_board",
      });
      assert.equal(queryBadProvider.success, false);

      const saveInsecure = remoteFeedSaveSchema.safeParse({
        provider: "jobicy",
        externalJobId: "jobicy:1",
        company: "TestCo",
        title: "Engineer",
        description: "Long enough description for remote feed saving validation.",
        applicationUrl: "http://jobicy.com/jobs/1",
      });
      assert.equal(saveInsecure.success, false);
    });
  });
});
