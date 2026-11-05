import { extractText } from "unpdf";

export interface ParsedResumeDocument {
  text: string;
  pageCount: number;
  info?: Record<string, unknown>;
}

/**
 * Normalizes raw text by cleaning non-standard bullet characters,
 * excessive line breaks, and whitespace artifacts common in PDF extractions.
 */
export function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "\n• ") // Standardize bullets
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extracts plain text and layout metadata from a PDF buffer.
 */
export async function parsePdfBuffer(buffer: Buffer | Uint8Array): Promise<ParsedResumeDocument> {
  const { text, totalPages } = await extractText(buffer, { mergePages: true });

  const normalized = normalizeExtractedText(Array.isArray(text) ? text.join("\n") : (text || ""));

  return {
    text: normalized,
    pageCount: totalPages ?? 1,
  };
}

/**
 * Validates resume file MIME type and magic numbers.
 */
export function validateResumeFile(file: {
  size: number;
  type: string;
  name: string;
}): { valid: boolean; error?: string } {
  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: "File exceeds 10MB maximum limit." };
  }

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
  ];

  const allowedExtensions = [".pdf", ".docx", ".doc", ".txt"];
  const hasValidExt = allowedExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!allowedTypes.includes(file.type) && !hasValidExt) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload a PDF, DOCX, or TXT file.",
    };
  }

  return { valid: true };
}
