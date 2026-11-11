import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { validatePdfUpload } from "../../lib/validations/upload";

function getR2Client(): S3Client | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads a validated PDF file to private R2 storage scoped by user ID.
 */
export async function uploadResumeFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string = "application/pdf",
  userId: string = "default"
): Promise<{ url: string; storageKey: string }> {
  if (!validatePdfUpload({ name: fileName, type: contentType, size: fileBuffer.byteLength }, fileBuffer)) {
    throw new Error("Only valid PDF files up to 10 MB can be staged.");
  }

  const storageKey = `resumes/${userId}/${randomUUID()}.pdf`;
  const { R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;

  if (R2_PUBLIC_URL) {
    throw new Error("Public resume storage is not permitted.");
  }

  const client = getR2Client();
  if (client && R2_BUCKET_NAME) {
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: storageKey,
        Body: fileBuffer,
        ContentType: "application/pdf",
      })
    );
    return { url: `r2://${R2_BUCKET_NAME}/${storageKey}`, storageKey };
  }

  // No silent fallback in production environments
  if (process.env.NODE_ENV === "production") {
    throw new Error("Private R2 storage is not configured in production.");
  }

  // Isolated development storage outside public web roots
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "huntdeck-resume-"));
  await fs.writeFile(path.join(directory, path.basename(storageKey)), fileBuffer, { mode: 0o600, flag: "wx" });
  return { url: `local-staging://${path.basename(directory)}/${path.basename(storageKey)}`, storageKey };
}

/**
 * Generates an owner-authenticated short-lived presigned PUT URL for direct client upload.
 * Validates ownership scope: key must be prefixed with resumes/${userId}/
 */
export async function generatePresignedUploadUrl(
  userId: string,
  fileExtension: string = "pdf"
): Promise<{ uploadUrl: string; storageKey: string; expiresInSeconds: number }> {
  if (!userId || userId.trim().length === 0) {
    throw new Error("User authentication is required to generate upload credentials.");
  }

  const storageKey = `resumes/${userId}/${randomUUID()}.${fileExtension}`;
  const bucketName = process.env.R2_BUCKET_NAME || "huntdeck-resumes-private";
  const expiresInSeconds = 900; // 15 minutes

  const client = getR2Client();
  if (!client) {
    // Development local stub
    return {
      uploadUrl: `http://localhost:3000/api/resumes/upload?storageKey=${encodeURIComponent(storageKey)}`,
      storageKey,
      expiresInSeconds,
    };
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    ContentType: "application/pdf",
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  return { uploadUrl, storageKey, expiresInSeconds };
}

/**
 * Generates an owner-checked short-lived presigned GET URL for viewing or downloading.
 * Verifies that the requested key belongs strictly to the authenticated userId.
 */
export async function generatePresignedDownloadUrl(
  userId: string,
  storageKey: string
): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
  // Ownership verification check: key must start with resumes/{userId}/
  const expectedPrefix = `resumes/${userId}/`;
  if (!storageKey.startsWith(expectedPrefix)) {
    throw new Error("Access denied: You do not have permission to access this document.");
  }

  const bucketName = process.env.R2_BUCKET_NAME || "huntdeck-resumes-private";
  const expiresInSeconds = 300; // 5 minutes

  const client = getR2Client();
  if (!client) {
    return {
      downloadUrl: `http://localhost:3000/api/resumes/download?key=${encodeURIComponent(storageKey)}`,
      expiresInSeconds,
    };
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
  });

  const downloadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  return { downloadUrl, expiresInSeconds };
}
