import { it } from "node:test";
import assert from "node:assert/strict";
import { extractedSkills, importOnboardingResume, saveOnboarding } from "../../src/features/onboarding/importResume";
import { completeOnboardingSchema, step2SkillsSchema } from "../../src/lib/validations/onboarding";
import { resumeParsedDataSchema } from "../../src/lib/validations/resume";
import { db } from "../../src/lib/db";
import { persistOnboarding, OnboardingResumeUnavailable } from "../../src/services/onboarding/onboardingService";

const source = resumeParsedDataSchema.parse({
  fullName: "Morgan Synthetic", email: "morgan@example.invalid", skills: ["Python", "SQL", "Docker"],
  experience: [{ title: "Data Engineer", company: "Example Test Labs", startDate: "2022-02", isCurrent: true, bullets: ["Built 12 test pipelines."] }],
  education: [{ institution: "Example College", degree: "BSc", graduationYear: "2021" }],
});
const input = completeOnboardingSchema.parse({
  importData: { resumeFileId: "owned-resume", linkedinUrl: "https://www.linkedin.com/in/morgan-synthetic" },
  skillsData: { skills: extractedSkills(source.skills) },
  targetsData: { targetTitles: ["Data Engineer"], workArrangement: "HYBRID", seniorityLevel: "MID", minSalary: 0 },
});

it("uses only unique extracted skills and never seeds a scratch profile", () => {
  assert.deepEqual(extractedSkills([]), []);
  assert.deepEqual(extractedSkills([" SQL ", "sql", "Python", ""]).map((s) => s.name), ["SQL", "Python"]);
  assert.equal(step2SkillsSchema.safeParse({ skills: input.skillsData.skills.map((s) => ({ ...s, isVerified: false })) }).success, false);
  assert.equal(input.skillsData.atsReadabilityScore, undefined);
});

it("waits for an ownership-checked completed job and returns real extraction", async (t) => {
  const urls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    urls.push(String(url));
    return urls.length === 1 ? Response.json({ jobId: "synthetic-job" }, { status: 202 })
      : Response.json({ status: "completed", resumeId: "owned-resume", parsedData: source });
  });
  const result = await importOnboardingResume(new File(["%PDF-synthetic"], "resume.pdf", { type: "application/pdf" }), () => {});
  assert.equal(result.resumeId, "owned-resume");
  assert.deepEqual(result.parsedData, source);
  assert.deepEqual(urls, ["/api/resumes/upload", "/api/resumes/status?jobId=synthetic-job"]);
});

it("stops after an unauthorized upload instead of presenting example skills", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ error: "PRIVATE_PROVIDER_CANARY" }, { status: 401 }));
  await assert.rejects(importOnboardingResume(new File(["%PDF-test"], "resume.pdf"), () => {}), /Please sign in/);
  assert.equal(fetch.mock.callCount(), 1);
});

it("rejects unsupported files and failed worker results", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => ++calls === 1
    ? Response.json({ jobId: "synthetic" }, { status: 202 }) : Response.json({ status: "failed" }));
  await assert.rejects(importOnboardingResume(new File(["text"], "resume.docx"), () => {}), /PDF/);
  assert.equal(calls, 0);
  await assert.rejects(importOnboardingResume(new File(["%PDF-test"], "resume.pdf"), () => {}), /processing failed/);
});

it("reports unsuccessful profile saves and accepts only an acknowledged success", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false }, { status: 500 }));
  await assert.rejects(saveOnboarding(input), /could not be saved/);
  fetch.mock.mockImplementation(async () => Response.json({ success: true }));
  await assert.doesNotReject(saveOnboarding(input));
});

it("preserves imported facts, saves the LinkedIn reference, and excludes unconfirmed skills", async () => {
  let saved: Record<string, unknown> = {};
  let profile: Record<string, unknown> = {};
  const tx = {
    $queryRaw: async () => [],
    resume: {
      findFirst: async (query: { where: { userId: string; id: string } }) => {
        assert.equal(query.where.userId, "owner"); assert.equal(query.where.id, "owned-resume");
        return { id: "owned-resume", parsedData: source };
      },
      updateMany: async () => ({}),
      update: async (query: { data: Record<string, unknown> }) => { saved = query.data; return { id: "owned-resume" }; },
    },
    profile: { upsert: async (query: { create: Record<string, unknown> }) => { profile = query.create; } },
  };
  const database = { $transaction: async (fn: (arg: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as Pick<typeof db, "$transaction">;
  await persistOnboarding({ id: "owner", name: null, email: "account@example.invalid" }, {
    ...input, skillsData: { skills: [...input.skillsData.skills, { name: "Unconfirmed", category: "Domains", isVerified: false }] },
  }, database);
  const data = saved.parsedData as typeof source;
  assert.equal(data.fullName, source.fullName); assert.deepEqual(data.experience, source.experience);
  assert.deepEqual(data.education, source.education); assert.deepEqual(data.skills, source.skills);
  assert.equal(data.linkedinUrl, input.importData.linkedinUrl);
  assert.equal(data.targetSeniority, "MID");
  assert.equal(profile.minSalary, 0); assert.equal(profile.remotePreference, "HYBRID");
  assert.equal(profile.experienceYears, undefined); assert.equal(profile.maxSalary, undefined);
  assert.equal(saved.atsScore, undefined);
});

it("rejects an unavailable or cross-user resume before modifying profile or primary selection", async () => {
  const tx = { $queryRaw: async () => [], resume: { findFirst: async () => null } };
  const database = { $transaction: async (fn: (arg: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as Pick<typeof db, "$transaction">;
  await assert.rejects(persistOnboarding({ id: "other", name: null, email: "other@example.invalid" }, input, database), OnboardingResumeUnavailable);
});
