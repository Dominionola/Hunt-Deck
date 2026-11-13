import { db } from "@/lib/db";
import type { UploadResumeInput } from "@/lib/validations/resume";

export async function createResume(userId: string, input: UploadResumeInput) {
  // If user has no existing resumes, make this one primary
  const existingCount = await db.resume.count({
    where: { userId },
  });

  return db.resume.create({
    data: {
      userId,
      title: input.title,
      originalFileUrl: input.originalFileUrl,
      extractedText: input.extractedText,
      parsedData: input.parsedData,
      atsScore: input.atsScore,
      isPrimary: existingCount === 0,
    },
  });
}

export async function getPrimaryResume(userId: string) {
  return db.resume.findFirst({
    where: {
      userId,
      isPrimary: true,
    },
  });
}

export async function getUserResumes(userId: string) {
  return db.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function setPrimaryResume(userId: string, resumeId: string) {
  return db.$transaction([
    db.resume.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    }),
    db.resume.update({
      where: { id: resumeId, userId },
      data: { isPrimary: true },
    }),
  ]);
}

export async function updateResumeParsedData(
  userId: string,
  resumeId: string,
  parsedData: Record<string, unknown>
) {
  return db.resume.update({
    where: {
      id: resumeId,
      userId,
    },
    data: {
      parsedData: parsedData as any,
    },
  });
}
