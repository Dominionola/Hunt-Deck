import assert from "node:assert/strict";
import test from "node:test";
import { jobQuerySchema } from "../../src/lib/validations/job";
import { buildRegionPrismaWhere, buildRegionSqlClause } from "../../src/services/jobs/regionFilter";

test("jobQuerySchema parses comma-separated and array titles into deduplicated list", () => {
  const fromCsv = jobQuerySchema.safeParse({
    titles: "Frontend Developer, Backend Engineer , Frontend Developer",
    regionScope: "WORLDWIDE",
  });
  assert.equal(fromCsv.success, true);
  if (fromCsv.success) {
    assert.deepEqual(fromCsv.data.titles, ["Frontend Developer", "Backend Engineer"]);
    assert.equal(fromCsv.data.regionScope, "WORLDWIDE");
  }

  const emptyTitles = jobQuerySchema.safeParse({ titles: "" });
  assert.equal(emptyTitles.success, true);
  if (emptyTitles.success) {
    assert.equal(emptyTitles.data.titles, undefined);
  }
});

test("jobQuerySchema rejects invalid regionScope values", () => {
  assert.equal(jobQuerySchema.safeParse({ regionScope: "MARS" }).success, false);
});

test("regionFilter builders return null for ANY/undefined and structured filters for WORLDWIDE/US/EMEA", () => {
  assert.equal(buildRegionSqlClause(undefined), null);
  assert.equal(buildRegionSqlClause("ANY"), null);
  assert.equal(buildRegionPrismaWhere(undefined), null);
  assert.equal(buildRegionPrismaWhere("ANY"), null);

  for (const scope of ["WORLDWIDE", "US", "EMEA"] as const) {
    assert.ok(buildRegionSqlClause(scope) !== null);
    assert.ok(buildRegionPrismaWhere(scope) !== null);
  }
});
