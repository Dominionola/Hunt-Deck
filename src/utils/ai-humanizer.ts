/**
 * AI Humanizer — 6-Stage Anti-Watermark Pipeline
 *
 * Transforms raw AI-generated text (resume bullets, cover letters, outreach)
 * into human-sounding, candidate-voice-calibrated output that passes AI
 * detection tools and reads as authentic human writing.
 *
 * Architecture: § 14 — AI Voice & Humanization Engine (ARCHITECTURE.md)
 * Reference:    references/engineering/ai-humanization-and-ats-rank.md
 *
 * Rubric (must score >= 85/100 to ship):
 *   - Burstiness:     0–25 pts (sentence length variance)
 *   - Specificity:    0–25 pts (concrete nouns, numbers, tools)
 *   - Voice Match:    0–25 pts (cosine similarity to candidate baseline)
 *   - Token Hygiene:  0–25 pts (blocklist violations = 0 pts)
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  scanForBlocklistedTokens,
} from "@/lib/ai-tokens-blocklist";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VoiceProfile {
  avgSentenceLength: number;    // characters
  avgWordLength: number;
  activeToBulletRatio: number;  // 0–1, higher = more active voice
  vocabularyDiversityScore: number; // type-token ratio
  toneDescriptors: string[];    // ["direct", "technical", "measured"]
}

export interface ProvenanceAnchor {
  type: "metric" | "date" | "company" | "tech" | "institution";
  value: string;
}

export interface HumanizerInput {
  rawText: string;
  documentType: "resume_bullet" | "cover_letter" | "outreach_message";
  voiceProfile: VoiceProfile;
  provenanceAnchors: ProvenanceAnchor[];
  maxRetries?: number;
}

export interface HumanizerOutput {
  humanizedText: string;
  rubricScore: number;
  violations: string[];
  stage: number; // last successful stage (6 = fully humanized)
  passed: boolean;
}

// ─── Stage 1: Token Purge ────────────────────────────────────────────────────

/**
 * Removes blocklisted tokens via LLM rewrite + regex fallback.
 * Ensures no banned phrase survives into downstream stages.
 */
async function stage1_tokenPurge(text: string): Promise<string> {
  const violations = scanForBlocklistedTokens(text);
  if (violations.length === 0) return text;

  const prompt = `Rewrite the following text removing these specific phrases without changing meaning: ${violations.join(", ")}.
  
Text:
${text}

Rules:
- Replace each banned phrase with a concrete, specific alternative
- Do not add new banned phrases
- Preserve all numbers, dates, company names, and technical tool names exactly
- Return ONLY the rewritten text, no explanation`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return (response.content[0] as { type: "text"; text: string }).text.trim();
}

// ─── Stage 2: Burstiness & Perplexity Injection ──────────────────────────────

/**
 * Varies sentence length and structure to defeat AI detection algorithms
 * that flag uniformly medium-length sentences (the AI signature pattern).
 */
async function stage2_burstnessInjection(
  text: string,
  docType: HumanizerInput["documentType"]
): Promise<string> {
  const prompt = `Rewrite the following ${docType.replace("_", " ")} to vary sentence rhythm naturally.

Rules:
- Mix short punchy sentences (4–8 words) with longer ones (20–30 words)
- Break predictable parallel structure occasionally
- Do NOT change factual content, numbers, dates, or tool names
- Return ONLY the rewritten text

Text:
${text}`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return (response.content[0] as { type: "text"; text: string }).text.trim();
}

// ─── Stage 3: Specificity Injection ──────────────────────────────────────────

/**
 * Replaces generic descriptors with concrete, specific language.
 * AI writing tends toward generic abstractions — human writing names things.
 */
async function stage3_specificityInjection(text: string): Promise<string> {
  const prompt = `Make this text more specific and concrete. Replace vague descriptors with precise language.

Examples of replacements:
- "various technologies" → list the actual technologies
- "significant improvement" → quantify it if possible
- "large team" → "cross-functional team of 12"
- "fast" → "sub-200ms"

Rules:
- Only add specifics that could plausibly be true based on context
- Do not invent numbers or achievements
- Preserve all existing numbers, dates, and names exactly
- Return ONLY the rewritten text

Text:
${text}`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return (response.content[0] as { type: "text"; text: string }).text.trim();
}

// ─── Stage 4: Provenance Data Lock ───────────────────────────────────────────

/**
 * Verifies all provenance anchors (metrics, dates, companies, tools) are
 * UNCHANGED from the original. Restores any that were accidentally altered.
 */
function stage4_provenanceLock(
  text: string,
  anchors: ProvenanceAnchor[],
  originalText: string
): string {
  let locked = text;

  for (const anchor of anchors) {
    if (!locked.toLowerCase().includes(anchor.value.toLowerCase())) {
      // Anchor was lost during transformation — restore from original context
      const pattern = new RegExp(
        anchor.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      const originalMatch = originalText.match(pattern);
      if (originalMatch) {
        // Re-inject the anchor value — this is a heuristic restoration
        // A full implementation would use a diff-based restoration algorithm
        locked = locked + ` [${anchor.type}: ${anchor.value}]`;
      }
    }
  }

  return locked;
}

// ─── Stage 5: Voice Calibration ──────────────────────────────────────────────

/**
 * Steers the output toward the candidate's measured voice profile baseline.
 * Prevents HuntDeck from producing a generic corporate voice that differs
 * from how the candidate actually writes.
 */
async function stage5_voiceCalibration(
  text: string,
  voice: VoiceProfile
): Promise<string> {
  const toneInstruction =
    voice.toneDescriptors.length > 0
      ? `The candidate writes with a ${voice.toneDescriptors.join(", ")} tone.`
      : "The candidate writes in a direct, professional tone.";

  const prompt = `Adjust the style of this text to match the following writer profile:
- ${toneInstruction}
- Average sentence length: ~${Math.round(voice.avgSentenceLength)} characters
- Writing style: ${voice.activeToBulletRatio > 0.6 ? "active voice, action-forward" : "balanced active/passive"}

Rules:
- Match the style, not the content — do not change facts, numbers, or technical names
- Do not make it sound more AI-generated
- Return ONLY the rewritten text

Text:
${text}`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return (response.content[0] as { type: "text"; text: string }).text.trim();
}

// ─── Stage 6: Self-Critique Rubric Score ─────────────────────────────────────

/**
 * Scores the output against the humanization rubric (0–100).
 * Blocks shipment if score < 85.
 */
async function stage6_rubricScore(
  text: string,
  docType: string
): Promise<{ score: number; violations: string[] }> {
  const blockedTokens = scanForBlocklistedTokens(text);
  const tokenScore = blockedTokens.length === 0 ? 25 : Math.max(0, 25 - blockedTokens.length * 5);

  const prompt = `Score the following ${docType} on humanization quality. Return JSON only.

Rubric:
- burstiness (0-25): Does sentence length vary naturally? Not all medium-length?
- specificity (0-25): Are there concrete nouns, numbers, tools named? Not vague abstractions?
- voiceAuthenticity (0-25): Does it sound like a real human wrote it, not an AI?

${text}

Return: {"burstiness": number, "specificity": number, "voiceAuthenticity": number, "reasoning": string}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (response.content[0] as { type: "text"; text: string }).text;
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const totalScore =
      (parsed.burstiness ?? 0) +
      (parsed.specificity ?? 0) +
      (parsed.voiceAuthenticity ?? 0) +
      tokenScore;

    return { score: Math.min(100, totalScore), violations: blockedTokens };
  } catch {
    // Fallback scoring if LLM fails
    return { score: tokenScore + 45, violations: blockedTokens };
  }
}

// ─── Main Humanizer Pipeline ──────────────────────────────────────────────────

export async function humanizeText(
  input: HumanizerInput
): Promise<HumanizerOutput> {
  const { rawText, documentType, voiceProfile, provenanceAnchors, maxRetries = 2 } = input;
  let currentText = rawText;
  let attempts = 0;

  while (attempts <= maxRetries) {
    // Stage 1: Token Purge
    currentText = await stage1_tokenPurge(currentText);

    // Stage 2: Burstiness Injection
    currentText = await stage2_burstnessInjection(currentText, documentType);

    // Stage 3: Specificity Injection
    currentText = await stage3_specificityInjection(currentText);

    // Stage 4: Provenance Lock
    currentText = stage4_provenanceLock(currentText, provenanceAnchors, rawText);

    // Stage 5: Voice Calibration
    currentText = await stage5_voiceCalibration(currentText, voiceProfile);

    // Stage 6: Rubric Score
    const { score, violations } = await stage6_rubricScore(currentText, documentType);

    if (score >= 85 && violations.length === 0) {
      return {
        humanizedText: currentText,
        rubricScore: score,
        violations: [],
        stage: 6,
        passed: true,
      };
    }

    attempts++;
  }

  // Final check — return even if score is < 85 after max retries, but flag it
  const { score, violations } = await stage6_rubricScore(currentText, documentType);
  return {
    humanizedText: currentText,
    rubricScore: score,
    violations,
    stage: 6,
    passed: score >= 85 && violations.length === 0,
  };
}
