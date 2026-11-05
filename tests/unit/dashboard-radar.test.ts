import { strict as assert } from "node:assert";
import { test } from "node:test";
import { radarResponseSchema } from "../../src/lib/validations/dashboard-radar";

const job = {
  id: "job-1", title: "Engineer", company: "Example", location: null,
  remoteType: "REMOTE_ONLY", postedAt: "2026-11-03T10:00:00.000Z",
  applicationUrl: "https://example.com/jobs/1", description: "Not needed in the dashboard",
};

test("radar accepts public listings and strips unrelated fields", () => {
  const parsed = radarResponseSchema.parse({ success: true, items: [job] });
  assert.equal(parsed.items[0].title, "Engineer");
  assert.equal("description" in parsed.items[0], false);
  assert.deepEqual(radarResponseSchema.parse({ success: true, items: [] }).items, []);
});

test("radar rejects unsafe links, invalid dates, and malformed responses", () => {
  assert.equal(radarResponseSchema.safeParse({ success: true, items: [{ ...job, applicationUrl: "javascript:alert(1)" }] }).success, false);
  assert.equal(radarResponseSchema.safeParse({ success: true, items: [{ ...job, postedAt: "not-a-date" }] }).success, false);
  assert.equal(radarResponseSchema.safeParse({ success: false, items: [] }).success, false);
});
