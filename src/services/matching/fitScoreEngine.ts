import type { ResumeParsedData } from "@/lib/validations/resume";

export interface JobMatchingInput {
  title: string;
  description: string;
  location?: string;
  remoteType?: string;
  requiredSkills?: string[];
}

export interface DetailedFitScore {
  overallScore: number;     // 0 - 100
  skillsScore: number;      // 0 - 100 (40% weight)
  experienceScore: number;  // 0 - 100 (30% weight)
  titleScore: number;       // 0 - 100 (20% weight)
  locationScore: number;    // 0 - 100 (10% weight)
  matchingKeywords: string[];
  missingKeywords: string[];
  recommendation: "STRONG_MATCH" | "MODERATE_MATCH" | "LOW_MATCH";
}

/**
 * Extracts technical and domain keywords from job description text.
 */
export function extractKeywordsFromText(text: string): string[] {
  const commonTech = [
    "TypeScript", "JavaScript", "Python", "Go", "Golang", "Java", "C++", "Rust",
    "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "FastAPI", "Django",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka", "RabbitMQ", "Elasticsearch",
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD", "GraphQL",
    "REST", "Microservices", "Tailwind", "System Design", "Agile", "Scrum"
  ];

  return commonTech.filter((tech) => {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-zA-Z0-9_+])${escaped}([^a-zA-Z0-9_+]|$)`, "i");
    return regex.test(text);
  });
}

/**
 * Computes multi-dimensional candidate fit score based on the PRD specification:
 * Overall = (Skills × 0.40) + (Experience × 0.30) + (Title × 0.20) + (Location × 0.10)
 */
export function calculateCandidateFit(
  resume: ResumeParsedData,
  job: JobMatchingInput
): DetailedFitScore {
  // 1. Skills Matching (40% weight)
  const jobKeywords = job.requiredSkills && job.requiredSkills.length > 0
    ? job.requiredSkills
    : extractKeywordsFromText(job.description);

  const candidateSkillsSet = new Set(
    (resume.skills || []).map((s) => s.trim().toLowerCase())
  );

  const matchingKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const kw of jobKeywords) {
    if (candidateSkillsSet.has(kw.toLowerCase())) {
      matchingKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  }

  const skillsScore = jobKeywords.length > 0
    ? Math.round((matchingKeywords.length / jobKeywords.length) * 100)
    : 75; // Default neutral if job has no explicit tech keywords

  // 2. Experience Matching (30% weight)
  const candidateYears = (resume.experience || []).length * 1.8; // Approximate ~1.8 yrs per role
  const isSeniorJob = /senior|lead|staff|principal|director/i.test(job.title);
  let experienceScore = 70;

  if (isSeniorJob) {
    experienceScore = candidateYears >= 5 ? 95 : candidateYears >= 3 ? 75 : 50;
  } else {
    experienceScore = candidateYears >= 2 ? 90 : 70;
  }

  // 3. Title Matching (20% weight)
  const candidateTitles = (resume.experience || []).map((e) => e.title.toLowerCase());
  const jobTitleLower = job.title.toLowerCase();
  let titleScore = 40;

  for (const t of candidateTitles) {
    if (t.includes(jobTitleLower) || jobTitleLower.includes(t)) {
      titleScore = 100;
      break;
    }
    // Partial word overlap
    const words = jobTitleLower.split(/\s+/).filter((w) => w.length > 3);
    const overlap = words.filter((w) => t.includes(w));
    if (overlap.length >= 2) {
      titleScore = Math.max(titleScore, 85);
    } else if (overlap.length === 1) {
      titleScore = Math.max(titleScore, 65);
    }
  }

  // 4. Location Matching (10% weight)
  let locationScore = 60;
  const isRemoteJob =
    job.remoteType === "REMOTE_ONLY" ||
    /remote/i.test(job.location || "") ||
    /remote/i.test(job.title);

  if (isRemoteJob) {
    locationScore = 100;
  } else if (job.location && resume.location) {
    if (resume.location.toLowerCase().includes(job.location.toLowerCase())) {
      locationScore = 100;
    } else {
      locationScore = 50;
    }
  }

  // Multi-factor weighted aggregate
  const overallScore = Math.round(
    skillsScore * 0.4 +
    experienceScore * 0.3 +
    titleScore * 0.2 +
    locationScore * 0.1
  );

  let recommendation: DetailedFitScore["recommendation"] = "LOW_MATCH";
  if (overallScore >= 80) recommendation = "STRONG_MATCH";
  else if (overallScore >= 60) recommendation = "MODERATE_MATCH";

  return {
    overallScore,
    skillsScore,
    experienceScore,
    titleScore,
    locationScore,
    matchingKeywords,
    missingKeywords,
    recommendation,
  };
}
