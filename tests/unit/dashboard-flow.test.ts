import { it } from "node:test";
import assert from "node:assert/strict";
import { dashboardWeeks } from "../../src/services/db/dashboardService";
import { dashboardMetricsSchema } from "../../src/lib/validations/dashboard";
import { loadSavedOnboardingResume } from "../../src/features/onboarding/importResume";
import { step3TargetsSchema } from "../../src/lib/validations/onboarding";

it("buckets submissions by Monday UTC across year and timezone boundaries", () => {
  const weeks = dashboardWeeks(new Date("2026-01-04T23:59:59Z"));
  assert.equal(weeks[5].start, "2025-12-29T00:00:00.000Z");
  assert.equal(weeks[0].start, "2025-11-24T00:00:00.000Z");
  assert.equal(dashboardWeeks(new Date("2026-01-05T00:00:00Z"))[5].start, "2026-01-05T00:00:00.000Z");
  assert.ok(weeks.every((week) => week.count === 0));
});
it("rejects missing, invalid or negative dashboard figures", () => {
  assert.equal(dashboardMetricsSchema.safeParse({ success: true, pipeline: { total: -1 } }).success, false);
  assert.equal(dashboardMetricsSchema.safeParse({ success: true }).success, false);
});
it("reloads a saved owned result without upload or processing calls", async (t) => {
  const urls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    urls.push(String(url));
    return Response.json({ success: true, resume: { id: "owned", title: "Saved profile", parsedData: { fullName: "Synthetic", skills: ["Python"] } } });
  });
  const saved = await loadSavedOnboardingResume();
  assert.equal(saved?.id, "owned"); assert.deepEqual(urls, ["/api/resumes"]);
});
it("does not silently replace expired or malformed saved-resume responses", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: "PRIVATE_CANARY" }, { status: 401 }));
  await assert.rejects(loadSavedOnboardingResume(), /Please sign in again/);
});
it("requires explicit target choices and defaults to no salary restriction", () => {
  assert.equal(step3TargetsSchema.safeParse({ targetTitles: ["Data Analyst"] }).success, false);
  const target = step3TargetsSchema.parse({ targetTitles: ["Data Analyst"], workArrangement: "REMOTE", seniorityLevel: "ENTRY" });
  assert.equal(target.minSalary, 0); assert.deepEqual(target.preferredLocations, []);
});
