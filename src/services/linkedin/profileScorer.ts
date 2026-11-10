/**
 * Hunt Deck — LinkedIn Profile Readiness Scoring Engine
 * 
 * Implements PRD Module 12.4.1:
 * Computes LinkedIn Profile Readiness Score (0-100) across 6 weighted dimensions:
 *  1. Headline Optimization (25% weight)
 *  2. About Section Depth (20% weight)
 *  3. Experience Bullet Quality (20% weight)
 *  4. Skills Coverage (15% weight)
 *  5. Profile Completeness (10% weight)
 *  6. Searchability & Open-to-Work Signals (10% weight)
 */

export interface RawLinkedInProfile {
  headline?: string;
  about?: string;
  location?: string;
  industry?: string;
  openToWork?: boolean;
  skills?: Array<{ name: string; endorsementsCount?: number }>;
  experience?: Array<{
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    bullets?: string[];
    description?: string;
  }>;
  education?: Array<{ school: string; degree?: string; fieldOfStudy?: string }>;
  certifications?: Array<{ name: string; authority?: string }>;
}

export interface DimensionScore {
  name: string;
  score: number; // 0 - 100
  weight: number; // 0.0 - 1.0
  weightedScore: number;
  grade: "STRONG" | "FAIR" | "NEEDS_IMPROVEMENT";
  findings: string[];
  recommendations: string[];
}

export interface LinkedInReadinessAudit {
  overallScore: number; // 0 - 100
  dimensions: {
    headline: DimensionScore;
    about: DimensionScore;
    experience: DimensionScore;
    skills: DimensionScore;
    completeness: DimensionScore;
    searchability: DimensionScore;
  };
  criticalGaps: string[];
  quickWins: string[];
  summary: string;
}

const COMMON_METRIC_PATTERNS = [
  /\b\d+%/i,
  /\$\d+/i,
  /\b\d+[kKmMbB]\b/,
  /\b\d+\s*(users|clients|customers|engineers|teams|requests|ms|latency|reduction|increase|revenue|arr)\b/i,
];

/**
 * Evaluates Headline Optimization (25% weight)
 */
export function scoreHeadline(
  headline: string | undefined,
  targetKeywords: string[]
): DimensionScore {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let score = 30;

  if (!headline || headline.trim() === "") {
    return {
      name: "Headline Optimization",
      score: 0,
      weight: 0.25,
      weightedScore: 0,
      grade: "NEEDS_IMPROVEMENT",
      findings: ["Headline is missing."],
      recommendations: ["Add a keyword-dense headline (80–180 characters) incorporating your target role and core stack."],
    };
  }

  const clean = headline.trim();
  const len = clean.length;

  if (len >= 60 && len <= 220) {
    score += 30;
    findings.push(`Headline length is optimal (${len} characters).`);
  } else if (len < 60) {
    score += 15;
    recommendations.push("Expand headline beyond just a job title to include core technologies and value proposition.");
  } else {
    score += 20;
    recommendations.push("Headline exceeds 220 characters; trim excess filler words.");
  }

  // Check target keyword coverage
  const lower = clean.toLowerCase();
  const matchedKeywords = targetKeywords.filter((kw) => lower.includes(kw.toLowerCase()));

  if (matchedKeywords.length >= 3) {
    score += 40;
    findings.push(`Contains ${matchedKeywords.length} key search keywords (${matchedKeywords.slice(0, 3).join(", ")}).`);
  } else if (matchedKeywords.length > 0) {
    score += matchedKeywords.length * 15;
    recommendations.push(`Add ${3 - matchedKeywords.length} more target keywords recruiters search for (e.g., ${targetKeywords.filter((k) => !matchedKeywords.includes(k)).slice(0, 2).join(", ")}).`);
  } else {
    recommendations.push(`Include high-frequency recruiter search terms: ${targetKeywords.slice(0, 3).join(", ")}.`);
  }

  // Check structure: contains separator like | or ·
  if (clean.includes("|") || clean.includes("·") || clean.includes("•")) {
    score = Math.min(100, score + 10);
  }

  const finalScore = Math.min(100, score);
  return {
    name: "Headline Optimization",
    score: finalScore,
    weight: 0.25,
    weightedScore: Math.round(finalScore * 0.25),
    grade: finalScore >= 80 ? "STRONG" : finalScore >= 60 ? "FAIR" : "NEEDS_IMPROVEMENT",
    findings,
    recommendations,
  };
}

/**
 * Evaluates About Section Depth (20% weight)
 */
export function scoreAboutSection(
  about: string | undefined,
  targetKeywords: string[]
): DimensionScore {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let score = 25;

  if (!about || about.trim() === "") {
    return {
      name: "About Section Depth",
      score: 0,
      weight: 0.20,
      weightedScore: 0,
      grade: "NEEDS_IMPROVEMENT",
      findings: ["About section is empty."],
      recommendations: ["Write a 200–300 word value-first narrative covering career achievements, technical superpowers, and target role focus."],
    };
  }

  const text = about.trim();
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length >= 120 && words.length <= 400) {
    score += 35;
    findings.push(`Word count is ideal (${words.length} words / ~${text.length} chars).`);
  } else if (words.length < 120) {
    score += 15;
    recommendations.push(`About section is brief (${words.length} words). Expand to at least 150 words to satisfy LinkedIn algorithm depth.`);
  } else {
    score += 25;
    recommendations.push("About section is dense. Break into concise paragraphs with clear bullet points.");
  }

  // Check for value-first opener vs bot cliché
  const lower = text.toLowerCase();
  if (lower.startsWith("i am a passionate") || lower.startsWith("i am an experienced") || lower.startsWith("results-driven")) {
    score -= 15;
    recommendations.push("Replace generic opening ('I am a passionate...') with an impact-driven executive summary of what you build.");
  } else {
    score += 15;
    findings.push("Strong narrative opening free of hollow cliché phrasing.");
  }

  // Check target keyword density
  const matched = targetKeywords.filter((kw) => lower.includes(kw.toLowerCase()));
  if (matched.length >= 4) {
    score += 25;
    findings.push(`Contains rich recruiter search keywords (${matched.slice(0, 4).join(", ")}).`);
  } else {
    recommendations.push(`Weave in essential competencies: ${targetKeywords.slice(0, 3).join(", ")}.`);
  }

  const finalScore = Math.min(100, Math.max(0, score));
  return {
    name: "About Section Depth",
    score: finalScore,
    weight: 0.20,
    weightedScore: Math.round(finalScore * 0.20),
    grade: finalScore >= 80 ? "STRONG" : finalScore >= 60 ? "FAIR" : "NEEDS_IMPROVEMENT",
    findings,
    recommendations,
  };
}

/**
 * Evaluates Experience Bullet Quality (20% weight)
 */
export function scoreExperienceQuality(
  experience: RawLinkedInProfile["experience"]
): DimensionScore {
  const findings: string[] = [];
  const recommendations: string[] = [];

  if (!experience || experience.length === 0) {
    return {
      name: "Experience Bullet Quality",
      score: 0,
      weight: 0.20,
      weightedScore: 0,
      grade: "NEEDS_IMPROVEMENT",
      findings: ["No experience history recorded."],
      recommendations: ["Add past roles with achievement-oriented bullet points."],
    };
  }

  const allBullets: string[] = [];
  for (const exp of experience) {
    if (exp.bullets && exp.bullets.length > 0) {
      allBullets.push(...exp.bullets);
    } else if (exp.description) {
      const split = exp.description.split("\n").filter((l) => l.trim().length > 10);
      allBullets.push(...split);
    }
  }

  if (allBullets.length === 0) {
    return {
      name: "Experience Bullet Quality",
      score: 25,
      weight: 0.20,
      weightedScore: 5,
      grade: "NEEDS_IMPROVEMENT",
      findings: ["Experience entries lack granular achievement bullets."],
      recommendations: ["Add 3–5 bullet points per position detailing specific accomplishments."],
    };
  }

  // Count quantified bullets
  let quantifiedCount = 0;
  for (const bullet of allBullets) {
    if (COMMON_METRIC_PATTERNS.some((pattern) => pattern.test(bullet))) {
      quantifiedCount++;
    }
  }

  const metricRatio = quantifiedCount / allBullets.length;
  const score = Math.round(metricRatio * 70) + 30;

  if (metricRatio >= 0.5) {
    findings.push(`${Math.round(metricRatio * 100)}% of bullets include measurable metrics (%, $, scale).`);
  } else {
    recommendations.push(`Only ${Math.round(metricRatio * 100)}% of bullets are quantified. Convert task descriptions into Google XYZ metrics.`);
  }

  const finalScore = Math.min(100, Math.max(30, score));
  return {
    name: "Experience Bullet Quality",
    score: finalScore,
    weight: 0.20,
    weightedScore: Math.round(finalScore * 0.20),
    grade: finalScore >= 80 ? "STRONG" : finalScore >= 60 ? "FAIR" : "NEEDS_IMPROVEMENT",
    findings,
    recommendations,
  };
}

/**
 * Evaluates Skills Coverage (15% weight)
 */
export function scoreSkillsCoverage(
  skills: RawLinkedInProfile["skills"],
  targetKeywords: string[]
): DimensionScore {
  const findings: string[] = [];
  const recommendations: string[] = [];

  const userSkillNames = (skills || []).map((s) => s.name.trim().toLowerCase());
  const skillCount = userSkillNames.length;

  if (skillCount === 0) {
    return {
      name: "Skills Coverage",
      score: 0,
      weight: 0.15,
      weightedScore: 0,
      grade: "NEEDS_IMPROVEMENT",
      findings: ["No skills added to profile."],
      recommendations: ["Add at least 15 verified skills to maximize recruiter search matches."],
    };
  }

  let score = 0;

  // Quantity check
  if (skillCount >= 15) {
    score += 40;
    findings.push(`Profile has healthy skill volume (${skillCount} skills listed).`);
  } else {
    score += Math.round((skillCount / 15) * 35);
    recommendations.push(`You have ${skillCount} skills. Add up to 20 relevant technologies to increase discoverability.`);
  }

  // Keyword overlap check
  const matched = targetKeywords.filter((kw) => userSkillNames.includes(kw.toLowerCase()));
  const matchRatio = targetKeywords.length > 0 ? matched.length / targetKeywords.length : 0.8;

  score += Math.round(matchRatio * 60);

  if (matched.length >= 4) {
    findings.push(`Matches high-frequency target skills: ${matched.slice(0, 4).join(", ")}.`);
  } else {
    const missing = targetKeywords.filter((kw) => !userSkillNames.includes(kw.toLowerCase()));
    recommendations.push(`Add essential missing skills: ${missing.slice(0, 3).join(", ")}.`);
  }

  const finalScore = Math.min(100, Math.max(20, score));
  return {
    name: "Skills Coverage",
    score: finalScore,
    weight: 0.15,
    weightedScore: Math.round(finalScore * 0.15),
    grade: finalScore >= 80 ? "STRONG" : finalScore >= 60 ? "FAIR" : "NEEDS_IMPROVEMENT",
    findings,
    recommendations,
  };
}

/**
 * Evaluates Profile Completeness (10% weight)
 */
export function scoreProfileCompleteness(profile: RawLinkedInProfile): DimensionScore {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let score = 0;

  if (profile.headline && profile.headline.trim()) {
    score += 20;
  } else {
    recommendations.push("Missing professional headline.");
  }

  if (profile.about && profile.about.trim().length > 50) {
    score += 20;
  } else {
    recommendations.push("Missing About narrative.");
  }

  if (profile.experience && profile.experience.length >= 2) {
    score += 25;
    findings.push("Contains multi-role career history.");
  } else if (profile.experience && profile.experience.length > 0) {
    score += 15;
  } else {
    recommendations.push("Add current and prior experience.");
  }

  if (profile.education && profile.education.length > 0) {
    score += 15;
    findings.push("Education credentials listed.");
  } else {
    recommendations.push("Add education history or self-directed credentials.");
  }

  if (profile.skills && profile.skills.length >= 5) {
    score += 20;
  } else {
    recommendations.push("List at least 5 core skills.");
  }

  const finalScore = Math.min(100, score);
  return {
    name: "Profile Completeness",
    score: finalScore,
    weight: 0.10,
    weightedScore: Math.round(finalScore * 0.10),
    grade: finalScore >= 80 ? "STRONG" : finalScore >= 60 ? "FAIR" : "NEEDS_IMPROVEMENT",
    findings,
    recommendations,
  };
}

/**
 * Evaluates Searchability & Open-to-Work Signals (10% weight)
 */
export function scoreSearchability(profile: RawLinkedInProfile): DimensionScore {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let score = 40;

  if (profile.location && profile.location.trim()) {
    score += 30;
    findings.push(`Location specified (${profile.location}) for geo-targeted recruiter filtering.`);
  } else {
    recommendations.push("Specify your location/city to appear in regional candidate searches.");
  }

  if (profile.openToWork) {
    score += 30;
    findings.push("Open to Work signal enabled for recruiters.");
  } else {
    recommendations.push("Enable 'Open to Work' (Recruiters Only) in LinkedIn privacy settings.");
  }

  const finalScore = Math.min(100, score);
  return {
    name: "Searchability",
    score: finalScore,
    weight: 0.10,
    weightedScore: Math.round(finalScore * 0.10),
    grade: finalScore >= 80 ? "STRONG" : finalScore >= 60 ? "FAIR" : "NEEDS_IMPROVEMENT",
    findings,
    recommendations,
  };
}

/**
 * Orchestrates complete LinkedIn profile audit
 */
export function auditLinkedInProfile(
  profile: RawLinkedInProfile,
  targetKeywords = ["TypeScript", "React", "Node.js", "PostgreSQL", "Distributed Systems", "AWS"]
): LinkedInReadinessAudit {
  const headline = scoreHeadline(profile.headline, targetKeywords);
  const about = scoreAboutSection(profile.about, targetKeywords);
  const experience = scoreExperienceQuality(profile.experience);
  const skills = scoreSkillsCoverage(profile.skills, targetKeywords);
  const completeness = scoreProfileCompleteness(profile);
  const searchability = scoreSearchability(profile);

  const overallScore =
    headline.weightedScore +
    about.weightedScore +
    experience.weightedScore +
    skills.weightedScore +
    completeness.weightedScore +
    searchability.weightedScore;

  const criticalGaps: string[] = [];
  const quickWins: string[] = [];

  const allDims = [headline, about, experience, skills, completeness, searchability];
  for (const dim of allDims) {
    if (dim.grade === "NEEDS_IMPROVEMENT" && dim.recommendations.length > 0) {
      criticalGaps.push(`${dim.name}: ${dim.recommendations[0]}`);
    } else if (dim.recommendations.length > 0) {
      quickWins.push(`${dim.name}: ${dim.recommendations[0]}`);
    }
  }

  let summary = `Your LinkedIn Readiness Score is ${overallScore}/100. `;
  if (overallScore >= 85) {
    summary += "Your profile is primed for recruiter algorithmic search and high-intent inbound inquiries.";
  } else if (overallScore >= 70) {
    summary += "Good foundation. Optimizing your headline keywords and quantifying experience bullets will significantly boost inbound recruiter impressions.";
  } else {
    summary += "Recruiter search visibility is currently restricted. Implementing the recommended headline structure and About narrative will unlock 3–5x more search appearances.";
  }

  return {
    overallScore,
    dimensions: {
      headline,
      about,
      experience,
      skills,
      completeness,
      searchability,
    },
    criticalGaps,
    quickWins,
    summary,
  };
}
