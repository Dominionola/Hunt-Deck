import assert from "node:assert/strict";
import test from "node:test";
import type { Job } from "bullmq";
import {
  fetchFreehireJobBySlug,
  fetchFreehireJobs,
  mapFreehireAtsPlatform,
  mapFreehireRemoteType,
} from "../../src/services/jobs/adapters/freehireAdapter";
import {
  freehireImportRequestSchema,
  freehireLiveSearchQuerySchema,
  freehireSaveSlugSchema,
  type FreehireIngestionJob,
} from "../../src/lib/validations/freehire";
import { processFreehireIngestion } from "../../src/services/queue/jobIngestionProcessor";
import type { IngestionCounts } from "../../src/lib/validations/jobIngestion";

test("freehire validation schemas enforce bounds and formats", () => {
  assert.equal(
    freehireImportRequestSchema.safeParse({
      query: "Frontend Developer",
      workMode: "REMOTE_ONLY",
      sourceFilter: "ATS_ONLY",
      limit: 25,
    }).success,
    true
  );
  assert.equal(freehireImportRequestSchema.safeParse({ query: "a" }).success, false);
  assert.equal(freehireLiveSearchQuerySchema.safeParse({ q: "React", limit: 12 }).success, true);
  assert.equal(freehireSaveSlugSchema.safeParse({ publicSlug: "senior-eng-acme-123" }).success, true);
  assert.equal(freehireSaveSlugSchema.safeParse({ publicSlug: "https://evil.com" }).success, false);
});

test("mapFreehireAtsPlatform and mapFreehireRemoteType normalize values accurately", () => {
  assert.equal(mapFreehireAtsPlatform("greenhouse"), "GREENHOUSE");
  assert.equal(mapFreehireAtsPlatform("ashby"), "ASHBY");
  assert.equal(mapFreehireAtsPlatform("workday"), "WORKDAY");
  assert.equal(mapFreehireAtsPlatform("lever"), "LEVER");
  assert.equal(mapFreehireAtsPlatform("whatjobs-ng"), "OTHER");

  assert.equal(mapFreehireRemoteType("remote"), "REMOTE_ONLY");
  assert.equal(mapFreehireRemoteType("hybrid"), "HYBRID");
  assert.equal(mapFreehireRemoteType("onsite"), "ONSITE");
  assert.equal(mapFreehireRemoteType(null, "Remote - Europe"), "REMOTE_ONLY");
  assert.equal(mapFreehireRemoteType(null, "London, UK"), "ANY");
});

test("fetchFreehireJobs queries fixed host, cleans descriptions, and falls back to freehire URL when empty", async () => {
  let capturedUrl = "";
  const mockFetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(url);
    assert.equal(init?.redirect, "error");
    return Response.json({
      meta: { total: 42, limit: 25, offset: 0 },
      data: [
        {
          public_slug: "frontend-dev-acme-123",
          title: "Frontend Developer",
          company: "Acme Corp",
          source: "ashby",
          url: "",
          location: "Anywhere",
          work_mode: "remote",
          description: "<p>Build fast React and TypeScript interfaces for global teams.</p>",
          posted_at: "2026-11-26T08:00:00Z",
          enrichment: { salary_min: 110000, salary_max: 140000, salary_currency: "USD" },
        },
        {
          public_slug: "too-short-999",
          title: "Intern",
          company: "Tiny",
          description: "Short",
        },
      ],
    });
  }) as unknown as typeof fetch;

  const result = await fetchFreehireJobs(
    { query: "Frontend", workMode: "REMOTE_ONLY", sourceFilter: "ASHBY", limit: 25 },
    mockFetcher
  );

  assert.ok(capturedUrl.startsWith("https://freehire.me/api/v1/"));
  assert.ok(capturedUrl.includes("work_mode=remote"));
  assert.ok(capturedUrl.includes("source=ashby"));
  assert.equal(result.totalAvailable, 42);
  assert.equal(result.selected, 1);
  assert.equal(result.invalid, 1);
  assert.equal(result.jobs[0].applicationUrl, "https://freehire.me/jobs/frontend-dev-acme-123");
  assert.equal(result.jobs[0].atsPlatform, "ASHBY");
  assert.equal(result.jobs[0].remoteType, "REMOTE_ONLY");
  assert.equal(result.jobs[0].salaryMin, 110000);
  assert.equal(result.jobs[0].externalJobId, "freehire:frontend-dev-acme-123");
  assert.ok(result.jobs[0].techStack.includes("React"));
});

test("fetchFreehireJobBySlug returns null on 404 and normalizes valid postings", async () => {
  const notFound = (async () => new Response("Not Found", { status: 404 })) as unknown as typeof fetch;
  assert.equal(await fetchFreehireJobBySlug("missing-slug", notFound), null);

  const okFetch = (async () =>
    Response.json({
      data: {
        public_slug: "ai-eng-linear-777",
        title: "AI Engineer",
        company: "Linear",
        source: "ashby",
        apply_url: "https://jobs.ashbyhq.com/linear/777",
        description: "Design and deploy LLM evaluation pipelines with TypeScript and Python.",
      },
    })) as unknown as typeof fetch;

  const job = await fetchFreehireJobBySlug("ai-eng-linear-777", okFetch);
  assert.ok(job !== null);
  assert.equal(job.applicationUrl, "https://jobs.ashbyhq.com/linear/777");
  assert.equal(job.atsPlatform, "ASHBY");
});

test("processFreehireIngestion enforces admin authorization and records saved counts", async () => {
  const progressUpdates: unknown[] = [];
  const fakeJob = {
    data: {
      userId: "admin_1",
      query: "Frontend",
      workMode: "REMOTE_ONLY",
      sourceFilter: "ALL",
      limit: 15,
    },
    updateProgress: async (p: unknown) => {
      progressUpdates.push(p);
    },
    log: async () => 1,
  } as unknown as Job<FreehireIngestionJob, IngestionCounts>;

  const counts = await processFreehireIngestion(fakeJob, {
    authorized: async () => true,
    allowQuery: async () => true,
    fetchFreehire: async () => ({
      fetched: 1,
      selected: 1,
      invalid: 0,
      totalAvailable: 1,
      jobs: [
        {
          publicSlug: "fe-1",
          sourceName: "greenhouse",
          title: "Frontend Engineer",
          company: "Acme",
          description: "Build React applications at scale with TypeScript.",
          remoteType: "REMOTE_ONLY",
          atsPlatform: "GREENHOUSE",
          applicationUrl: "https://freehire.me/jobs/fe-1",
          externalJobId: "freehire:fe-1",
          techStack: ["React", "TypeScript"],
        },
      ],
    }),
    persist: async () => ({ id: "job_db_1", embedded: true }),
  });

  assert.deepEqual(counts, {
    fetched: 1,
    selected: 1,
    saved: 1,
    failed: 0,
    embedded: 1,
    sourcesFailed: 0,
    incompleteSources: 0,
  });
  assert.equal(progressUpdates.at(-1), 100);
});
