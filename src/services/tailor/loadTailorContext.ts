import { db } from "@/lib/db";
import { getPrimaryResume, getUserResumes } from "@/services/db/resumeService";
import { decomposeJobDescription } from "@/services/ai/bulletRewriter";
import { resumeParsedDataSchema, type ResumeParsedData } from "@/lib/validations/resume";
import type { TailorTargetJob } from "@/features/tailor/types";
import { TARGET_JOBS_CATALOG } from "@/features/tailor/mockData";
import type { JobPosting } from "@prisma/client";

function formatSalaryRange(min?: number | null, max?: number | null): string | undefined {
  if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  if (max) return `Up to $${max.toLocaleString()}`;
  return undefined;
}

function mapRemoteLabel(remoteType: JobPosting["remoteType"], location?: string | null): TailorTargetJob["remoteType"] {
  if (remoteType === "REMOTE_ONLY") return "Remote";
  if (remoteType === "HYBRID") return "Hybrid";
  if (remoteType === "ONSITE") return "On-site";
  if (location && /\bhybrid\b/i.test(location)) return "Hybrid";
  if (location && /\bonsite|on-site\b/i.test(location)) return "On-site";
  return "Remote";
}

function mapAtsLabel(platform: JobPosting["atsPlatform"]): TailorTargetJob["atsPlatform"] {
  switch (platform) {
    case "GREENHOUSE":
      return "Greenhouse";
    case "LEVER":
      return "Lever";
    case "ASHBY":
      return "Ashby";
    case "WORKDAY":
      return "Workday";
    default:
      return "Other";
  }
}

export function mapDbJobToTailorTarget(
  job: JobPosting,
  candidateSkills: string[] = [],
  storedFitScore?: number | null
): TailorTargetJob {
  const decomposed = decomposeJobDescription(job.description);
  const candidateLower = new Set(candidateSkills.map((s) => s.toLowerCase()));
  let fitScore = typeof storedFitScore === "number" ? Math.round(storedFitScore) : undefined;

  if (fitScore === undefined) {
    const reqs = decomposed.mustHaveSkills;
    if (reqs.length > 0 && candidateLower.size > 0) {
      const matched = reqs.filter((skill) => candidateLower.has(skill.toLowerCase())).length;
      fitScore = Math.min(98, Math.max(48, Math.round(45 + (matched / reqs.length) * 50)));
    } else {
      fitScore = 76;
    }
  }

  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location || "Remote / Flexible",
    salaryRange: formatSalaryRange(job.salaryMin, job.salaryMax),
    remoteType: mapRemoteLabel(job.remoteType, job.location),
    atsPlatform: mapAtsLabel(job.atsPlatform),
    applicationUrl: job.applicationUrl,
    fitScore,
    description: job.description,
    mustHaveSkills: decomposed.mustHaveSkills,
    niceToHaveSkills: decomposed.niceToHaveSkills,
    implicitSkills: decomposed.implicitSkills,
    senioritySignals: decomposed.senioritySignals,
  };
}

export interface LoadedTailorContext {
  targetJob: TailorTargetJob | null;
  notFoundRequested: boolean;
  availableJobs: TailorTargetJob[];
  candidateProfile: ResumeParsedData | null;
  existingPipelineApp: { id: string; stage: string } | null;
}

export async function loadTailorWorkspaceData(
  userId: string,
  requestedJobId?: string
): Promise<LoadedTailorContext> {
  const decodedJobId = requestedJobId ? decodeURIComponent(requestedJobId) : undefined;

  const [primaryResume, userResumes, dbTargetJob, recentDbJobs] = await Promise.all([
    getPrimaryResume(userId),
    getUserResumes(userId),
    decodedJobId ? db.jobPosting.findUnique({ where: { id: decodedJobId } }) : Promise.resolve(null),
    db.jobPosting.findMany({ orderBy: { postedAt: "desc" }, take: 10 }),
  ]);

  const activeResume = primaryResume ?? userResumes[0] ?? null;
  let candidateProfile: ResumeParsedData | null = null;
  if (activeResume?.parsedData) {
    const parsed = resumeParsedDataSchema.safeParse(activeResume.parsedData);
    if (parsed.success) {
      candidateProfile = parsed.data;
    }
  }

  const candidateSkills = candidateProfile?.skills ?? [];

  let targetJob: TailorTargetJob | null = null;
  let notFoundRequested = false;

  if (decodedJobId) {
    if (dbTargetJob) {
      const fit = activeResume
        ? await db.jobFitScore.findFirst({
            where: { jobId: dbTargetJob.id, resumeId: activeResume.id },
            select: { overallScore: true },
          })
        : null;
      targetJob = mapDbJobToTailorTarget(dbTargetJob, candidateSkills, fit?.overallScore);
    } else if (TARGET_JOBS_CATALOG[decodedJobId]) {
      targetJob = TARGET_JOBS_CATALOG[decodedJobId];
    } else {
      notFoundRequested = true;
    }
  } else if (recentDbJobs.length > 0) {
    targetJob = mapDbJobToTailorTarget(recentDbJobs[0], candidateSkills);
  } else {
    targetJob = TARGET_JOBS_CATALOG["stripe-staff-systems"];
  }

  const mappedRecent = recentDbJobs.map((j) => mapDbJobToTailorTarget(j, candidateSkills));
  const availableJobs =
    targetJob && !mappedRecent.some((j) => j.id === targetJob!.id)
      ? [targetJob, ...mappedRecent]
      : mappedRecent.length > 0
        ? mappedRecent
        : Object.values(TARGET_JOBS_CATALOG);

  let existingPipelineApp: { id: string; stage: string } | null = null;
  if (dbTargetJob) {
    const app = await db.application.findUnique({
      where: { userId_jobId: { userId, jobId: dbTargetJob.id } },
      select: { id: true, status: true, interviewNotes: true },
    });
    if (app) {
      let stage = app.status.toLowerCase();
      if (app.interviewNotes) {
        try {
          const parsedNotes = JSON.parse(app.interviewNotes) as { stage?: string };
          if (parsedNotes.stage) stage = parsedNotes.stage;
        } catch {
          // ignore
        }
      }
      existingPipelineApp = { id: app.id, stage };
    }
  }

  return {
    targetJob,
    notFoundRequested,
    availableJobs,
    candidateProfile,
    existingPipelineApp,
  };
}
