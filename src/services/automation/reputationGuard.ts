/**
 * Hunt Deck — Reputation Protection & Rate-Limiting Guard
 * 
 * Enforces PRD Module 10 & 11 safety rules:
 *  - 15 applications max per rolling 24-hour period per candidate
 *  - 3-minute minimum cooldown between consecutive submissions
 *  - 30-day cooldown per employer / company to avoid recruiter fatigue or blacklisting
 *  - Full submission audit telemetry & event recording
 */

export interface ApplicationSubmissionRecord {
  jobId: string;
  companyName: string;
  timestamp: number; // Unix timestamp ms
  status: "submitted" | "halted_captcha" | "halted_review" | "failed";
}

export interface UserReputationState {
  userId: string;
  submissions: ApplicationSubmissionRecord[];
  dailyQuota: number; // Default: 15
  minCooldownSeconds: number; // Default: 180 (3 mins)
  companyCooldownDays: number; // Default: 30
}

export interface CanApplyCheckResult {
  allowed: boolean;
  reason?: string;
  remainingDailyQuota: number;
  cooldownRemainingSeconds?: number;
  companyLastAppliedDaysAgo?: number;
}

const DEFAULT_DAILY_QUOTA = 15;
const DEFAULT_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes
const DEFAULT_COMPANY_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// In-memory fallback registry for session/local execution
const localUserStates = new Map<string, UserReputationState>();

export function getOrCreateUserState(userId: string): UserReputationState {
  let state = localUserStates.get(userId);
  if (!state) {
    state = {
      userId,
      submissions: [],
      dailyQuota: DEFAULT_DAILY_QUOTA,
      minCooldownSeconds: DEFAULT_COOLDOWN_MS / 1000,
      companyCooldownDays: 30,
    };
    localUserStates.set(userId, state);
  }
  return state;
}

/**
 * Validates whether a candidate is allowed to apply to a specific company
 */
export function canApplyToJob(
  userId: string,
  companyName: string,
  now = Date.now()
): CanApplyCheckResult {
  const state = getOrCreateUserState(userId);
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // 1. Check daily submissions count
  const recentSubmissions = state.submissions.filter(
    (s) => s.status === "submitted" && s.timestamp >= oneDayAgo
  );
  const remainingQuota = Math.max(0, state.dailyQuota - recentSubmissions.length);

  if (recentSubmissions.length >= state.dailyQuota) {
    return {
      allowed: false,
      reason: `Daily application limit reached (${state.dailyQuota}/day). Cooldown resets in 24 hours to protect recruiter reputation.`,
      remainingDailyQuota: 0,
    };
  }

  // 2. Check 3-minute cooldown between any consecutive applications
  const lastSubmission = state.submissions
    .filter((s) => s.status === "submitted")
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (lastSubmission) {
    const elapsedMs = now - lastSubmission.timestamp;
    if (elapsedMs < DEFAULT_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((DEFAULT_COOLDOWN_MS - elapsedMs) / 1000);
      return {
        allowed: false,
        reason: `Pacing cooldown active. Please wait ${waitSeconds}s before submitting the next application.`,
        remainingDailyQuota: remainingQuota,
        cooldownRemainingSeconds: waitSeconds,
      };
    }
  }

  // 3. Check 30-day cooldown per company
  const companyNorm = companyName.trim().toLowerCase();
  const companySubmissions = state.submissions
    .filter(
      (s) =>
        s.status === "submitted" &&
        s.companyName.trim().toLowerCase() === companyNorm
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  if (companySubmissions.length > 0) {
    const lastCompanySub = companySubmissions[0];
    const elapsedCompanyMs = now - lastCompanySub.timestamp;
    if (elapsedCompanyMs < DEFAULT_COMPANY_COOLDOWN_MS) {
      const daysAgo = Math.floor(elapsedCompanyMs / (24 * 60 * 60 * 1000));
      return {
        allowed: false,
        reason: `Already applied to ${companyName} ${daysAgo} day(s) ago. 30-day cooldown active to protect candidate reputation.`,
        remainingDailyQuota: remainingQuota,
        companyLastAppliedDaysAgo: daysAgo,
      };
    }
  }

  return {
    allowed: true,
    remainingDailyQuota: remainingQuota,
  };
}

/**
 * Records an application attempt in the candidate's telemetry state
 */
export function recordApplicationAttempt(
  userId: string,
  record: Omit<ApplicationSubmissionRecord, "timestamp">,
  timestamp = Date.now()
): void {
  const state = getOrCreateUserState(userId);
  state.submissions.push({
    ...record,
    timestamp,
  });
}

/**
 * Clears candidate history (useful for test resets)
 */
export function resetCandidateReputation(userId: string): void {
  localUserStates.delete(userId);
}

