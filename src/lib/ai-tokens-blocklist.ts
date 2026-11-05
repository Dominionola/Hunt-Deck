/**
 * AI Tokens Blocklist — Anti-Watermark Defense Layer
 *
 * This is the canonical list of tokens, phrases, and patterns that are
 * BANNED from all AI-generated candidate documents (resumes, cover letters,
 * outreach messages). Any LLM output containing these tokens is rejected
 * and must be regenerated.
 *
 * Architecture: § 14 — AI Voice & Humanization Engine (ARCHITECTURE.md)
 * Reference:    references/engineering/ai-humanization-and-ats-rank.md
 *
 * Categories:
 *   A — Corporate AI Filler / Buzzwords
 *   B — Passive / Weak Phrasing
 *   C — Detectable AI Transitional Phrases
 *   D — Sycophantic / Hollow Openers
 *   E — Prohibited Resume Clichés
 *   F — Hallucination-Risk Temporal Markers
 */

// ─── Category A: Corporate AI Filler & Buzzwords ─────────────────────────────
export const AI_FILLER_TOKENS: string[] = [
  "synergy",
  "synergies",
  "leverage",
  "leveraging",
  "robust",
  "scalable",
  "cutting-edge",
  "state-of-the-art",
  "innovative",
  "innovation",
  "revolutionize",
  "disruptive",
  "transformative",
  "game-changer",
  "paradigm shift",
  "holistic",
  "proactive",
  "actionable",
  "impactful",
  "seamlessly",
  "streamline",
  "streamlining",
  "optimize",
  "optimization",
  "strategically",
  "ecosystem",
  "stakeholder",
  "stakeholders",
  "deliverables",
  "bandwidth",
  "pivot",
  "pivoting",
  "move the needle",
  "boil the ocean",
  "circle back",
  "deep dive",
  "double down",
  "low-hanging fruit",
  "thought leader",
  "best-in-class",
  "world-class",
  "next-level",
];

// ─── Category B: Passive / Weak Phrasing ─────────────────────────────────────
export const WEAK_PHRASING_TOKENS: string[] = [
  "was responsible for",
  "responsible for",
  "helped with",
  "assisted in",
  "worked on",
  "involved in",
  "participated in",
  "contributed to",
  "supported",
  "was part of",
  "tried to",
  "attempted to",
  "helped to",
];

// ─── Category C: Detectable AI Transitional Phrases ──────────────────────────
export const AI_TRANSITIONAL_TOKENS: string[] = [
  "in conclusion",
  "to summarize",
  "in summary",
  "it is worth noting",
  "it is important to note",
  "it is crucial to",
  "needless to say",
  "as previously mentioned",
  "as mentioned above",
  "last but not least",
  "in today's fast-paced world",
  "in today's fast-paced digital landscape",
  "fast-paced digital landscape",
  "in the dynamic landscape of",
  "in an ever-changing world",
  "the world of",
  "the realm of",
  "the field of",
  "delve into",
  "delve",
  "dive into",
  "embark on",
  "harness",
  "harnessing",
  "foster",
  "fostering",
  "facilitate",
  "facilitating",
  "underscore",
  "underscoring",
  "furthermore",
  "moreover",
  "nevertheless",
  "notwithstanding",
  "conceptualize",
];

// ─── Category D: Sycophantic / Hollow Openers (Cover Letter) ─────────────────
export const HOLLOW_OPENER_TOKENS: string[] = [
  "I am writing to express my interest",
  "I am writing to apply for",
  "I am excited to apply",
  "I am thrilled to apply",
  "I am passionate about",
  "As a highly motivated",
  "As an enthusiastic",
  "I have always been passionate",
  "With a strong background in",
  "With extensive experience in",
  "I would be a great fit",
  "I believe I am a perfect fit",
  "It is with great enthusiasm",
];

// ─── Category E: Prohibited Resume Clichés ───────────────────────────────────
export const RESUME_CLICHE_TOKENS: string[] = [
  "hard worker",
  "hard-working",
  "team player",
  "go-getter",
  "self-starter",
  "results-driven",
  "results-oriented",
  "detail-oriented",
  "motivated individual",
  "quick learner",
  "fast learner",
  "excellent communication skills",
  "strong communication skills",
  "strong interpersonal skills",
  "ability to work independently",
  "ability to work in a fast-paced environment",
  "multi-tasker",
  "outside the box",
  "think outside the box",
];

// ─── Category F: Hallucination-Risk Temporal Markers ─────────────────────────
export const TEMPORAL_RISK_TOKENS: string[] = [
  "recently",
  "currently",
  "at present",
  "as of now",
  "up-to-date",
  "the latest",
  "cutting edge",
  "new and emerging",
];

// ─── Merged Master Blocklist ──────────────────────────────────────────────────
export const MASTER_BLOCKLIST: string[] = [
  ...AI_FILLER_TOKENS,
  ...WEAK_PHRASING_TOKENS,
  ...AI_TRANSITIONAL_TOKENS,
  ...HOLLOW_OPENER_TOKENS,
  ...RESUME_CLICHE_TOKENS,
  ...TEMPORAL_RISK_TOKENS,
];

/**
 * Scan a string for any blocklisted token. Case-insensitive whole-word match.
 * Returns an array of all violations found.
 */
export function scanForBlocklistedTokens(text: string): string[] {
  const normalised = text.toLowerCase();
  return MASTER_BLOCKLIST.filter((token) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    return regex.test(normalised);
  });
}

/**
 * Returns true if the text is clean (no blocked tokens found).
 */
export function isCleanText(text: string): boolean {
  return scanForBlocklistedTokens(text).length === 0;
}
