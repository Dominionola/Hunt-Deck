import { it } from "node:test";
import assert from "node:assert/strict";
import { parseRoleChoices, suggestRoles as inferRoles } from "../../src/services/matching/roleSuggestions";
import { getRoleCatalog } from "../../src/services/matching/roleCatalog";
import type { RoleProfile } from "../../src/lib/validations/roleCatalog";
const suggestRoles = (profile?: RoleProfile) => inferRoles(profile, getRoleCatalog());
import { resumeParsedDataSchema } from "../../src/lib/validations/resume";
import { completeOnboardingSchema } from "../../src/lib/validations/onboarding";

const resume = () => resumeParsedDataSchema.parse({
  fullName: "Synthetic Candidate", email: "private-canary@example.invalid", phone: "PRIVATE_PHONE_CANARY",
  skills: ["Research", "Literature review", "Excel", "SQL", "Technical writing", "Editing"],
  experience: [{ title: "Research Assistant", company: "Synthetic Institute", startDate: "2023", isCurrent: true, bullets: ["Conducted literature reviews and collected research data."] }],
  education: [{ institution: "Synthetic College", degree: "BSc", fieldOfStudy: "Biology" }],
});
it("explains direct experience and adjacent roles using reviewed skills", () => {
  const result = suggestRoles(resume());
  assert.equal(result.find((role) => role.title === "Research Assistant")?.kind, "aligned");
  const adjacent = result.find((role) => role.title.toLowerCase() === "data analyst");
  assert.equal(adjacent?.kind, "transferable"); assert.match(adjacent!.reason, /Excel/); assert.match(adjacent!.reason, /SQL/);
  assert.ok(!JSON.stringify(result).includes("PRIVATE_PHONE_CANARY"));
  assert.ok(!JSON.stringify(result).includes("private-canary@example.invalid"));
  assert.equal(result.some((role) => role.title === "Senior Data Analyst"), false);
  assert.equal(result.some((role) => /\b(manager|director|head|chief|supervisor|lead)\b/i.test(role.title)), false);
  assert.equal(result.some((role) => /sound editor|motion picture editor/.test(role.title)), false, "Generic editing must not establish media production skills");
});
it("does not manufacture suggestions from an empty profile or degree alone", () => {
  assert.deepEqual(suggestRoles(), []);
  assert.deepEqual(suggestRoles(resumeParsedDataSchema.parse({ fullName: "Synthetic" })), []);
  assert.deepEqual(suggestRoles({ skills: [], experience: [], projects: [], education: resume().education }), []);
});
it("uses the confirmed skill list and never recovers rejected skills from project prose", () => {
  const reviewed = { ...resume(), skills: [], projects: [{ name: "SQL research", description: "Python and SQL analysis", technologies: ["Python", "SQL"] }] };
  const result = suggestRoles(reviewed);
  assert.equal(result.some((role) => role.title.toLowerCase() === "data analyst"), false);
  assert.equal(result.length, 1); assert.equal(result[0].title, "Research Assistant");
});
it("uses project evidence without inferring seniority or qualifications", () => {
  const profile = resumeParsedDataSchema.parse({ fullName: "Synthetic", skills: ["React", "CSS", "JavaScript"],
    projects: [{ name: "Web developer", description: "Built a portfolio as a web developer.", technologies: ["React"] }] });
  assert.ok(suggestRoles(profile).some((role) => role.title === "web developer" && role.kind === "aligned"));
});
it("matches whole skill phrases instead of short-language substrings", () => {
  const profile = resumeParsedDataSchema.parse({ fullName: "Synthetic", skills: ["Research", "Orange", "Django"] });
  assert.deepEqual(suggestRoles(profile), []);
  const developer = resumeParsedDataSchema.parse({ fullName: "Synthetic", skills: ["C++", "SQL"] });
  assert.ok(suggestRoles(developer).some((role) => role.reason.includes("C++")));
});
it("deduplicates and bounds suggestions without suggesting generic student roles", () => {
  const source = resume();
  source.experience = ["Research Assistant", "research assistant", "Student", ...Array.from({ length: 10 }, (_, i) => `Synthetic Role ${i}`)]
    .map((title) => ({ title, company: "Synthetic", startDate: "2023", isCurrent: false, bullets: [] }));
  const result = suggestRoles(source);
  assert.equal(result.filter((role) => role.title.toLowerCase() === "research assistant").length, 1);
  assert.equal(result.some((role) => role.title === "Student"), false);
  assert.ok(result.filter((role) => role.kind === "aligned").length <= 20);
  assert.ok(result.filter((role) => role.kind === "transferable").length <= 20);
});
it("saves only accepted roles with canonical spacing and no inferred extras", () => {
  const selected = suggestRoles(resume()).find((role) => role.title.toLowerCase() === "data analyst")!;
  const payload = completeOnboardingSchema.parse({
    importData: { resumeFileId: "owned", isScratchMode: false },
    skillsData: { skills: ["Excel", "SQL", "Research"].map((name) => ({ name, category: "Domains", isVerified: true })) },
    targetsData: { targetTitles: [selected.title, " data   analyst "], workArrangement: "REMOTE", seniorityLevel: "ENTRY" },
  });
  assert.deepEqual(payload.targetsData.targetTitles, ["data analyst"]);
  assert.equal(payload.targetsData.targetTitles.includes("Research Assistant"), false);
});
it("keeps commas within role titles and deduplicates edited choices", () => {
  assert.deepEqual(parseRoleChoices("Research Assistant, Biology; Data Analyst; data   analyst"), ["Research Assistant, Biology", "data analyst"]);
});
