import { z } from "zod";
import type { extractionWarningSchema } from "./resume";

type ExtractionWarning = z.infer<typeof extractionWarningSchema>;

function normalizeWebLink(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^(?:www\.)?[a-z0-9](?:[a-z0-9.-]*\.)[a-z]{2,}(?:[/?#][^\s]*)?$/i.test(trimmed)
    ? `https://${trimmed}` : trimmed;
  try {
    const url = new URL(candidate);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : undefined;
  } catch { return undefined; }
}

// Groq strict outputs require every property and closed nested objects. Missing
// facts are empty strings/arrays, rather than invented values or nullable shapes.
const text = z.string();
const strings = z.array(text);
const groqResumeSchema = z.strictObject({
  fullName: text, email: text, phone: text, location: text, summary: text, skills: strings,
  experience: z.array(z.strictObject({
    company: text, title: text, location: text, startDate: text, endDate: text,
    isCurrent: z.boolean(), bullets: strings,
  })),
  education: z.array(z.strictObject({ institution: text, degree: text, fieldOfStudy: text, graduationYear: text })),
  projects: z.array(z.strictObject({ name: text, description: text, technologies: strings, url: text })),
});

export const groqResumeJsonSchema = z.toJSONSchema(groqResumeSchema, { target: "draft-7" });

/** Normalize missing/contact fields; malformed core field types still fail validation. */
export function normalizeMissingResumeFields(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = { ...source };
  const warnings = new Set<ExtractionWarning>();
  for (const name of ["email", "phone", "location", "summary", "linkedinUrl"]) {
    if (output[name] === null) delete output[name];
  }
  for (const name of ["skills", "experience", "education", "projects"]) {
    if (output[name] === null) output[name] = [];
  }
  if (typeof output.email === "string") {
    const email = output.email.trim().replace(/^mailto:/i, "").split("?")[0];
    if (!email || z.email().safeParse(email).success) output.email = email;
    else { output.email = ""; warnings.add("email_needs_review"); }
  }
  if (typeof output.linkedinUrl === "string") {
    const link = normalizeWebLink(output.linkedinUrl);
    if (link) output.linkedinUrl = link;
    else { delete output.linkedinUrl; if (link === undefined) warnings.add("linkedin_url_needs_review"); }
  }
  const optional = { experience: ["location", "endDate"], education: ["fieldOfStudy", "graduationYear"], projects: ["url"] };
  for (const [name, fields] of Object.entries(optional)) {
    if (Array.isArray(output[name])) output[name] = output[name].map((entry: unknown) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
      const item = { ...entry } as Record<string, unknown>;
      for (const field of fields) if (item[field] === null) delete item[field];
      if (name === "projects" && typeof item.url === "string") {
        const link = normalizeWebLink(item.url);
        if (link !== undefined) item.url = link;
        else { delete item.url; warnings.add("project_url_needs_review"); }
      }
      return item;
    });
  }
  if (warnings.size) output.extractionWarnings = [...warnings];
  return output;
}
