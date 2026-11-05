import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  step1ImportSchema,
  step2SkillsSchema,
  step3TargetsSchema,
  completeOnboardingSchema,
} from "../../src/lib/validations/onboarding";

test("step1ImportSchema accepts valid resume upload and valid LinkedIn URLs", () => {
  const valid = step1ImportSchema.parse({
    resumeFileId: "c2a32269-ee8e-449f-ba34-e5a339f5a6fa",
    fileName: "Senior_FullStack_Resume.pdf",
    fileSizeBytes: 245000,
    linkedinUrl: "https://www.linkedin.com/in/alex-morgan",
    isScratchMode: false,
  });

  assert.equal(valid.resumeFileId, "c2a32269-ee8e-449f-ba34-e5a339f5a6fa");
  assert.equal(valid.fileName, "Senior_FullStack_Resume.pdf");
  assert.equal(valid.isScratchMode, false);
});

test("step1ImportSchema accepts scratch mode and empty LinkedIn URL", () => {
  const scratch = step1ImportSchema.parse({
    resumeFileId: "scratch-profile-init",
    linkedinUrl: "",
    isScratchMode: true,
  });

  assert.equal(scratch.isScratchMode, true);
  assert.equal(scratch.linkedinUrl, "");
});

test("step1ImportSchema rejects malformed LinkedIn profile URLs", () => {
  const result = step1ImportSchema.safeParse({
    resumeFileId: "test-id",
    linkedinUrl: "https://twitter.com/not-linkedin",
  });

  assert.equal(result.success, false);
});

test("step2SkillsSchema enforces a minimum of 3 verified skills", () => {
  const valid = step2SkillsSchema.parse({
    skills: [
      { name: "TypeScript", category: "Languages", isVerified: true },
      { name: "React", category: "Frameworks", isVerified: true },
      { name: "PostgreSQL", category: "Cloud", isVerified: true },
    ],
    atsReadabilityScore: 92,
  });

  assert.equal(valid.skills.length, 3);
  assert.equal(valid.atsReadabilityScore, 92);

  const tooFew = step2SkillsSchema.safeParse({
    skills: [{ name: "TypeScript", category: "Languages", isVerified: true }],
  });
  assert.equal(tooFew.success, false);
});

test("step3TargetsSchema validates career calibration inputs and salary floor", () => {
  const valid = step3TargetsSchema.parse({
    targetTitles: ["Staff Software Engineer", "Platform Architect"],
    workArrangement: "REMOTE",
    preferredLocations: ["San Francisco, CA", "Remote US"],
    seniorityLevel: "LEAD",
    minSalary: 185000,
  });

  assert.equal(valid.workArrangement, "REMOTE");
  assert.equal(valid.seniorityLevel, "LEAD");
  assert.equal(valid.minSalary, 185000);

  const missingTitle = step3TargetsSchema.safeParse({
    targetTitles: [],
    workArrangement: "REMOTE",
    seniorityLevel: "SENIOR",
    minSalary: 100000,
  });
  assert.equal(missingTitle.success, false);
});

test("completeOnboardingSchema aggregates all wizard steps into a validated payload", () => {
  const complete = completeOnboardingSchema.parse({
    importData: {
      resumeFileId: "file-99",
      fileName: "cv.pdf",
      linkedinUrl: "https://linkedin.com/in/johndoe",
      isScratchMode: false,
    },
    skillsData: {
      skills: [
        { name: "Next.js", category: "Frameworks", isVerified: true },
        { name: "Docker", category: "Cloud", isVerified: true },
        { name: "Go", category: "Languages", isVerified: true },
      ],
      atsReadabilityScore: 88,
    },
    targetsData: {
      targetTitles: ["Senior Full-Stack Engineer"],
      workArrangement: "HYBRID",
      seniorityLevel: "SENIOR",
      minSalary: 140000,
    },
  });

  assert.equal(complete.importData.fileName, "cv.pdf");
  assert.equal(complete.skillsData.skills.length, 3);
  assert.equal(complete.targetsData.minSalary, 140000);
});
