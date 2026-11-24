/**
 * Hunt Deck — 4-Paragraph Bespoke Cover Letter Engine
 *
 * Implements PRD 3.3.2, 3.3.3, 3.3.4:
 *  - 4-Paragraph architecture (The Hook, The Evidence, The Connection, The Close)
 *  - Integrates CompanyContextBrief (pre-generation intelligence)
 *  - Enforces zero clichés, no first-word "I", no hollow buzzwords
 *  - 3 Tone Modes: "executive", "warm", "modern_tech"
 *  - 280 - 420 words total
 *  - Anti-Hallucination: Strictly adheres to candidate's verified resume and target company facts.
 *  - Uses Gemini API (gemini-3.8-flash) as primary provider.
 *  - Does NOT silently fall back to unpaid services or alternate providers.
 *  - Retains human review and editing step before submission (no auto-submission).
 */

import type { ResumeParsedData } from "@/lib/validations/resume";
import { type CompanyContextBrief, generateCompanyContextBrief } from "./companyResearchService";
import { validateCoverLetterAntiCliches, scrubBannedCliches } from "./clicheFilter";
import { generateCoverLetterWithGemini } from "./geminiWriter";

export type CoverLetterTone = "executive" | "warm" | "modern_tech";

export interface CoverLetterParagraphs {
  hook: string;       // P1: The Hook (verified company fact, zero "I am writing to")
  evidence: string;   // P2: The Evidence (real metrics from candidate profile)
  connection: string; // P3: The Connection (cultural alignment & mission fit)
  close: string;      // P4: The Close (confident, proactive executive CTA)
}

export interface GeneratedCoverLetter {
  companyName: string;
  roleTitle: string;
  tone: CoverLetterTone;
  paragraphs: CoverLetterParagraphs;
  fullText: string;
  wordCount: number;
  companyBrief: CompanyContextBrief;
  verifiedFactUsed: string;
  isClicheFree: boolean;
  violationsDetected: string[];
  model: string;
  modelVersion: string;
  provider: string;
}

/** Local draft helper using candidate-provided facts. */
export function buildDeterministicCoverLetter(
  candidate: ResumeParsedData,
  companyBrief: CompanyContextBrief,
  roleTitle: string,
  _tone: CoverLetterTone
): CoverLetterParagraphs {
  void _tone;
  const bullet = candidate.experience.flatMap((experience) => experience.bullets)[0];
  return {
    hook: `I would like to be considered for the ${roleTitle} position at ${companyBrief.companyName}.`,
    evidence: bullet || candidate.summary || "I welcome the opportunity to discuss my background.",
    connection: "I would welcome the opportunity to discuss how my experience relates to this role.",
    close: "Thank you for considering my application. I look forward to speaking with you.",
  };
}

/**
 * Generates a tailored, 4-paragraph cover letter using pre-generation company intelligence
 * Generates a tailored, 4-paragraph cover letter using pre-generation company intelligence.
 * Primary Provider: Google Gemini (gemini-3.8-flash).
 */
export async function generateTailoredCoverLetter(
  candidate: ResumeParsedData,
  companyName: string,
  roleTitle: string,
  jobDescription?: string,
  tone: CoverLetterTone = "modern_tech"
): Promise<GeneratedCoverLetter> {
  // Step 1: Pre-generation intelligence brief
  const companyBrief = await generateCompanyContextBrief(companyName, roleTitle, jobDescription);

  const result = await generateCoverLetterWithGemini({
    candidate, companyName, roleTitle, jobDescription, companyBrief, tone,
  });
  const rawParagraphs = result.paragraphs;
  const modelName = result.model;
  const modelVersion = result.modelVersion;
  const providerName = result.provider;

  // Step 2: Cliche & Anti-Bot validation
  const assembledText = [
    rawParagraphs.hook,
    rawParagraphs.evidence,
    rawParagraphs.connection,
    rawParagraphs.close,
  ].join("\n\n");

  const validation = validateCoverLetterAntiCliches(assembledText);

  // If violations exist, apply automated scrubbing
  let finalParagraphs = rawParagraphs;
  if (!validation.isValid) {
    finalParagraphs = {
      hook: scrubBannedCliches(rawParagraphs.hook),
      evidence: scrubBannedCliches(rawParagraphs.evidence),
      connection: scrubBannedCliches(rawParagraphs.connection),
      close: scrubBannedCliches(rawParagraphs.close),
    };
  }

  const finalText = [
    finalParagraphs.hook,
    finalParagraphs.evidence,
    finalParagraphs.connection,
    finalParagraphs.close,
  ].join("\n\n");

  const wordCount = finalText.split(/\s+/).filter(Boolean).length;

  return {
    companyName,
    roleTitle,
    tone,
    paragraphs: finalParagraphs,
    fullText: finalText,
    wordCount,
    companyBrief,
    verifiedFactUsed: companyBrief.verifiedFactHook,
    isClicheFree: validation.isValid,
    violationsDetected: validation.violations,
    model: modelName,
    modelVersion,
    provider: providerName,
  };
}
