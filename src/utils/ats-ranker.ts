/**
 * ATS Ranker — Post-Parse Scoring Optimization Engine
 *
 * Solves the Phase 2 ATS problem: passing the parser is not enough.
 * Recruiters see a ranked list. This engine maximizes the candidate's
 * position in that ranked list by optimizing keyword placement, density,
 * and structural section weighting.
 *
 * Architecture: § 15 — ATS Rank Supremacy Engine (ARCHITECTURE.md)
 * Reference:    references/engineering/ai-humanization-and-ats-rank.md
 *
 * ATS Scoring Weights (reverse-engineered):
 *   - Keyword Match: 50%  (exact + semantic synonyms)
 *   - Section Placement: 25% (Skills > Recent Bullets > Summary > Other)
 *   - Seniority Alignment: 15% (title proximity match)
 *   - Format Compliance: 10% (machine-readable structure)
 *
 * 3-Location Keyword Multiplier:
 *   Keyword in Skills Block:   ×2.5
 *   Keyword in Recent Bullet:  ×2.0
 *   Keyword in Summary:        ×1.5
 *   = 6× cumulative score vs single placement
 */

import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobDescriptionEntity {
  /** Exact-match required skills (highest ATS weight) */
  exactKeywords: string[];
  /** Nice-to-have skills */
  preferredKeywords: string[];
  /** Seniority level from JD */
  seniority: "entry" | "mid" | "senior" | "lead" | "executive";
  /** Job title from JD */
  title: string;
  /** Company name */
  company: string;
  /** Required years of experience */
  minYearsExp: number | null;
  /** Employment type */
  employmentType: "full-time" | "part-time" | "contract" | "internship";
  /** Remote policy */
  remote: "remote" | "hybrid" | "onsite" | "unspecified";
}

export interface ResumeSection {
  summary: string;
  skills: string[];
  recentBullets: string[]; // experience[0].bullets
  allBullets: string[];
  titles: string[];
  yearsExp: number;
}

export interface FitScoreResult {
  /** 0–100 composite fit score */
  fitScore: number;
  /** Keyword coverage breakdown */
  keywordCoverage: {
    exact: { matched: string[]; missing: string[] };
    preferred: { matched: string[]; missing: string[] };
  };
  /** Per-section keyword placement analysis */
  placementAnalysis: {
    inSkills: string[];
    inRecentBullets: string[];
    inSummary: string[];
    missing: string[];
  };
  /** Ranked list of keywords to add for maximum score uplift */
  priorityInsertions: Array<{
    keyword: string;
    targetSection: "skills" | "recent_bullet" | "summary";
    scoreUplift: number;
  }>;
  senioritymatch: boolean;
  rawScores: {
    keywordScore: number;
    placementScore: number;
    seniorityScore: number;
    formatScore: number;
  };
}

// ─── Zod Schema for JD Extraction ────────────────────────────────────────────

const JobDescriptionEntitySchema = z.object({
  exactKeywords: z.array(z.string()),
  preferredKeywords: z.array(z.string()),
  seniority: z.enum(["entry", "mid", "senior", "lead", "executive"]),
  title: z.string(),
  company: z.string(),
  minYearsExp: z.number().nullable(),
  employmentType: z.enum(["full-time", "part-time", "contract", "internship"]),
  remote: z.enum(["remote", "hybrid", "onsite", "unspecified"]),
});

// ─── JD Decomposition ────────────────────────────────────────────────────────

/**
 * Decomposes a raw job description into structured entities.
 * Uses GPT-4o-mini for speed and cost efficiency.
 */
export async function decomposeJobDescription(
  rawJD: string
): Promise<JobDescriptionEntity> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert ATS analyst. Extract structured data from the job description.
        
Return a JSON object with:
- exactKeywords: array of explicitly required technical skills, tools, languages (must-have)
- preferredKeywords: array of nice-to-have skills mentioned
- seniority: one of [entry, mid, senior, lead, executive] based on title and requirements  
- title: exact job title from the posting
- company: company name
- minYearsExp: minimum years of experience required (number or null if not specified)
- employmentType: one of [full-time, part-time, contract, internship]
- remote: one of [remote, hybrid, onsite, unspecified]`,
      },
      {
        role: "user",
        content: rawJD,
      },
    ],
  });

  const raw = JSON.parse(response.choices[0].message.content ?? "{}");
  return JobDescriptionEntitySchema.parse(raw);
}

// ─── Keyword Placement Analyzer ───────────────────────────────────────────────

/**
 * Checks where each required keyword appears in the resume.
 * Section placement determines the ATS score multiplier.
 */
function analyzePlacement(
  keywords: string[],
  resume: ResumeSection
): FitScoreResult["placementAnalysis"] {
  const inSkills: string[] = [];
  const inRecentBullets: string[] = [];
  const inSummary: string[] = [];
  const missing: string[] = [];

  const normalize = (s: string) => s.toLowerCase().trim();
  const skillsText = resume.skills.map(normalize).join(" ");
  const recentText = resume.recentBullets.map(normalize).join(" ");
  const summaryText = normalize(resume.summary);

  for (const kw of keywords) {
    const kwLow = normalize(kw);
    const inSkillsBlock = skillsText.includes(kwLow);
    const inRecent = recentText.includes(kwLow);
    const inSum = summaryText.includes(kwLow);

    if (inSkillsBlock) inSkills.push(kw);
    if (inRecent) inRecentBullets.push(kw);
    if (inSum) inSummary.push(kw);
    if (!inSkillsBlock && !inRecent && !inSum) missing.push(kw);
  }

  return { inSkills, inRecentBullets, inSummary, missing };
}

// ─── Score Calculator ─────────────────────────────────────────────────────────

/**
 * Calculates the weighted ATS fit score using reverse-engineered ATS weights.
 */
function calculateFitScore(
  jd: JobDescriptionEntity,
  resume: ResumeSection,
  placement: FitScoreResult["placementAnalysis"]
): FitScoreResult["rawScores"] {
  const totalKeywords = jd.exactKeywords.length || 1;

  // Keyword Score (50% weight)
  // 3-location multiplier: Skills=2.5, RecentBullet=2.0, Summary=1.5
  const keywordPoints = jd.exactKeywords.reduce((acc, kw) => {
    const kwLow = kw.toLowerCase();
    let pts = 0;
    if (placement.inSkills.map((k) => k.toLowerCase()).includes(kwLow)) pts += 2.5;
    if (placement.inRecentBullets.map((k) => k.toLowerCase()).includes(kwLow)) pts += 2.0;
    if (placement.inSummary.map((k) => k.toLowerCase()).includes(kwLow)) pts += 1.5;
    return acc + pts;
  }, 0);
  const maxKeywordPoints = totalKeywords * 6.0; // max if keyword in all 3 locations
  const keywordScore = Math.min(50, (keywordPoints / maxKeywordPoints) * 50);

  // Placement Score (25% weight)
  const coverageRatio =
    (totalKeywords - placement.missing.length) / totalKeywords;
  const placementScore = coverageRatio * 25;

  // Seniority Score (15% weight)
  const resumeSeniority = inferSeniority(resume.yearsExp, resume.titles);
  const seniorityScore = resumeSeniority === jd.seniority ? 15 : 7;

  // Format Score (10% weight) — assume clean format by default
  const formatScore = 10;

  return { keywordScore, placementScore, seniorityScore, formatScore };
}

// ─── Seniority Inference ──────────────────────────────────────────────────────

function inferSeniority(
  years: number,
  titles: string[]
): JobDescriptionEntity["seniority"] {
  const titleText = titles.join(" ").toLowerCase();
  if (titleText.includes("vp") || titleText.includes("director") || titleText.includes("cto"))
    return "executive";
  if (titleText.includes("lead") || titleText.includes("staff") || titleText.includes("principal"))
    return "lead";
  if (years >= 5) return "senior";
  if (years >= 2) return "mid";
  return "entry";
}

// ─── Priority Insertions Generator ───────────────────────────────────────────

/**
 * Generates a ranked list of keyword→section insertions for maximum score uplift.
 * Used by the UI to show candidates exactly what to add where.
 */
function generatePriorityInsertions(
  missingKeywords: string[]
): FitScoreResult["priorityInsertions"] {
  const insertions: FitScoreResult["priorityInsertions"] = [];

  for (const kw of missingKeywords) {
    // Skills block = highest uplift (×2.5)
    insertions.push({ keyword: kw, targetSection: "skills", scoreUplift: 2.5 });
    // Recent bullet = second highest (×2.0)
    insertions.push({ keyword: kw, targetSection: "recent_bullet", scoreUplift: 2.0 });
    // Summary = third (×1.5)
    insertions.push({ keyword: kw, targetSection: "summary", scoreUplift: 1.5 });
  }

  // Rank by uplift descending
  return insertions
    .sort((a, b) => b.scoreUplift - a.scoreUplift)
    .slice(0, 15); // Top 15 recommendations
}

// ─── Main Fit Scorer ──────────────────────────────────────────────────────────

/**
 * Computes the full ATS fit score for a resume against a job description.
 */
export async function computeFitScore(
  jd: JobDescriptionEntity,
  resume: ResumeSection
): Promise<FitScoreResult> {
  const exactPlacement = analyzePlacement(jd.exactKeywords, resume);
  const preferredPlacement = analyzePlacement(jd.preferredKeywords, resume);
  const rawScores = calculateFitScore(jd, resume, exactPlacement);

  const fitScore = Math.round(
    rawScores.keywordScore +
      rawScores.placementScore +
      rawScores.seniorityScore +
      rawScores.formatScore
  );

  const priorityInsertions = generatePriorityInsertions(
    exactPlacement.missing
  );

  return {
    fitScore: Math.min(100, fitScore),
    keywordCoverage: {
      exact: {
        matched: jd.exactKeywords.filter(
          (k) => !exactPlacement.missing.includes(k)
        ),
        missing: exactPlacement.missing,
      },
      preferred: {
        matched: jd.preferredKeywords.filter(
          (k) => !preferredPlacement.missing.includes(k)
        ),
        missing: preferredPlacement.missing,
      },
    },
    placementAnalysis: exactPlacement,
    priorityInsertions,
    senioritymatch:
      inferSeniority(resume.yearsExp, resume.titles) === jd.seniority,
    rawScores,
  };
}

/**
 * Gate check: should we allow this application to proceed?
 * < 70%: Block. 70-84%: Amber (Smart Questions). >= 85%: Green.
 */
export function getFitScoreGateStatus(
  score: number
): "green" | "amber" | "blocked" {
  if (score >= 85) return "green";
  if (score >= 70) return "amber";
  return "blocked";
}
