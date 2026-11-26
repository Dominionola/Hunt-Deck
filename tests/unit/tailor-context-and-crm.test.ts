import assert from "node:assert/strict";
import test from "node:test";
import { mapDbJobToTailorTarget } from "../../src/services/tailor/loadTailorContext";
import type { JobPosting } from "@prisma/client";

test("mapDbJobToTailorTarget converts a real PostgreSQL JobPosting into TailorTargetJob accurately", () => {
  const dbJob = {
    id: "cmwxcxrnz0001uq3cff06h01q",
    title: "Software Engineer (Full-Stack)",
    company: "Runpod",
    description:
      "Build scalable cloud GPU dashboards using TypeScript, React, Next.js, and PostgreSQL. Must have Kubernetes and Docker experience.",
    location: "Remote - USA",
    salaryMin: 140000,
    salaryMax: 190000,
    remoteType: "REMOTE_ONLY",
    atsPlatform: "ASHBY",
    applicationUrl: "https://jobs.ashbyhq.com/runpod/123",
    externalJobId: "ashby:123",
    embeddingModel: null,
    embeddingVersion: null,
    contentHash: null,
    embeddedAt: null,
    postedAt: new Date("2026-11-26T08:00:00Z"),
    createdAt: new Date("2026-11-26T08:00:00Z"),
    updatedAt: new Date("2026-11-26T08:00:00Z"),
    sourceDorkId: null,
  } as unknown as JobPosting;

  const target = mapDbJobToTailorTarget(dbJob, ["TypeScript", "React", "PostgreSQL"]);
  assert.equal(target.id, "cmwxcxrnz0001uq3cff06h01q");
  assert.equal(target.company, "Runpod");
  assert.equal(target.title, "Software Engineer (Full-Stack)");
  assert.equal(target.atsPlatform, "Ashby");
  assert.equal(target.remoteType, "Remote");
  assert.equal(target.salaryRange, "$140,000 – $190,000");
  assert.ok(target.mustHaveSkills.length > 0);
  assert.ok(target.fitScore >= 48 && target.fitScore <= 98);
});
