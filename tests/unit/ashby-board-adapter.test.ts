import assert from "node:assert/strict";
import test from "node:test";
import { ingestionSourceSchema } from "../../src/lib/validations/jobIngestion";
import { BoardRequestError, fetchPublicBoard } from "../../src/services/jobs/adapters/publicBoard";

test("ingestionSourceSchema accepts ASHBY board slugs and rejects URLs", () => {
  assert.equal(ingestionSourceSchema.safeParse({ platform: "ASHBY", board: "Linear" }).success, true);
  assert.equal(ingestionSourceSchema.safeParse({ platform: "ASHBY", board: "https://jobs.ashbyhq.com/linear" }).success, false);
});

test("fetchPublicBoard fetches Ashby public boards with fixed host, no redirects, and workplace mapping", async () => {
  let seenUrl = "";
  const result = await fetchPublicBoard(
    { platform: "ASHBY", board: "synthetic" },
    async (url, init) => {
      seenUrl = String(url);
      assert.equal(init?.redirect, "error");
      return Response.json({
        jobs: [
          {
            id: "ashby_1",
            title: "Backend Engineer",
            jobUrl: "https://jobs.ashbyhq.com/synthetic/ashby_1",
            descriptionPlain: "Build distributed TypeScript and PostgreSQL systems.",
            location: "Anywhere",
            isRemote: true,
            isListed: true,
          },
          {
            id: "ashby_2",
            title: "Hidden Role",
            jobUrl: "https://jobs.ashbyhq.com/synthetic/ashby_2",
            descriptionPlain: "Unlisted role should be skipped without counting invalid.",
            isListed: false,
          },
          {
            id: "ashby_3",
            title: "Hybrid Designer",
            jobUrl: "https://jobs.ashbyhq.com/synthetic/ashby_3",
            descriptionHtml: "<p>Design institutional financial workflows.</p>",
            workplaceType: "Hybrid",
            location: "London",
          },
          {
            id: "ashby_4",
            title: "Too Short",
            jobUrl: "https://jobs.ashbyhq.com/synthetic/ashby_4",
            descriptionPlain: "Short",
          },
        ],
      });
    },
  );

  assert.equal(seenUrl, "https://api.ashbyhq.com/posting-api/job-board/synthetic?includeCompensation=true");
  assert.equal(result.jobs.length, 2);
  assert.equal(result.invalid, 1);
  assert.equal(result.jobs[0].atsPlatform, "ASHBY");
  assert.equal(result.jobs[0].remoteType, "REMOTE_ONLY");
  assert.equal(result.jobs[1].remoteType, "HYBRID");
  assert.equal(result.jobs[1].description.includes("<p>"), false);
});

test("fetchPublicBoard fails closed on duplicate Ashby job IDs", async () => {
  await assert.rejects(
    () =>
      fetchPublicBoard({ platform: "ASHBY", board: "synthetic" }, async () =>
        Response.json({
          jobs: [
            { id: "dup_1", title: "Role A", jobUrl: "https://jobs.ashbyhq.com/s/1", descriptionPlain: "Long enough synthetic description." },
            { id: "dup_1", title: "Role B", jobUrl: "https://jobs.ashbyhq.com/s/2", descriptionPlain: "Long enough synthetic description." },
          ],
        }),
      ),
    (err: unknown) => err instanceof BoardRequestError && err.transient === true,
  );
});
