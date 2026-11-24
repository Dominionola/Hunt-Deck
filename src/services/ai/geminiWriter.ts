/**
 * Hunt Deck — Executive Cover Letter & Resume Writing Engine via Google Gemini
 *
 * Uses paid Gemini API with gemini-3.8-flash as the configurable initial model.
 *
 * Strict Invariants:
 *  - Paid Gemini API only; never silently fall back to unpaid services or alternate providers.
 *  - Anti-Hallucination: Strictly adhere to candidate's verified resume and job description.
 *    Never invent qualifications, employers, dates, achievements, or metrics.
 *  - Validate structured responses against Zod schemas.
 *  - Privacy-Safe: Zero logging of prompts, outputs, resume text, or user secrets.
 *  - Retains human review and editing step in UI (no automated submission).
 */

import { z } from "zod";
import type { ResumeParsedData } from "@/lib/validations/resume";
import type { CompanyContextBrief } from "./companyResearchService";
import type { CoverLetterParagraphs, CoverLetterTone } from "./coverLetterGenerator";
import { recordAiCallTelemetry } from "./aiTelemetry";

export const coverLetterParagraphsSchema = z.object({
  hook: z.string().min(20, "Hook paragraph must be meaningful"),
  evidence: z.string().min(20, "Evidence paragraph must be meaningful"),
  connection: z.string().min(20, "Connection paragraph must be meaningful"),
  close: z.string().min(20, "Close paragraph must be meaningful"),
});

export interface GeminiCoverLetterResult {
  paragraphs: CoverLetterParagraphs;
  model: string;
  modelVersion: string;
  provider: "gemini";
  generatedAt: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export function getGeminiConfig(): { apiKey: string; model: string; endpoint: string } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "Gemini API is not configured. Configure GEMINI_API_KEY with an approved paid account."
    );
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  return { apiKey, model, endpoint };
}

export async function generateCoverLetterWithGemini(params: {
  candidate: ResumeParsedData;
  companyName: string;
  roleTitle: string;
  jobDescription?: string;
  companyBrief: CompanyContextBrief;
  tone: CoverLetterTone;
}): Promise<GeminiCoverLetterResult> {
  const { model, endpoint } = getGeminiConfig();
  const startTime = Date.now();

  const candidateExperiences = params.candidate.experience
    .map(
      (e) =>
        `- ${e.title} at ${e.company} (${e.startDate} - ${e.isCurrent ? "Present" : e.endDate || ""}):\n  ${e.bullets.join("\n  ")}`
    )
    .join("\n");

  const prompt = `You are Hunt Deck's Executive Cover Letter Writing Engine.
Generate a strictly 4-paragraph bespoke cover letter adhering to the candidate's verified profile and target company intelligence.

SOURCE MATERIAL (DO NOT INVENT OUTSIDE OF THIS):
Candidate Name: ${params.candidate.fullName}
Candidate Skills: ${params.candidate.skills.join(", ")}
Candidate Experience:
${candidateExperiences || "No prior experience records provided"}

Target Role: ${params.roleTitle}
Target Company: ${params.companyName}
Company Context:
- Verified Fact Hook: ${params.companyBrief.verifiedFactHook}
- Mission: ${params.companyBrief.mission}
- Core Tech Stack: ${params.companyBrief.techStack.join(", ")}
- Engineering Culture: ${params.companyBrief.engineeringCultureValues.join(", ")}
${params.jobDescription ? `Target Job Description Summary:\n${params.jobDescription.slice(0, 3000)}` : ""}

Tone Calibration: ${params.tone}

NON-NEGOTIABLE WRITING CONSTRAINTS:
1. P1 (The Hook): MUST open with the verified company fact or industry context. DO NOT start the letter with "I". NEVER write "I am writing to apply".
2. P2 (The Evidence): ONLY use the candidate's actual achievements, roles, and metrics listed above. NEVER invent numbers, percentages, company names, or accomplishments not in the source text.
3. P3 (The Connection): Connect verified candidate strengths with the target company's mission and engineering values.
4. P4 (The Close): Confident, executive call-to-action.
5. NO banned clichés ("results-driven", "team player", "self-starter", "rockstar", "passionate about").
6. You MUST return a JSON object with keys: "hook", "evidence", "connection", "close".`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              hook: { type: "STRING" },
              evidence: { type: "STRING" },
              connection: { type: "STRING" },
              close: { type: "STRING" },
            },
            required: ["hook", "evidence", "connection", "close"],
          },
        },
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      let parsedCode = `HTTP_${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        parsedCode = errJson?.error?.status || parsedCode;
      } catch {
        // use status
      }
      throw new Error(`Gemini API error (${response.status}): ${parsedCode}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error("Gemini returned empty candidate content.");
    }

    const parsedJson = JSON.parse(candidateText);
    const validatedParagraphs = coverLetterParagraphsSchema.parse(parsedJson);

    const promptTokens = data?.usageMetadata?.promptTokenCount ?? 0;
    const candidatesTokens = data?.usageMetadata?.candidatesTokenCount ?? 0;
    const totalTokens = data?.usageMetadata?.totalTokenCount ?? (promptTokens + candidatesTokens);
    const modelVersion = data?.modelVersion || model;

    recordAiCallTelemetry({
      provider: "gemini",
      model,
      inputTokens: promptTokens,
      outputTokens: candidatesTokens,
      latencyMs,
      success: true,
    });

    return {
      paragraphs: validatedParagraphs,
      model,
      modelVersion,
      provider: "gemini",
      generatedAt: new Date().toISOString(),
      tokenUsage: {
        promptTokens,
        completionTokens: candidatesTokens,
        totalTokens,
      },
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorCode = error instanceof Error ? error.message : "GEMINI_INVOCATION_ERROR";

    recordAiCallTelemetry({
      provider: "gemini",
      model,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      success: false,
      errorCode,
    });

    throw error;
  }
}
