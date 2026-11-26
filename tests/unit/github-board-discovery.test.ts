import { it } from "node:test";
import assert from "node:assert/strict";
import { discoverBoards, fetchGithubBoardLeads, GITHUB_SOURCE } from "../../src/services/jobs/adapters/githubBoardDiscovery";
import { GET as getGithubSources } from "../../src/app/api/jobs/ingestion/github-sources/route";
import { GET as getSchedules, POST as approveSchedule, DELETE as deleteSchedule } from "../../src/app/api/jobs/ingestion/schedules/route";

it("extracts only active source-matched ATS boards and deduplicates leads", () => {
  const row = { active: true, is_visible: true, url: "https://job-boards.greenhouse.io/example/jobs/123", source: { ats: "greenhouse", board: "example", job_id: "123" } };
  const result = discoverBoards([row, row, { ...row, active: false }, { ...row, url: "https://attacker.invalid/example/jobs/123" },
    { ...row, url: "https://job-boards.greenhouse.io/other/jobs/123" }, { ...row, source: { ...row.source, job_id: "999" } }]);
  assert.deepEqual(result.sources, [{ platform: "GREENHOUSE", board: "example" }]); assert.equal(result.skipped, 4);
});
it("rejects discovery without an admin session", async () => {
  const result = await getGithubSources();
  assert.equal(result.status, 403); assert.equal(result.headers.get("cache-control"), "no-store");
});
it("rejects schedule reads and changes without an admin session", async () => {
  const request = () => new Request("http://localhost/api/jobs/ingestion/schedules", { method: "POST", body: "{}" });
  for (const response of [await getSchedules(), await approveSchedule(request()), await deleteSchedule(request())]) {
    assert.equal(response.status, 403); assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
it("only fetches the reviewed fixed source and rejects bad responses", async () => {
  const result = await fetchGithubBoardLeads(async (url, init) => { assert.equal(url, GITHUB_SOURCE); assert.equal(init?.redirect, "error"); return Response.json([]); });
  assert.deepEqual(result.sources, []);
  await assert.rejects(fetchGithubBoardLeads(async () => new Response("private", { status: 429 })), /source unavailable/);
  await assert.rejects(fetchGithubBoardLeads(async () => new Response("x".repeat(4194305))), /exceeds limit/);
});
