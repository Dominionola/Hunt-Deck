import { it, mock } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { S3Client } from "@aws-sdk/client-s3";
import { UnrecoverableError, type Job } from "bullmq";
import type { Prisma } from "@prisma/client";
import { db } from "../../src/lib/db";
import { processQueuedResume } from "../../src/services/queue/resumeProcessor";
import { resumeJobId, type ResumeJobData, type ResumeJobResult } from "../../src/services/queue/resumeQueue";
import { clearAiTelemetry, getAiTelemetrySummary } from "../../src/services/ai/aiTelemetry";
import { parsePdfBuffer } from "../../src/services/parsing/resumeParser";

// Real parser input, generated entirely from synthetic text.
function syntheticPdf() {
  const text = "Synthetic Candidate - TypeScript Engineer - Example Test Company - Built synthetic verification tools.";
  const stream = `BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

it("processes a synthetic PDF with mocked storage, providers and database; replay keeps one record", async () => {
  const pdf = syntheticPdf();
  const owner = "synthetic_owner";
  const id = resumeJobId(owner, pdf);
  const hash = createHash("sha256").update(pdf).digest("hex");
  const progress: number[] = [];
  const job = { id, data: { userId: owner, storageKey: `resumes/${owner}/${hash}.pdf` }, updateProgress: async (value: number) => { progress.push(value); } } as unknown as Job<ResumeJobData, ResumeJobResult>;
  const saved = new Map<string, { userId: string }>();
  let vectorWrites = 0;
  const tx = {
    resume: {
      findUnique: async ({ where }: { where: { id: string } }) => saved.get(where.id) ?? null,
      count: async () => saved.size,
      upsert: async ({ where, create }: { where: { id: string }; create: { userId: string } }) => { saved.set(where.id, create); return create; },
    },
    $executeRaw: async () => { vectorWrites++; return 1; },
    $queryRaw: async () => [{ locked: 1 }],
  } as unknown as Prisma.TransactionClient;
  const originalTransaction = db.$transaction;
  db.$transaction = (async (callback: (client: Prisma.TransactionClient) => Promise<unknown>) => callback(tx)) as typeof db.$transaction;
  const storage = mock.method(S3Client.prototype, "send", async () => ({ Body: { transformToByteArray: async () => pdf }, ContentLength: pdf.length }));
  const originalFetch = globalThis.fetch;
  const variables = { R2_ACCOUNT_ID: "synthetic", R2_ACCESS_KEY_ID: "synthetic", R2_SECRET_ACCESS_KEY: "synthetic", R2_BUCKET_NAME: "synthetic-private", GROQ_API_KEY: "synthetic", CLOUDFLARE_ACCOUNT_ID: "synthetic", CLOUDFLARE_AI_API_TOKEN: "synthetic", R2_PUBLIC_URL: "" };
  const previous = Object.fromEntries(Object.keys(variables).map((key) => [key, process.env[key]]));
  Object.assign(process.env, variables);
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    calls.push(url);
    if (url.includes("api.groq.com")) return Response.json({ choices: [{ message: { content: JSON.stringify({ fullName: "Synthetic Candidate", skills: ["TypeScript"], experience: [], education: [], projects: [] }) } }], usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } });
    if (url.includes("api.cloudflare.com")) return Response.json({ result: { data: [new Array(1024).fill(0.03125)] } });
    throw new Error("Unexpected provider request.");
  };
  clearAiTelemetry();
  try {
    assert.match((await parsePdfBuffer(pdf)).text, /Synthetic Candidate/);
    assert.deepEqual(await processQueuedResume(job), { resumeId: `resume_${id}` });
    assert.deepEqual(await processQueuedResume(job), { resumeId: `resume_${id}` });
    assert.equal(saved.size, 1);
    assert.equal(vectorWrites, 2);
    assert.deepEqual(progress, [10, 35, 65, 85, 100, 10, 35, 65, 85, 100]);
    assert.equal(calls.length, 4);
    assert.equal(JSON.stringify(getAiTelemetrySummary()).includes("Synthetic Candidate"), false);
    assert.equal(JSON.stringify(job.data).includes("Synthetic Candidate"), false);

    await assert.rejects(processQueuedResume({ ...job, id: "a".repeat(64) } as typeof job), UnrecoverableError);
    assert.equal(calls.length, 4, "mismatched job/content must fail before AI calls");
    await assert.rejects(processQueuedResume({ ...job, data: { ...job.data, userId: "other" } } as typeof job), UnrecoverableError);
    assert.equal(calls.length, 4, "cross-owner reference must fail before AI calls");

    globalThis.fetch = async () => Response.json({ error: { message: "DO_NOT_LOG_SYNTHETIC_DOCUMENT" } }, { status: 503 });
    await assert.rejects(processQueuedResume(job), (error: unknown) => error instanceof Error && !(error instanceof UnrecoverableError) && error.message === "Resume processing temporarily unavailable.");
    globalThis.fetch = async () => Response.json({ error: { message: "DO_NOT_LOG_SYNTHETIC_DOCUMENT" } }, { status: 400 });
    await assert.rejects(processQueuedResume(job), (error: unknown) => error instanceof UnrecoverableError && !error.message.includes("DO_NOT_LOG"));
    assert.equal(JSON.stringify(getAiTelemetrySummary()).includes("DO_NOT_LOG"), false);
    const diagnostics: string[] = [];
    const loggedJob = { ...job, log: async (line: string) => { diagnostics.push(line); return diagnostics.length; } } as typeof job;
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: "INVALID_JSON_PRIVATE_CANARY" } }] });
    await assert.rejects(processQueuedResume(loggedJob), (error: unknown) => error instanceof Error && !(error instanceof UnrecoverableError) && error.message === "Resume processing temporarily unavailable.");
    assert.deepEqual(JSON.parse(diagnostics[0]), { event: "resume_processing_failed", stage: "extraction", code: "EXTRACTION_INVALID_OUTPUT" });
    assert.equal(diagnostics.join("").includes("CANARY"), false);
  } finally {
    db.$transaction = originalTransaction;
    storage.mock.restore();
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    clearAiTelemetry();
  }
});
