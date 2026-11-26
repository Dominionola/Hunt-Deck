import { db } from "@/lib/db";
import type { CompleteOnboardingInput } from "@/lib/validations/onboarding";
import { resumeParsedDataSchema } from "@/lib/validations/resume";

export class OnboardingResumeUnavailable extends Error {}

export async function persistOnboarding(
  user: { id: string; name: string | null; email: string },
  { importData, skillsData, targetsData }: CompleteOnboardingInput,
  database: Pick<typeof db, "$transaction"> = db,
) {
  return database.$transaction(async (tx) => {
    // Use the worker's owner lock so completion and concurrent imports cannot create two primaries.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${user.id}, 0))`;
    const existing = importData.isScratchMode
      ? await tx.resume.findFirst({ where: { userId: user.id, originalFileUrl: "scratch" } })
      : await tx.resume.findFirst({ where: { id: importData.resumeFileId, userId: user.id } });
    if (!importData.isScratchMode && !existing) throw new OnboardingResumeUnavailable();

    const source = existing ? resumeParsedDataSchema.parse(existing.parsedData) : resumeParsedDataSchema.parse({
      fullName: user.name || "", email: user.email,
    });
    const parsedData = {
      ...source,
      skills: skillsData.skills.filter((skill) => skill.isVerified).map((skill) => skill.name),
      targetSeniority: targetsData.seniorityLevel,
      ...(importData.linkedinUrl ? { linkedinUrl: importData.linkedinUrl } : {}),
    };
    await tx.resume.updateMany({ where: { userId: user.id, isPrimary: true }, data: { isPrimary: false } });
    const resume = existing
      ? await tx.resume.update({ where: { id: existing.id }, data: { parsedData, isPrimary: true } })
      : await tx.resume.create({ data: {
        userId: user.id, title: "Master Profile", originalFileUrl: "scratch", extractedText: "", parsedData, isPrimary: true,
      } });

    const profile = {
      targetTitles: targetsData.targetTitles,
      minSalary: targetsData.minSalary,
      preferredLocations: targetsData.preferredLocations,
      remotePreference: targetsData.workArrangement === "REMOTE" ? "REMOTE_ONLY" as const : targetsData.workArrangement,
    };
    await tx.profile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...profile }, update: profile });
    return { resumeId: resume.id };
  });
}
