import { pollResumeJob } from "@/features/resume/pollResumeJob";
import { completeOnboardingSchema, type CompleteOnboardingInput, type SkillItem } from "@/lib/validations/onboarding";
import { z } from "zod";
import { resumeParsedDataSchema } from "@/lib/validations/resume";

const savedResumeResponse = z.object({ success: z.literal(true), resume: z.object({
  id: z.string().min(1), title: z.string(), parsedData: resumeParsedDataSchema,
}).nullable() });

/** Reload an owned result without uploading or calling an AI provider again. */
export async function loadSavedOnboardingResume(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch("/api/resumes", { cache: "no-store", signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (!response.ok) throw new Error(response.status === 401 ? "Please sign in again to load your saved resume." : "Unable to load your saved resume. Please retry.");
  const result = savedResumeResponse.safeParse(await response.json());
  if (!result.success) throw new Error("Unable to load your saved resume. Please retry.");
  return result.data.resume;
}

/** Keep only skills actually returned by extraction; unknown categories stay neutral. */
export function extractedSkills(names: string[]): SkillItem[] {
  const unique = new Map<string, string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed && !unique.has(trimmed.toLowerCase())) unique.set(trimmed.toLowerCase(), trimmed);
  }
  return [...unique.values()].map((name) => ({ name, category: "Domains", isVerified: true }));
}

export async function importOnboardingResume(file: File, onProgress: (progress: number) => void) {
  if (!file.name.toLowerCase().endsWith(".pdf") || file.size === 0 || file.size > 10 * 1024 * 1024) {
    throw new Error("Please choose a PDF up to 10 MB.");
  }
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/resumes/upload", { method: "POST", body });
  if (!response.ok) {
    throw new Error(response.status === 401 ? "Please sign in before uploading your resume." : "Unable to upload your resume. Please try again.");
  }
  const data = await response.json();
  if (typeof data.jobId !== "string") throw new Error("Resume processing did not start. Please try again.");
  return pollResumeJob(data.jobId, onProgress);
}

export async function saveOnboarding(input: CompleteOnboardingInput) {
  const body = completeOnboardingSchema.parse(input);
  const response = await fetch("/api/onboarding", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(response.status === 401
    ? "Please sign in again before saving your profile."
    : "Your profile could not be saved. Please retry.");
  const result = await response.json();
  if (result.success !== true) throw new Error("Your profile could not be saved. Please retry.");
}
