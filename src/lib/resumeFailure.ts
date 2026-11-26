export type ResumeProcessingStage = "storage" | "parsing" | "extraction" | "embedding" | "persistence";

export const RESUME_FAILURE_MESSAGES = {
  STORAGE_UNAVAILABLE: "We couldn’t read the private upload. Please upload the PDF again.",
  INVALID_PDF: "We couldn’t read text from this PDF. Please upload a text-based PDF without password protection.",
  EXTRACTION_INVALID_OUTPUT: "We couldn’t read the resume details reliably. Please retry your PDF.",
  EXTRACTION_CONFIGURATION: "Resume extraction needs a service configuration check. Please contact support.",
  EXTRACTION_REJECTED: "The extraction service could not process this document. Please retry or contact support.",
  EXTRACTION_RATE_LIMITED: "The extraction service is busy. Please wait a minute before retrying your PDF.",
  EMBEDDING_UNAVAILABLE: "Resume matching preparation is unavailable. Please try again later.",
  PERSISTENCE_UNAVAILABLE: "We couldn’t save the processed resume. Please try again later.",
  TEMPORARILY_UNAVAILABLE: "Resume processing is temporarily unavailable. Please try again later.",
  UNKNOWN: "Resume processing failed. Please try again later.",
} as const;
export type ResumeFailureCode = keyof typeof RESUME_FAILURE_MESSAGES;

export function isInvalidExtractionResponse(error: unknown) {
  return error instanceof SyntaxError || (error !== null && typeof error === "object" &&
    "name" in error && error.name === "ZodError");
}

export function classifyResumeFailure(stage: ResumeProcessingStage, error: unknown): ResumeFailureCode {
  const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
  if (stage === "storage") return "STORAGE_UNAVAILABLE";
  if (stage === "parsing") return "INVALID_PDF";
  if (stage === "embedding") return "EMBEDDING_UNAVAILABLE";
  if (stage === "persistence") return "PERSISTENCE_UNAVAILABLE";
  if (status === 401 || status === 403 || status === 404) return "EXTRACTION_CONFIGURATION";
  if (status === 429) return "EXTRACTION_RATE_LIMITED";
  return isInvalidExtractionResponse(error) ? "EXTRACTION_INVALID_OUTPUT" : "EXTRACTION_REJECTED";
}

/** Field names and array indices only: never retain issue messages or input values. */
export function safeResumeIssuePaths(error: unknown): string[] {
  if (!error || typeof error !== "object" || !("issues" in error) || !Array.isArray(error.issues)) return [];
  const fields = new Set(["fullName", "email", "phone", "location", "summary", "skills", "experience", "company", "title", "startDate", "endDate", "isCurrent", "bullets", "education", "institution", "degree", "fieldOfStudy", "graduationYear", "projects", "name", "description", "technologies", "url", "linkedinUrl", "targetSeniority", "extractionWarnings"]);
  return error.issues.slice(0, 10).flatMap((issue: unknown) => {
    if (!issue || typeof issue !== "object" || !("path" in issue) || !Array.isArray(issue.path)) return [];
    return [issue.path.slice(0, 5).map((part: unknown) => typeof part === "string" && fields.has(part)
      ? part : typeof part === "number" && Number.isInteger(part) && part >= 0 && part <= 10000 ? String(part) : "$field").join(".") || "$root"];
  });
}

export function resumeFailureReason(code: ResumeFailureCode) { return `Resume processing failed [${code}].`; }

export function decodeResumeFailure(reason: unknown): ResumeFailureCode {
  for (const code of Object.keys(RESUME_FAILURE_MESSAGES) as ResumeFailureCode[]) {
    if (reason === resumeFailureReason(code)) return code;
  }
  return reason === "Resume processing temporarily unavailable." ? "TEMPORARILY_UNAVAILABLE" : "UNKNOWN";
}

export function resumeFailureMessage(code: unknown): string {
  return typeof code === "string" && Object.hasOwn(RESUME_FAILURE_MESSAGES, code)
    ? RESUME_FAILURE_MESSAGES[code as ResumeFailureCode] : RESUME_FAILURE_MESSAGES.UNKNOWN;
}

export function decodeResumeDiagnostic(line: unknown): ResumeFailureCode {
  if (typeof line !== "string") return "UNKNOWN";
  try {
    const data: unknown = JSON.parse(line);
    if (!data || typeof data !== "object" || !("event" in data) || data.event !== "resume_processing_failed" || !("code" in data)) return "UNKNOWN";
    return typeof data.code === "string" && Object.hasOwn(RESUME_FAILURE_MESSAGES, data.code)
      ? data.code as ResumeFailureCode : "UNKNOWN";
  } catch { return "UNKNOWN"; }
}
