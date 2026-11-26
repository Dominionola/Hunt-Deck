import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { validatePdfUpload } from "../../lib/validations/upload";
import { createHash } from "crypto";
import { db } from "@/lib/db";

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

/** Store a validated upload in shared private storage for the worker. */
export async function stageResumeForWorker(userId: string, fileName: string, fileBuffer: Buffer): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId) || !validatePdfUpload({ name: fileName, type: "application/pdf", size: fileBuffer.length }, fileBuffer)) {
    throw new Error("Invalid resume upload.");
  }
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket || process.env.R2_PUBLIC_URL) throw new Error("Private shared resume storage is not configured.");
  const hash = createHash("sha256").update(fileBuffer).digest("hex");
  const key = `resumes/${userId}/${hash}.pdf`;
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: fileBuffer, ContentType: "application/pdf" }));
  return key;
}

export async function readStagedResume(userId: string, key: string): Promise<Buffer> {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId) || !key.startsWith(`resumes/${userId}/`) || !/^resumes\/[a-zA-Z0-9_-]+\/[a-f0-9]{64}\.pdf$/.test(key)) {
    throw new Error("Invalid resume storage reference.");
  }
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket || process.env.R2_PUBLIC_URL) throw new Error("Private shared resume storage is not configured.");
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body || (result.ContentLength !== undefined && result.ContentLength > 10 * 1024 * 1024)) throw new Error("Invalid staged resume.");
  const bytes = await result.Body.transformToByteArray();
  const buffer = Buffer.from(bytes);
  if (!validatePdfUpload({ name: "resume.pdf", type: "application/pdf", size: buffer.length }, buffer)) throw new Error("Invalid staged resume.");
  if (createHash("sha256").update(buffer).digest("hex") !== key.split("/").pop()?.slice(0, 64)) throw new Error("Invalid staged resume.");
  return buffer;
}

/** Delete an owner-scoped staged PDF from private R2 storage. */
export async function deleteStagedResume(userId: string, key: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId) || !key.startsWith(`resumes/${userId}/`) || !/^resumes\/[a-zA-Z0-9_-]+\/[a-f0-9]{64}\.pdf$/.test(key)) {
    throw new Error("Invalid resume storage reference.");
  }
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket || process.env.R2_PUBLIC_URL) throw new Error("Private shared resume storage is not configured.");
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function selectOrphanedStagedKeys(
  objects: ReadonlyArray<{ key?: string; lastModified?: Date }>,
  isReferenced: (key: string) => boolean,
  cutoff: Date,
  maxDelete: number,
): string[] {
  const selected: string[] = [];
  for (const obj of objects) {
    if (selected.length >= maxDelete) break;
    if (!obj.key || !/^resumes\/[a-zA-Z0-9_-]+\/[a-f0-9]{64}\.pdf$/.test(obj.key)) continue;
    if (!obj.lastModified || obj.lastModified.getTime() > cutoff.getTime()) continue;
    if (!isReferenced(obj.key)) selected.push(obj.key);
  }
  return selected;
}

/** Bounded cleanup of unreferenced staged PDFs older than `maxAgeHours`; never logs keys or user IDs. */
export async function cleanupOrphanedStagedResumes(options?: {
  maxAgeHours?: number;
  dryRun?: boolean;
  maxDelete?: number;
  isReferenced?: (key: string) => Promise<boolean>;
}): Promise<{ scanned: number; orphaned: number; deleted: number; dryRun: boolean }> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket || process.env.R2_PUBLIC_URL) throw new Error("Private shared resume storage is not configured.");

  const maxAgeHours = Math.max(1, Math.min(24 * 30, options?.maxAgeHours ?? 24));
  const dryRun = options?.dryRun ?? true;
  const maxDelete = Math.max(1, Math.min(500, Math.trunc(options?.maxDelete ?? 100)));
  const cutoff = new Date(Date.now() - maxAgeHours * 3600_000);

  const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "resumes/", MaxKeys: 500 }));
  const contents = list.Contents ?? [];
  const referenced = new Set<string>();
  for (const item of contents) {
    if (!item.Key || !/^resumes\/[a-zA-Z0-9_-]+\/[a-f0-9]{64}\.pdf$/.test(item.Key)) continue;
    const isRef = options?.isReferenced
      ? await options.isReferenced(item.Key)
      : Boolean(await db.resume.findFirst({ where: { originalFileUrl: `r2://${bucket}/${item.Key}` }, select: { id: true } }));
    if (isRef) referenced.add(item.Key);
  }

  const orphans = selectOrphanedStagedKeys(
    contents.map((item) => ({ key: item.Key, lastModified: item.LastModified })),
    (key) => referenced.has(key),
    cutoff,
    maxDelete,
  );

  let deleted = 0;
  if (!dryRun) {
    for (const key of orphans) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      deleted++;
    }
  }

  return { scanned: contents.length, orphaned: orphans.length, deleted, dryRun };
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
  storageKey: string,
  requestedExpirySeconds: number = 300,
): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
  // Ownership verification check: key must start with resumes/{userId}/
  const expectedPrefix = `resumes/${userId}/`;
  if (!storageKey.startsWith(expectedPrefix)) {
    throw new Error("Access denied: You do not have permission to access this document.");
  }

  const bucketName = process.env.R2_BUCKET_NAME || "huntdeck-resumes-private";
  const expiresInSeconds = Math.max(1, Math.min(300, Math.trunc(requestedExpirySeconds)));

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
