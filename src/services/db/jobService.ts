import { db } from "@/lib/db";
import type { JobQueryInput } from "@/lib/validations/job";

export async function getJobs(query: JobQueryInput, userId?: string) {
  const { search, remoteType, minSalary, platform, location, page, limit } =
    query;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (remoteType && remoteType !== "ANY") {
    where.remoteType = remoteType;
  }

  if (minSalary) {
    where.salaryMin = { gte: minSalary };
  }

  if (platform) {
    where.atsPlatform = platform;
  }

  if (location) {
    where.location = { contains: location, mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    db.jobPosting.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { postedAt: "desc" },
      include: userId
        ? {
            fitScores: {
              where: {
                resume: { userId, isPrimary: true },
              },
              take: 1,
            },
          }
        : undefined,
    }),
    db.jobPosting.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getJobById(jobId: string, userId?: string) {
  return db.jobPosting.findUnique({
    where: { id: jobId },
    include: {
      fitScores: userId
        ? {
            where: {
              resume: { userId, isPrimary: true },
            },
            take: 1,
          }
        : false,
    },
  });
}

export async function upsertJobPosting(data: {
  title: string;
  company: string;
  description: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  remoteType?: "REMOTE_ONLY" | "HYBRID" | "ONSITE" | "ANY";
  atsPlatform?: "GREENHOUSE" | "LEVER" | "ASHBY" | "WORKDAY" | "OTHER";
  applicationUrl: string;
  externalJobId?: string;
  postedAt?: Date;
}) {
  return db.jobPosting.upsert({
    where: {
      company_title_applicationUrl: {
        company: data.company,
        title: data.title,
        applicationUrl: data.applicationUrl,
      },
    },
    update: {
      description: data.description,
      location: data.location,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      remoteType: data.remoteType || "ANY",
      updatedAt: new Date(),
    },
    create: {
      title: data.title,
      company: data.company,
      description: data.description,
      location: data.location,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      remoteType: data.remoteType || "ANY",
      atsPlatform: data.atsPlatform || "OTHER",
      applicationUrl: data.applicationUrl,
      externalJobId: data.externalJobId,
      postedAt: data.postedAt || new Date(),
    },
  });
}

export async function saveJobFitScore(data: {
  resumeId: string;
  jobId: string;
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  titleScore: number;
  locationScore: number;
  missingKeywords: string[];
  matchingKeywords: string[];
}) {
  return db.jobFitScore.upsert({
    where: {
      resumeId_jobId: {
        resumeId: data.resumeId,
        jobId: data.jobId,
      },
    },
    update: {
      overallScore: data.overallScore,
      skillsScore: data.skillsScore,
      experienceScore: data.experienceScore,
      titleScore: data.titleScore,
      locationScore: data.locationScore,
      missingKeywords: data.missingKeywords,
      matchingKeywords: data.matchingKeywords,
      calculatedAt: new Date(),
    },
    create: {
      resumeId: data.resumeId,
      jobId: data.jobId,
      overallScore: data.overallScore,
      skillsScore: data.skillsScore,
      experienceScore: data.experienceScore,
      titleScore: data.titleScore,
      locationScore: data.locationScore,
      missingKeywords: data.missingKeywords,
      matchingKeywords: data.matchingKeywords,
    },
  });
}

