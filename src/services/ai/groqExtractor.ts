/**
 * Hunt Deck — Structured Resume Entity Extraction via Groq
 *
 * Uses Groq API with openai/gpt-oss-120b (configurable initial model)
 * Enforces:
 *  - Strict Zod validation against resumeParsedDataSchema
 *  - Explicit representation of missing/uncertain data (never invent)
 *  - Token accounting and privacy-safe telemetry
 *  - Zero hallucination
 *  - Fails closed if unconfigured without silent unauthorized provider fallback
 */

import OpenAI from "openai";
import { resumeParsedDataSchema, type ResumeParsedData } from "@/lib/validations/resume";
import { recordAiCallTelemetry } from "./aiTelemetry";
import { groqResumeJsonSchema, normalizeMissingResumeFields } from "@/lib/validations/resumeExtraction";

export interface GroqExtractionResult {
  data: ResumeParsedData;
  model: string;
  provider: "groq";
  extractedAt: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Creates Groq client using OpenAI-compatible SDK endpoint
 */
function getGroqClient(): { client: OpenAI; model: string } {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Groq API is not configured. Set GROQ_API_KEY to enable structured entity extraction.");
  }

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const baseURL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";

  const client = new OpenAI({
    apiKey,
    baseURL,
    maxRetries: 0,
    timeout: 30_000,
  });

  return { client, model };
}

const EXTRACTION_SYSTEM_PROMPT = `You are Hunt Deck's Structured Resume Entity Extraction Engine.
Analyze the candidate's raw resume text and extract ONLY the facts explicitly present.

CRITICAL EXTRACTION RULES:
1. NEVER invent, infer, or extrapolate information. If a field is not present in the text, use an empty string "" or empty array [].
2. For missing or uncertain fields:
   - If graduation year is not stated, use "".
   - If degree is not stated, use "[Not Specified]".
   - If end date is missing for a past role, use "".
   - Include every field in the schema. Missing optional facts are ""; missing lists are []. Never output null.
3. Skills: Extract only explicitly mentioned technologies, languages, frameworks, and methodologies.
4. Experience bullets: Preserve candidate's exact achievements and metrics. Do not fabricate or inject metrics.
5. You MUST return a single JSON object strictly matching this schema:
{
  "fullName": string,
  "email": string,
  "phone": string,
  "location": string,
  "summary": string,
  "skills": string[],
  "experience": [
    {
      "company": string,
      "title": string,
      "location": string,
      "startDate": string,
      "endDate": string,
      "isCurrent": boolean,
      "bullets": string[]
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "fieldOfStudy": string,
      "graduationYear": string
    }
  ],
  "projects": [
    {
      "name": string,
      "description": string,
      "technologies": string[],
      "url": string
    }
  ]
}`;

export async function extractResumeEntitiesWithGroq(
  rawResumeText: string
): Promise<GroqExtractionResult> {
  if (!rawResumeText || rawResumeText.trim().length === 0) {
    throw new Error("Cannot extract entities from empty resume text.");
  }

  const { client, model } = getGroqClient();
  const startTime = Date.now();

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"].includes(model)
        ? { type: "json_schema", json_schema: { name: "resume_extraction", strict: true, schema: groqResumeJsonSchema } }
        : { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract structured resume data from this text:\n\n${rawResumeText.slice(0, 15000)}`,
        },
      ],
    });

    const latencyMs = Date.now() - startTime;
    const rawContent = response.choices[0]?.message?.content;

    if (!rawContent || response.choices[0]?.finish_reason === "length") {
      throw new SyntaxError("Resume extraction returned incomplete structured data.");
    }

    const parsedJson = JSON.parse(rawContent);

    // Validate strictly against project Zod schema
    const validatedData = resumeParsedDataSchema.parse(normalizeMissingResumeFields(parsedJson));

    const tokenUsage = {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    };

    recordAiCallTelemetry({
      provider: "groq",
      model,
      inputTokens: tokenUsage.promptTokens,
      outputTokens: tokenUsage.completionTokens,
      latencyMs,
      success: true,
    });

    return {
      data: validatedData,
      model,
      provider: "groq",
      extractedAt: new Date().toISOString(),
      tokenUsage,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorCode = error instanceof Error ? error.name : "UNKNOWN_ERROR";

    recordAiCallTelemetry({
      provider: "groq",
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
