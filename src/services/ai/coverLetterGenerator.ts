/**
 * Hunt Deck — 4-Paragraph Bespoke Cover Letter Engine
 * 
 * Implements PRD 3.3.2, 3.3.3, 3.3.4:
 *  - 4-Paragraph architecture (The Hook, The Evidence, The Connection, The Close)
 *  - Integrates CompanyContextBrief (pre-generation intelligence)
 *  - Enforces zero clichés, no first-word "I", no hollow buzzwords
 *  - 3 Tone Modes: "executive", "warm", "modern_tech"
 *  - 280 - 420 words total
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ResumeParsedData } from "@/lib/validations/resume";
import { type CompanyContextBrief, generateCompanyContextBrief } from "./companyResearchService";
import { validateCoverLetterAntiCliches, scrubBannedCliches } from "./clicheFilter";

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
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "dummy-key",
});

/**
 * Heuristic generator for cover letters when Anthropic API key is not present (dev & test mode)
 */
function buildDeterministicCoverLetter(
  candidate: ResumeParsedData,
  companyBrief: CompanyContextBrief,
  roleTitle: string,
  tone: CoverLetterTone
): CoverLetterParagraphs {
  const topExp = candidate.experience[0];
  const companyName = companyBrief.companyName;
  const verifiedHook = companyBrief.verifiedFactHook;

  // Extract candidate metrics if available
  const sampleBullet = topExp?.bullets[0] || "Led cross-functional architecture across distributed web infrastructure";
  const candidateSkills = candidate.skills.slice(0, 3).join(", ");

  let p1Hook = "";
  let p2Evidence = "";
  let p3Connection = "";
  let p4Close = "";

  if (tone === "executive") {
    p1Hook = `Observing ${verifiedHook}, it is evident that ${companyName} is architecting infrastructure at a scale where technical rigor dictates enterprise velocity. Operating in this environment requires anticipating failure modes before deployment and aligning platform foundations with long-term reliability. Stepping into the ${roleTitle} role offers the operational complexity where my background in ${candidateSkills} delivers asymmetric leverage, accelerating system stability while reducing operational burden across product squads.`;
    p2Evidence = `At ${topExp?.company || "my recent post"}, I focused directly on high-throughput reliability: ${sampleBullet}. Navigating these trade-offs reinforced that durable architecture requires eliminating single points of failure before scaling, an approach directly aligned with your team's current trajectory. In parallel, standardizing API contracts and automated canary deployments reduced production incidents, demonstrating how disciplined engineering unblocks organizational momentum.`;
    p3Connection = `${companyBrief.engineeringCultureValues[0] || "High agency execution"} mirrors how I lead technical initiatives and collaborate across engineering leadership. Rather than adding operational friction, my priority is empowering teams to deploy with confidence and autonomy. Solving foundational architectural challenges while mentoring engineers across service boundaries ensures systems scale cleanly without sacrificing shipping tempo.`;
    p4Close = `Let us coordinate a direct conversation this month to discuss how this background will accelerate ${companyName}'s quarterly milestones and technical roadmap. I welcome the opportunity to dive into your architecture, review latency budgets, and explore where my experience will immediately strengthen your team's deliverables.`;
  } else if (tone === "warm") {
    p1Hook = `Following ${verifiedHook}, the intentional craftsmanship your team brings to ${companyBrief.mission} stood out immediately. Building products that people genuinely rely on requires a delicate balance of deep technical capability and human empathy. The ${roleTitle} opening represents a compelling opportunity to partner with thoughtful builders solving meaningful workflow challenges at scale.`;
    p2Evidence = `Throughout my tenure at ${topExp?.company || "my previous role"}, collaborating across engineering, design, and product was central to our outcomes: ${sampleBullet}. Grounding technical choices in end-user empathy ensured our systems were not just resilient under heavy load, but genuinely intuitive and empowering for customer workflows day in and day out.`;
    p3Connection = `Your team's focus on ${companyBrief.engineeringCultureValues[2] || "collaborative communication"} matches how I work best. Great software is built through open architectural debate, mutual mentorship, psychological safety, and shared celebration of shipping hard things. I thrive in teams where knowledge sharing is second nature.`;
    p4Close = `I would appreciate the chance to speak with your engineering team about the challenges facing ${companyName} right now and how I can support your goals. Thank you for your consideration, and I look forward to connecting with your team soon.`;
  } else {
    // modern_tech
    p1Hook = `Watching ${verifiedHook} confirms that ${companyName} is moving significantly faster than the market standard. Building high-performance systems when traffic is compounding requires high agency and relentless execution speed. The ${roleTitle} mandate aligns directly with where I have spent my recent years building: high-impact web and cloud systems designed for low latency.`;
    p2Evidence = `At ${topExp?.company || "my last team"}, the focus was shipping foundational work with tangible leverage: ${sampleBullet}. Building with ${candidateSkills} taught me to optimize for shipping velocity and architectural simplicity without compromising safety or developer experience.`;
    p3Connection = `Your principle of "${companyBrief.engineeringCultureValues[0] || "High ownership"}" is refreshing in an industry often slowed by needless bureaucracy. I thrive in teams where builders are trusted with end-to-end execution, from whiteboard architecture down to production monitoring and customer feedback loops.`;
    p4Close = `Let us schedule a 20-minute introductory conversation next week to walk through your engineering priorities and discuss how I can help your team hit the ground running on upcoming initiatives.`;
  }

  return {
    hook: p1Hook,
    evidence: p2Evidence,
    connection: p3Connection,
    close: p4Close,
  };
}

/**
 * Generates a tailored, 4-paragraph cover letter using pre-generation company intelligence
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

  let rawParagraphs: CoverLetterParagraphs;

  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "dummy-key") {
    const prompt = `You are Hunt Deck's Executive Cover Letter Engine.
Generate a strictly 4-paragraph, highly bespoke cover letter.
Candidate Profile:
- Name: ${candidate.fullName}
- Experience: ${candidate.experience.map((e) => `${e.title} at ${e.company}: ${e.bullets.slice(0, 2).join("; ")}`).join("\n")}
- Skills: ${candidate.skills.join(", ")}

Target Role: ${roleTitle} at ${companyName}
Target Company Intelligence:
- Verified Fact Hook: ${companyBrief.verifiedFactHook}
- Mission: ${companyBrief.mission}
- Tech Stack: ${companyBrief.techStack.join(", ")}
- Values: ${companyBrief.engineeringCultureValues.join(", ")}

Tone: ${tone}

NON-NEGOTIABLE RULES:
1. P1 (The Hook): MUST open with the verified company fact or industry context. DO NOT start the letter with "I". NEVER write "I am writing to apply".
2. P2 (The Evidence): Use candidate's actual achievements and metrics. NEVER hallucinate achievements.
3. P3 (The Connection): Connect candidate skills with company culture.
4. P4 (The Close): Confident, executive CTA without begging.
5. NO buzzwords: "results-driven", "team player", "self-starter", "rockstar", "passionate about".
6. Return JSON with keys: "hook", "evidence", "connection", "close".`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const parsed = JSON.parse(text);
      rawParagraphs = {
        hook: parsed.hook,
        evidence: parsed.evidence,
        connection: parsed.connection,
        close: parsed.close,
      };
    } catch {
      rawParagraphs = buildDeterministicCoverLetter(candidate, companyBrief, roleTitle, tone);
    }
  } else {
    rawParagraphs = buildDeterministicCoverLetter(candidate, companyBrief, roleTitle, tone);
  }

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
  };
}
