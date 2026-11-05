import { db } from "@/lib/db";
import type {
  CreateApplicationInput,
  UpdateApplicationStatusInput,
} from "@/lib/validations/application";

export async function createApplication(
  userId: string,
  input: CreateApplicationInput
) {
  return db.application.create({
    data: {
      userId,
      jobId: input.jobId,
      resumeId: input.resumeId,
      tailoredResumeUrl: input.tailoredResumeUrl,
      coverLetterText: input.coverLetterText,
      status: input.status,
      appliedAt: input.status === "APPLIED" ? new Date() : undefined,
    },
    include: {
      job: true,
      resume: true,
    },
  });
}

export async function getUserApplications(userId: string) {
  return db.application.findMany({
    where: { userId },
    include: {
      job: true,
      resume: {
        select: { id: true, title: true, atsScore: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateApplicationStatus(
  userId: string,
  applicationId: string,
  input: UpdateApplicationStatusInput
) {
  return db.application.update({
    where: {
      id: applicationId,
      userId, // Guard: Ensure user owns this application
    },
    data: {
      status: input.status,
      interviewNotes: input.interviewNotes,
      followUpDate: input.followUpDate,
      appliedAt: input.status === "APPLIED" ? new Date() : undefined,
    },
    include: {
      job: true,
    },
  });
}
