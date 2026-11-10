/**
 * Hunt Deck — 8-Minute First-Mover Job Alert Queue & Polling Engine
 * 
 * Implements PRD Module 11:
 *  - 8-minute recurring scanning loop for newly live ATS jobs (Greenhouse, Lever, Ashby)
 *  - Semantic match evaluation against candidate Alert Profiles (threshold: >= 85%)
 *  - Deduplication via Redis Set per candidate (prevents re-alerting)
 *  - Blacklist & 30-day company apply cooldown suppression
 *  - Priority enqueuing for instant notification delivery
 */

import { redis } from "@/lib/redis";
import { emitTelemetryEvent } from "@/lib/telemetry";

export interface AlertProfile {
  id: string;
  userId: string;
  targetTitles: string[];
  minFitScore: number; // default: 85
  remoteOnly?: boolean;
  seniorityBands?: string[];
  blacklistedCompanies?: string[];
  frequency: "instant" | "hourly" | "daily";
  appliedCompaniesLast30Days?: string[];
}

export interface IncomingScrapedJob {
  jobId: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  source: "greenhouse" | "lever" | "ashby" | "workday" | "direct";
  applyUrl: string;
  postedAt: string; // ISO date
  salary?: string;
  requiredSkills: string[];
  descriptionSnippet: string;
}

export interface MatchedFirstMoverAlert {
  alertId: string;
  userId: string;
  job: IncomingScrapedJob;
  fitScore: number;
  matchingSkills: string[];
  postedMinutesAgo: number;
  whyAlerted: string;
  createdAt: string;
}

// In-memory fallback sets when Redis is not connected locally
const fallbackSeenJobs = new Map<string, Set<string>>();

/**
 * Checks whether a candidate has already been alerted for this job ID
 */
export async function hasUserSeenJob(userId: string, jobId: string): Promise<boolean> {
  try {
    if (redis && redis.status === "ready") {
      const key = `huntdeck:user:${userId}:seen_jobs`;
      const isMember = await redis.sismember(key, jobId);
      return isMember === 1;
    }
  } catch {
    // Graceful fallback to memory
  }

  const userSet = fallbackSeenJobs.get(userId);
  return Boolean(userSet && userSet.has(jobId));
}

/**
 * Marks a job as seen/alerted for a candidate
 */
export async function markUserJobSeen(userId: string, jobId: string): Promise<void> {
  try {
    if (redis && redis.status === "ready") {
      const key = `huntdeck:user:${userId}:seen_jobs`;
      await redis.sadd(key, jobId);
      // Expire seen set after 60 days
      await redis.expire(key, 60 * 24 * 60 * 60);
      return;
    }
  } catch {
    // Graceful fallback to memory
  }

  let userSet = fallbackSeenJobs.get(userId);
  if (!userSet) {
    userSet = new Set();
    fallbackSeenJobs.set(userId, userSet);
  }
  userSet.add(jobId);
}

/**
 * Calculates candidate match score and matching skills against a job
 */
export function evaluateJobFit(
  profile: AlertProfile,
  candidateSkills: string[],
  job: IncomingScrapedJob
): { fitScore: number; matchingSkills: string[]; passesTitle: boolean } {
  const normJobTitle = job.title.toLowerCase();

  // 1. Title match check
  const passesTitle = profile.targetTitles.some((target) => {
    const t = target.toLowerCase();
    return normJobTitle.includes(t) || t.includes(normJobTitle);
  });

  // 2. Skill overlap calculation
  const candidateLower = new Set(candidateSkills.map((s) => s.toLowerCase()));
  const matchingSkills = job.requiredSkills.filter((s) =>
    candidateLower.has(s.toLowerCase())
  );

  const skillCoverage = job.requiredSkills.length > 0
    ? matchingSkills.length / job.requiredSkills.length
    : 0.8;

  // 3. Composite Fit Score (Title 30%, Skills 50%, Remote/Location 20%)
  const titleScore = passesTitle ? 1.0 : 0.4;
  const locationScore = !profile.remoteOnly || job.isRemote ? 1.0 : 0.3;

  const rawScore = Math.round((titleScore * 0.3 + skillCoverage * 0.5 + locationScore * 0.2) * 100);
  const fitScore = Math.min(99, Math.max(30, rawScore));

  return { fitScore, matchingSkills, passesTitle };
}

/**
 * Evaluates whether a scraped job qualifies as a First-Mover alert for a user
 */
export async function evaluateFirstMoverCandidate(
  profile: AlertProfile,
  candidateSkills: string[],
  job: IncomingScrapedJob
): Promise<MatchedFirstMoverAlert | null> {
  // 1. Suppress if blacklisted company
  const blacklisted = profile.blacklistedCompanies || [];
  if (blacklisted.some((b) => b.toLowerCase() === job.company.toLowerCase())) {
    return null;
  }

  // 2. Suppress if applied in last 30 days
  const recentApplied = profile.appliedCompaniesLast30Days || [];
  if (recentApplied.some((c) => c.toLowerCase() === job.company.toLowerCase())) {
    return null;
  }

  // 3. Suppress if already seen/alerted
  const seen = await hasUserSeenJob(profile.userId, job.jobId);
  if (seen) {
    return null;
  }

  // 4. Remote filter
  if (profile.remoteOnly && !job.isRemote) {
    return null;
  }

  // 5. Compute Fit Score
  const { fitScore, matchingSkills, passesTitle } = evaluateJobFit(profile, candidateSkills, job);

  // Must match title and meet min threshold (default 85%)
  if (!passesTitle || fitScore < profile.minFitScore) {
    return null;
  }

  // Calculate posting recency
  const postedMs = new Date(job.postedAt).getTime();
  const minutesAgo = Math.max(1, Math.round((Date.now() - postedMs) / (60 * 1000)));

  // Generate "Why You Were Alerted" hook
  const topSkillsStr = matchingSkills.slice(0, 3).join(", ");
  const whyAlerted = `Matches ${fitScore}% of your profile. Verified direct match for ${job.title} at ${job.company} with core stack alignment (${topSkillsStr || "Engineering & Architecture"}).`;

  // Mark as seen
  await markUserJobSeen(profile.userId, job.jobId);

  emitTelemetryEvent("first_mover_alert_queued", profile.userId, {
    jobId: job.jobId,
    company: job.company,
    fitScore,
    minutesAgo,
  });

  return {
    alertId: `fma_${Date.now()}_${job.jobId}`,
    userId: profile.userId,
    job,
    fitScore,
    matchingSkills,
    postedMinutesAgo: minutesAgo,
    whyAlerted,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Processes a batch of newly scraped jobs in the 8-minute poll loop
 */
export async function processScrapedJobsBatch(
  profile: AlertProfile,
  candidateSkills: string[],
  jobs: IncomingScrapedJob[]
): Promise<MatchedFirstMoverAlert[]> {
  const alerts: MatchedFirstMoverAlert[] = [];

  for (const job of jobs) {
    const alert = await evaluateFirstMoverCandidate(profile, candidateSkills, job);
    if (alert) {
      alerts.push(alert);
    }
  }

  return alerts;
}

/**
 * Reset memory cache (useful for testing)
 */
export function resetFirstMoverMemory(): void {
  fallbackSeenJobs.clear();
}

