import { type ResumeParsedData } from "@/lib/validations/resume";
import { extractResumeEntitiesWithGroq, type GroqExtractionResult } from "./groqExtractor";

export interface ResumeExtractionEnvelope {
  data: ResumeParsedData;
  provider: string;
  model: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}


export async function extractResumeEntities(rawResumeText: string): Promise<ResumeParsedData> {
  return (await extractResumeEntitiesDetailed(rawResumeText)).data;
}

export async function extractResumeEntitiesDetailed(rawResumeText: string): Promise<ResumeExtractionEnvelope> {
  if (process.env.GROQ_API_KEY) {
    const result: GroqExtractionResult = await extractResumeEntitiesWithGroq(rawResumeText);
    return { data: result.data, provider: result.provider, model: result.model, tokenUsage: result.tokenUsage };
  }
  // Only allow legacy OpenAI if explicitly approved via configuration
  if (process.env.ALLOW_LEGACY_OPENAI_FALLBACK === "true" && process.env.OPENAI_API_KEY) {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an ATS Resume Entity Extraction Engine. Output strictly JSON matching the candidate resume schema.",
        },
        {
          role: "user",
          content: `Extract all resume entities from this resume text:\n\n${rawResumeText.slice(0, 24000)}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const { resumeParsedDataSchema } = await import("@/lib/validations/resume");
    const parsedData = resumeParsedDataSchema.parse(JSON.parse(content));

    return {
      data: parsedData,
      provider: "openai",
      model: "gpt-4o-mini",
      tokenUsage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  }
  throw new Error("Resume extraction is not configured. Set GROQ_API_KEY.");
}
