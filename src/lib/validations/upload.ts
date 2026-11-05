import { z } from "zod";

export const MAX_RESUME_BYTES = 10 * 1024 * 1024;

const pdfMetadataSchema = z.object({
  name: z.string().min(1).max(255).refine((name) => /\.pdf$/i.test(name)),
  type: z.literal("application/pdf"),
  size: z.number().int().positive().max(MAX_RESUME_BYTES),
});

/** Check server-observed bytes as well as metadata. A parser must still validate the file. */
export function validatePdfUpload(file: { name: string; type: string; size: number }, bytes: Uint8Array): boolean {
  if (!pdfMetadataSchema.safeParse(file).success || file.size !== bytes.byteLength) return false;
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  return bytes.byteLength >= signature.length && signature.every((value, index) => bytes[index] === value);
}
