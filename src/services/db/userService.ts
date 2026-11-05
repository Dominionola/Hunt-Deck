import { db } from "@/lib/db";
import type { UpdateProfileInput } from "@/lib/validations/auth";

export async function getUserById(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      resumes: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });
}

export async function getUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    include: {
      profile: true,
    },
  });
}

export async function upsertUserProfile(
  userId: string,
  data: UpdateProfileInput
) {
  return db.profile.upsert({
    where: { userId },
    create: {
      userId,
      headline: data.headline,
      targetTitles: data.targetTitles,
      minSalary: data.minSalary,
      maxSalary: data.maxSalary,
      preferredLocations: data.preferredLocations,
      remotePreference: data.remotePreference,
      experienceYears: data.experienceYears,
    },
    update: {
      headline: data.headline,
      targetTitles: data.targetTitles,
      minSalary: data.minSalary,
      maxSalary: data.maxSalary,
      preferredLocations: data.preferredLocations,
      remotePreference: data.remotePreference,
      experienceYears: data.experienceYears,
    },
  });
}
