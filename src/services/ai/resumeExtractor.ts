import OpenAI from "openai";
import {
  resumeParsedDataSchema,
  type ResumeParsedData,
} from "@/lib/validations/resume";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key",
});

const RESUME_EXTRACTION_SYSTEM_PROMPT = `You are a world-class ATS Resume Entity Extraction Engine.
Your job is to parse raw text extracted from a candidate's resume and return an exact, valid JSON object following this schema:

{
  "fullName": string (required),
  "email": string or empty string,
  "phone": string or empty string,
  "location": string or empty string,
  "summary": string or empty string,
  "skills": array of strings (normalize names, e.g. "React.js" -> "React", "TypeScript", "PostgreSQL", "Docker", etc.),
  "experience": [
    {
      "company": string,
      "title": string,
      "location": string or empty string,
      "startDate": string (e.g. "Jan 2021" or "2021"),
      "endDate": string or empty string,
      "isCurrent": boolean,
      "bullets": array of strings (each original bullet or achievement)
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "fieldOfStudy": string or empty string,
      "graduationYear": string or empty string
    }
  ],
  "projects": [
    {
      "name": string,
      "description": string,
      "technologies": array of strings,
      "url": string or empty string
    }
  ]
}

Extraction Rules:
1. Extract ALL factual skills, programming languages, cloud tools, frameworks, and domain expertise.
2. Order work experiences in reverse chronological order (most recent first).
3. Do NOT hallucinate metrics, dates, or technologies that are not in the raw resume text.
4. Output STRICT, parseable JSON matching the schema.`;

/**
 * Extracts structured entities from raw resume text using GPT-4o-mini
 * and validates the output against the Zod schema.
 */
export async function extractResumeEntities(
  rawResumeText: string
): Promise<ResumeParsedData> {
  if (!process.env.OPENAI_API_KEY) {
    // Development fallback heuristic parser if no API key is set
    return createHeuristicFallback(rawResumeText);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: RESUME_EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract all resume entities from this resume text:\n\n${rawResumeText.slice(0, 24000)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const parsedJson = JSON.parse(content);

  // Validate runtime types strictly with Zod
  const validated = resumeParsedDataSchema.parse(parsedJson);
  return validated;
}

/**
 * Heuristic fallback parser when API keys are not yet configured in local dev.
 */
function createHeuristicFallback(text: string): ResumeParsedData {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullName = lines[0] || "Candidate Name";

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

  return {
    fullName,
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0] : "",
    location: "",
    summary: lines.slice(1, 4).join(" "),
    skills: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Tailwind CSS"],
    experience: [
      {
        company: "Previous Company",
        title: "Software Engineer",
        startDate: "2022",
        endDate: "Present",
        isCurrent: true,
        bullets: [
          "Developed core microservices and frontend features using modern web stack",
        ],
      },
    ],
    education: [
      {
        institution: "University",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
        graduationYear: "2022",
      },
    ],
    projects: [],
  };
}
