import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { validatePdfUpload } from "../../lib/validations/upload";

/**
 * The public upload route is disabled until authenticated private access exists.
 * These references are opaque storage identifiers, not downloadable URLs.
 */
export async function uploadResumeFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string = "application/pdf"
): Promise<{ url: string; storageKey: string }> {
  if (!validatePdfUpload({ name: fileName, type: contentType, size: fileBuffer.byteLength }, fileBuffer)) {
    throw new Error("Only valid PDF files up to 10 MB can be staged.");
  }

  const storageKey = `resumes/${randomUUID()}.pdf`;
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;

  if (R2_PUBLIC_URL) throw new Error("Public resume storage is not permitted.");

  if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME) {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });
    await client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: storageKey, Body: fileBuffer, ContentType: "application/pdf" }));
    return { url: `r2://${R2_BUCKET_NAME}/${storageKey}`, storageKey };
  }

  // No silent fallback in production, test, or partially configured environments.
  if (process.env.NODE_ENV !== "development" || R2_ACCOUNT_ID || R2_ACCESS_KEY_ID || R2_SECRET_ACCESS_KEY || R2_BUCKET_NAME) {
    throw new Error("Private resume storage is not configured.");
  }

  // A fresh private temp directory prevents predictable paths and lives outside public/.
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "huntdeck-resume-"));
  await fs.writeFile(path.join(directory, path.basename(storageKey)), fileBuffer, { mode: 0o600, flag: "wx" });
  return { url: `local-staging://${path.basename(directory)}/${path.basename(storageKey)}`, storageKey };
}

// A bearer URL cannot be safely issued until session and ownership checks exist.
export async function generatePresignedUploadUrl(): Promise<never> {
  throw new Error("Resume uploads are temporarily unavailable.");
}
