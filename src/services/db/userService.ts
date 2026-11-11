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

/**
 * Find user by verified Supabase Auth subject UUID
 */
export async function getUserByAuthSubject(authSubject: string) {
  return db.user.findUnique({
    where: { authSubject },
    include: {
      profile: true,
      resumes: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });
}

/**
 * Synchronize verified Supabase session user with internal Prisma user
 */
export async function syncSupabaseUser(
  authSubject: string,
  email: string,
  name?: string
) {
  const includeQuery = {
    profile: true,
    resumes: {
      where: { isPrimary: true },
      take: 1,
    },
  };

  // Check if user already exists by authSubject
  let user = await db.user.findUnique({
    where: { authSubject },
    include: includeQuery,
  });

  if (user) {
    if (name && !user.name) {
      user = await db.user.update({
        where: { id: user.id },
        data: { name },
        include: includeQuery,
      });
    }
    return user;
  }

  // Check if existing user by email needs authSubject linked
  const existingByEmail = await db.user.findUnique({
    where: { email },
    include: includeQuery,
  });

  if (existingByEmail) {
    return db.user.update({
      where: { id: existingByEmail.id },
      data: {
        authSubject,
        ...(name && !existingByEmail.name ? { name } : {}),
      },
      include: includeQuery,
    });
  }

  // Create new user mapped to verified Supabase subject
  return db.user.create({
    data: {
      authSubject,
      email,
      name,
      role: "USER",
    },
    include: includeQuery,
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
