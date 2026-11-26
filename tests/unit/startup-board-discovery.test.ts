import assert from "node:assert/strict";
import test from "node:test";
import {
  CURATED_FUNDED_STARTUPS,
  discoverStartupAts,
  publicBoardUrl,
  startupProbeInputSchema,
} from "../../src/services/jobs/adapters/startupBoardDiscovery";

test("CURATED_FUNDED_STARTUPS provides valid startup board metadata", () => {
  assert.ok(CURATED_FUNDED_STARTUPS.length >= 20);
  for (const startup of CURATED_FUNDED_STARTUPS) {
    assert.ok(["ASHBY", "GREENHOUSE", "LEVER"].includes(startup.platform));
    assert.match(startup.board, /^[a-z0-9][a-z0-9_-]{0,79}$/);
    assert.match(publicBoardUrl(startup), /^https:\/\//);
  }
});

test("publicBoardUrl formats board review URLs accurately per ATS platform", () => {
  assert.equal(publicBoardUrl({ platform: "ASHBY", board: "linear" }), "https://jobs.ashbyhq.com/linear");
  assert.equal(publicBoardUrl({ platform: "GREENHOUSE", board: "vercel" }), "https://job-boards.greenhouse.io/vercel");
  assert.equal(publicBoardUrl({ platform: "LEVER", board: "spotify" }), "https://jobs.lever.co/spotify");
});

test("discoverStartupAts probes Ashby, Greenhouse, and Lever APIs and returns active matches", async () => {
  const mockFetcher = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("api.ashbyhq.com")) {
      return new Response(JSON.stringify({ jobs: [{ id: "1" }, { id: "2" }] }), { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  }) as unknown as typeof fetch;

  const result = await discoverStartupAts("Linear", mockFetcher);
  assert.equal(result.found, true);
  assert.deepEqual(result.matches, [
    {
      platform: "ASHBY",
      board: "linear",
      jobCount: 2,
      boardUrl: "https://jobs.ashbyhq.com/linear",
    },
  ]);
});

test("startupProbeInputSchema rejects invalid slug formats", () => {
  assert.equal(startupProbeInputSchema.safeParse({ slug: "valid-slug_1" }).success, true);
  assert.equal(startupProbeInputSchema.safeParse({ slug: "https://evil.com" }).success, false);
  assert.equal(startupProbeInputSchema.safeParse({ slug: "" }).success, false);
});
