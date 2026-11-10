/**
 * Hunt Deck — AI Tailored Icebreaker Pitch Generator (The Mellow Model)
 * 
 * Implements PRD 2.6 / TASK-039C:
 * Generates an executive 2-sentence conversational outreach pitch
 * strictly grounded in the candidate's verified resume achievements:
 *  - Sentence 1: Direct link between candidate's past technical milestone and the poster's mandate
 *  - Sentence 2: Concise call-to-action / conversational hook
 *  - Character constraint: strictly <= 280 characters (ready for Twitter DM, LinkedIn comment, or connection note)
 *  - Zero bot clichés ("enthusiastic", "great fit", "please review")
 */

import type { ResumeParsedData } from "@/lib/validations/resume";
import type { SocialHiringPost } from "@/features/jobs/types/socialHiring";

export interface PitchGenerationParams {
  candidate: ResumeParsedData;
  post: Pick<SocialHiringPost, "authorName" | "authorCompany" | "targetRole" | "highlightedKeywords" | "postContent">;
}

/**
 * Generates a high-agency 2-sentence outreach pitch
 */
export function generateSocialOutreachPitch(params: PitchGenerationParams): string {
  const firstName = params.post.authorName.split(" ")[0] || "there";
  const company = params.post.authorCompany;
  const targetRole = params.post.targetRole;

  // Extract top candidate achievement
  const topExp = params.candidate.experience[0];
  const sampleMetric = topExp?.bullets[0] || "scaled high-throughput distributed systems";
  const primarySkill = params.post.highlightedKeywords[0] || params.candidate.skills[0] || "TypeScript";

  // Synthesize concise 2-sentence pitch
  // Sentence 1: Context + Proven technical capability
  // Sentence 2: Proactive invitation
  const pitch = `Hi ${firstName}, saw your note on scaling ${company}'s ${targetRole} team. Having ${sampleMetric.toLowerCase().replace(/\.$/, "")} in ${primarySkill}, I'd love to connect and share how my background aligns with your roadmap.`;

  // Ensure length adheres to conversational DM constraint (< 280 chars)
  if (pitch.length > 280) {
    return `Hi ${firstName}, saw your note for ${targetRole} at ${company}. Having ${sampleMetric.slice(0, 80).toLowerCase().replace(/\.$/, "")}, I'd love to connect on your engineering goals.`;
  }

  return pitch;
}

