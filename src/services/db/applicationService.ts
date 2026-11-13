import { db } from "@/lib/db";
import type {
  CreateApplicationInput,
  UpdateApplicationStatusInput,
} from "@/lib/validations/application";
import type { PipelineApplication, PipelineStage } from "@/features/applications/types";
import { ApplicationStatus, RemotePreference, AtsPlatform } from "@prisma/client";

export function mapStageToStatus(stage: PipelineStage): ApplicationStatus {
  switch (stage) {
    case "saved":
    case "tailored":
      return ApplicationStatus.SAVED;
    case "applied":
      return ApplicationStatus.APPLIED;
    case "interviewing":
      return ApplicationStatus.INTERVIEWING;
    case "offer":
      return ApplicationStatus.OFFER;
    default:
      return ApplicationStatus.SAVED;
  }
}

export function toPipelineApplication(app: {
  id: string;
  status: ApplicationStatus;
  appliedAt: Date | null;
  interviewNotes: string | null;
  tailoredResumeUrl?: string | null;
  coverLetterText?: string | null;
  job: {
    id: string;
    company: string;
    title: string;
    location: string | null;
    remoteType: RemotePreference;
    applicationUrl: string;
    atsPlatform: AtsPlatform;
  };
}): PipelineApplication {
  let meta: Record<string, any> = {};
  if (app.interviewNotes) {
    try {
      meta = JSON.parse(app.interviewNotes);
    } catch {
      meta = { notes: [app.interviewNotes] };
    }
  }

  let stage: PipelineStage = meta.stage || "saved";
  if (!meta.stage) {
    if (app.status === ApplicationStatus.APPLIED) stage = "applied";
    else if (app.status === ApplicationStatus.INTERVIEWING) stage = "interviewing";
    else if (app.status === ApplicationStatus.OFFER) stage = "offer";
    else if (app.tailoredResumeUrl || app.coverLetterText) stage = "tailored";
    else stage = "saved";
  }

  const atsSourceMap: Record<AtsPlatform, "greenhouse" | "lever" | "ashby" | "direct"> = {
    [AtsPlatform.GREENHOUSE]: "greenhouse",
    [AtsPlatform.LEVER]: "lever",
    [AtsPlatform.ASHBY]: "ashby",
    [AtsPlatform.WORKDAY]: "direct",
    [AtsPlatform.OTHER]: "direct",
  };

  return {
    id: app.id,
    company: app.job?.company || "Target Company",
    role: app.job?.title || "Role",
    location: app.job?.location || "Remote",
    workArrangement:
      meta.workArrangement ||
      (app.job?.remoteType === RemotePreference.REMOTE_ONLY
        ? "remote"
        : app.job?.remoteType === RemotePreference.HYBRID
        ? "hybrid"
        : "onsite"),
    salary: meta.salary || "$180,000 - $220,000",
    fitScore: typeof meta.fitScore === "number" ? meta.fitScore : 88,
    stage,
    appliedDate: app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : undefined,
    followUpDueDate: meta.followUpDueDate,
    interviewDate: meta.interviewDate,
    contact: meta.contact,
    notes: Array.isArray(meta.notes) ? meta.notes : [],
    tags: Array.isArray(meta.tags) ? meta.tags : ["Target Role"],
    portalUrl: meta.portalUrl || app.job?.applicationUrl,
    source: meta.source || atsSourceMap[app.job?.atsPlatform] || "direct",
  };
}

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

export async function getUserPipelineApplications(userId: string): Promise<PipelineApplication[]> {
  const apps = await db.application.findMany({
    where: { userId },
    include: {
      job: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return apps.map((app) => toPipelineApplication(app as any));
}

export interface PipelineOpportunityInput {
  company: string;
  role: string;
  location?: string;
  workArrangement?: "remote" | "hybrid" | "onsite";
  salary?: string;
  fitScore?: number;
  stage?: PipelineStage;
  notes?: string[];
  tags?: string[];
  contact?: {
    name: string;
    role: string;
    email?: string;
    linkedInUrl?: string;
  };
  portalUrl?: string;
  source?: "greenhouse" | "lever" | "ashby" | "social" | "direct";
}

export async function createOrUpsertPipelineOpportunity(
  userId: string,
  input: PipelineOpportunityInput
): Promise<PipelineApplication> {
  const stage = input.stage || "saved";
  const status = mapStageToStatus(stage);

  // 1. Get or create primary resume for user
  let resume = await db.resume.findFirst({
    where: { userId, isPrimary: true },
  });

  if (!resume) {
    resume = await db.resume.findFirst({
      where: { userId },
    });
  }

  if (!resume) {
    resume = await db.resume.create({
      data: {
        userId,
        title: "Master Profile Resume",
        originalFileUrl: `local-profile://${userId}/master-resume.pdf`,
        extractedText: `${input.role} Candidate Profile`,
        parsedData: {
          fullName: "Candidate",
          skills: input.tags || ["TypeScript", "React"],
          experience: [],
        },
        atsScore: 85,
        isPrimary: true,
      },
    });
  }

  // 2. Find or create JobPosting
  let job = await db.jobPosting.findFirst({
    where: {
      company: input.company,
      title: input.role,
    },
  });

  if (!job) {
    const cleanUrl =
      input.portalUrl ||
      `https://${input.company.toLowerCase().replace(/[^a-z0-9]/g, "") || "company"}.com/careers/${encodeURIComponent(
        input.role.toLowerCase().replace(/\s+/g, "-")
      )}`;

    const remoteType =
      input.workArrangement === "remote"
        ? RemotePreference.REMOTE_ONLY
        : input.workArrangement === "hybrid"
        ? RemotePreference.HYBRID
        : RemotePreference.ONSITE;

    job = await db.jobPosting.create({
      data: {
        company: input.company,
        title: input.role,
        location: input.location || "Remote",
        description: `${input.role} at ${input.company}. High-impact opportunity tracked in Hunt Deck.`,
        applicationUrl: cleanUrl,
        remoteType,
        atsPlatform:
          input.source === "greenhouse"
            ? AtsPlatform.GREENHOUSE
            : input.source === "lever"
            ? AtsPlatform.LEVER
            : input.source === "ashby"
            ? AtsPlatform.ASHBY
            : AtsPlatform.OTHER,
      },
    });
  }

  // 3. Upsert Application record
  const meta = {
    stage,
    workArrangement: input.workArrangement || "remote",
    salary: input.salary || "$180,000 - $220,000",
    fitScore: input.fitScore ?? 90,
    notes: input.notes || ["Added to pipeline."],
    tags: input.tags || ["Target Opportunity"],
    contact: input.contact,
    portalUrl: input.portalUrl,
    source: input.source || "direct",
  };

  const app = await db.application.upsert({
    where: {
      userId_jobId: {
        userId,
        jobId: job.id,
      },
    },
    update: {
      status,
      appliedAt: stage === "applied" ? new Date() : undefined,
      interviewNotes: JSON.stringify(meta),
    },
    create: {
      userId,
      jobId: job.id,
      resumeId: resume.id,
      status,
      appliedAt: stage === "applied" ? new Date() : undefined,
      interviewNotes: JSON.stringify(meta),
    },
    include: {
      job: true,
    },
  });

  return toPipelineApplication(app as any);
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

export async function updatePipelineStage(
  userId: string,
  applicationId: string,
  newStage: PipelineStage,
  additionalNotes?: string
): Promise<PipelineApplication> {
  const existing = await db.application.findFirst({
    where: { id: applicationId, userId },
    include: { job: true },
  });

  if (!existing) {
    throw new Error("Application not found or unauthorized.");
  }

  let meta: Record<string, any> = {};
  if (existing.interviewNotes) {
    try {
      meta = JSON.parse(existing.interviewNotes);
    } catch {
      meta = { notes: [existing.interviewNotes] };
    }
  }

  meta.stage = newStage;
  if (additionalNotes) {
    meta.notes = [additionalNotes, ...(meta.notes || [])];
  }

  const status = mapStageToStatus(newStage);

  const updated = await db.application.update({
    where: { id: applicationId, userId },
    data: {
      status,
      appliedAt: newStage === "applied" && !existing.appliedAt ? new Date() : existing.appliedAt,
      interviewNotes: JSON.stringify(meta),
    },
    include: {
      job: true,
    },
  });

  return toPipelineApplication(updated as any);
}

export async function addApplicationNote(
  userId: string,
  applicationId: string,
  noteText: string
): Promise<PipelineApplication> {
  const existing = await db.application.findFirst({
    where: { id: applicationId, userId },
    include: { job: true },
  });

  if (!existing) {
    throw new Error("Application not found or unauthorized.");
  }

  let meta: Record<string, any> = {};
  if (existing.interviewNotes) {
    try {
      meta = JSON.parse(existing.interviewNotes);
    } catch {
      meta = { notes: [existing.interviewNotes] };
    }
  }

  meta.notes = [noteText, ...(meta.notes || [])];

  const updated = await db.application.update({
    where: { id: applicationId, userId },
    data: {
      interviewNotes: JSON.stringify(meta),
    },
    include: {
      job: true,
    },
  });

  return toPipelineApplication(updated as any);
}

export async function deleteApplication(
  userId: string,
  applicationId: string
): Promise<{ success: boolean }> {
  await db.application.delete({
    where: {
      id: applicationId,
      userId,
    },
  });

  return { success: true };
}
