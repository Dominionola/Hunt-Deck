import { it, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Queue, QueueEvents, Worker, type Job } from "bullmq";
import { syntheticResumePdf, syntheticOnboardingPdf } from "../fixtures/syntheticResume";
import { redisConnectionOptions, resumeJobId, RESUME_JOB_OPTIONS, type ResumeJobData, type ResumeJobResult } from "../../src/services/queue/resumeQueue";
import { stageResumeForWorker } from "../../src/services/storage/r2Service";

const live = process.env.HUNTDECK_LIVE_PROVIDERS === "1";
const hosted = process.env.HUNTDECK_HOSTED_DATABASE === "1";
it(`persists concurrent synthetic worker jobs through real Redis/${hosted ? "hosted" : "local"} PostgreSQL and ${live ? "live R2/Groq/Workers AI" : "mocked R2/AI"}`, { skip: process.env.HUNTDECK_RUN_PERSISTENCE_TESTS !== "1", timeout: live ? 180000 : 60000 }, async () => {
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  if (hosted) {
    assert.equal(live, true, "Hosted verification requires explicit live-provider opt-in.");
    const plan = JSON.parse(readFileSync(".local-services/hosted-bge-plan.json", "utf8")) as { target: string; applied: boolean };
    assert.equal(plan.target, "jeufaeryqcvblejxfanq"); assert.equal(plan.applied, true);
    for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
      const url = new URL(process.env[name] ?? "");
      assert.ok(url.hostname === `db.${plan.target}.supabase.co` || (url.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(url.username) === `postgres.${plan.target}`));
      assert.equal(url.pathname, "/postgres");
    }
  } else {
    const local = JSON.parse(readFileSync(".local-services/migration-rehearsal-private.json", "utf8")) as { password: string; port: number; container: string };
    const rehearsal = JSON.parse(readFileSync(".local-services/migration-rehearsal-result.json", "utf8")) as { complete: boolean; database: string };
    assert.equal(local.container, "huntdeck-migration-rehearsal");
    assert.equal(local.port, 55439);
    assert.equal(rehearsal.complete, true);
    assert.match(rehearsal.database, /^huntdeck_recovery_[0-9]+$/);
    const localUrl = `postgresql://postgres:${local.password}@127.0.0.1:55439/${rehearsal.database}?schema=public`;
    process.env.DATABASE_URL = localUrl;
    process.env.DIRECT_URL = localUrl;
  }
  if (live) {
    assert.equal(process.env.R2_ACCOUNT_ID, "093d489fa9bb46a82db650872b75b57e");
    assert.equal(process.env.R2_BUCKET_NAME, "huntdeck-resumes-dev");
    assert.equal(process.env.CLOUDFLARE_ACCOUNT_ID, process.env.R2_ACCOUNT_ID);
    assert.ok(!process.env.R2_PUBLIC_URL);
    assert.ok(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.GROQ_API_KEY && process.env.CLOUDFLARE_AI_API_TOKEN);
    assert.equal(process.env.CLOUDFLARE_EMBEDDING_MODEL || "@cf/baai/bge-m3", "@cf/baai/bge-m3");
    assert.equal(process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1", "https://api.groq.com/openai/v1");
  } else {
    Object.assign(process.env, { R2_ACCOUNT_ID: "synthetic", R2_ACCESS_KEY_ID: "synthetic", R2_SECRET_ACCESS_KEY: "synthetic", R2_BUCKET_NAME: "synthetic-private", R2_PUBLIC_URL: "", GROQ_API_KEY: "synthetic", GROQ_BASE_URL: "https://api.groq.com/openai/v1", CLOUDFLARE_ACCOUNT_ID: "synthetic", CLOUDFLARE_AI_API_TOKEN: "synthetic", CLOUDFLARE_EMBEDDING_MODEL: "synthetic-test-embedding", CLOUDFLARE_EMBEDDING_VERSION: "1" });
  }
  const redisUrl = new URL(process.env.REDIS_URL ?? "");
  assert.equal(redisUrl.hostname, "127.0.0.1");
  assert.equal(redisUrl.port, "16379");
  // Import Prisma only AFTER forcing the private local datasource.
  const { db } = await import("../../src/lib/db");
  const { processQueuedResume } = await import("../../src/services/queue/resumeProcessor");
  const owner = `synthetic_${randomUUID()}`;
  const other = `synthetic_${randomUUID()}`;
  const objects = new Map<string, Buffer>();
  const inputs = [[owner, live ? syntheticOnboardingPdf() : syntheticResumePdf("first")], [owner, syntheticResumePdf("second")], [other, syntheticResumePdf("first")]] as const;
  const connection = redisConnectionOptions(true);
  const name = `huntdeck-synthetic-${randomUUID()}`;
  const queue = new Queue<ResumeJobData, ResumeJobResult>(name, { connection });
  const events = new QueueEvents(name, { connection });
  queue.on("error", () => {});
  events.on("error", () => {});
  let worker: Worker<ResumeJobData, ResumeJobResult> | undefined;
  const storage = live ? undefined : mock.method(S3Client.prototype, "send", async (command: unknown) => {
    const key = (command as { input: { Key: string } }).input.Key;
    const bytes = objects.get(key);
    assert.ok(bytes, "only synthetic storage keys may be read");
    return { Body: { transformToByteArray: async () => bytes }, ContentLength: bytes.length };
  });
  const originalFetch = globalThis.fetch;
  if (!live) globalThis.fetch = async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes("api.groq.com")) return Response.json({ choices: [{ message: { content: JSON.stringify({ fullName: "Synthetic Candidate", skills: ["TypeScript"], experience: [], education: [], projects: [] }) } }] });
    if (url.includes("api.cloudflare.com")) return Response.json({ result: { data: [new Array(1024).fill(0.03125)] } });
    throw new Error("External provider calls are disabled in this synthetic test.");
  };
  const stagedKeys: string[] = [];
  try {
    await db.user.createMany({ data: [owner, other].map((id) => ({ id, email: `${id}@example.invalid` })) });
    await events.waitUntilReady();
    const jobs: Job<ResumeJobData, ResumeJobResult>[] = [];
    for (const [userId, bytes] of inputs) {
      const storageKey = `resumes/${userId}/${createHash("sha256").update(bytes).digest("hex")}.pdf`;
      if (live) {
        stagedKeys.push(storageKey);
        assert.equal(await stageResumeForWorker(userId, "synthetic.pdf", bytes), storageKey);
      } else objects.set(storageKey, bytes);
      jobs.push(await queue.add("process", { userId, storageKey }, { ...RESUME_JOB_OPTIONS, jobId: resumeJobId(userId, bytes) }));
    }
    await Promise.all(Array.from({ length: 8 }, () => queue.add("process", jobs[0].data, { ...RESUME_JOB_OPTIONS, jobId: jobs[0].id })));
    worker = new Worker<ResumeJobData, ResumeJobResult>(name, processQueuedResume, { connection, concurrency: 2 });
    worker.on("error", () => {});
    await Promise.all(jobs.map((job) => job.waitUntilFinished(events, live ? 120000 : 30000)));
    assert.equal(await db.resume.count({ where: { userId: owner } }), 2);
    assert.equal(await db.resume.count({ where: { userId: owner, isPrimary: true } }), 1);
    assert.equal(await db.resume.count({ where: { userId: other } }), 1);
    const id = `resume_${jobs[0].id}`;
    assert.equal(await db.resume.findFirst({ where: { id, userId: other } }), null);
    const vectors = await db.$queryRaw<Array<{ legacy: boolean; dimensions: number; model: string; version: string }>>`SELECT embedding IS NULL AS legacy, vector_dims("embedding1024") AS dimensions, "embeddingModel" AS model, "embeddingVersion" AS version FROM resumes WHERE "userId" IN (${owner}, ${other})`;
    assert.equal(vectors.length, 3);
    const expectedModel = live ? "@cf/baai/bge-m3" : "synthetic-test-embedding";
    const expectedVersion = live ? process.env.CLOUDFLARE_EMBEDDING_VERSION || "1.0" : "1";
    assert.ok(vectors.every((row) => row.legacy && row.dimensions === 1024 && row.model === expectedModel && row.version === expectedVersion));
    const data = jobs[0].data;
    const jobId = jobs[0].id;
    await jobs[0].remove();
    const replay = await queue.add("process", data, { ...RESUME_JOB_OPTIONS, jobId });
    await replay.waitUntilFinished(events, live ? 60000 : 30000);
    assert.equal(await db.resume.count({ where: { userId: owner } }), 2);
    assert.equal(await db.resume.count({ where: { userId: owner, isPrimary: true } }), 1);
    if (live) {
      const { persistOnboarding, OnboardingResumeUnavailable } = await import("../../src/services/onboarding/onboardingService");
      const { resumeParsedDataSchema } = await import("../../src/lib/validations/resume");
      const { completeOnboardingSchema } = await import("../../src/lib/validations/onboarding");
      const imported = await db.resume.findUniqueOrThrow({ where: { id } });
      const parsed = resumeParsedDataSchema.parse(imported.parsedData);
      assert.equal(parsed.fullName, "Morgan Synthetic");
      assert.equal(parsed.email, "morgan@example.invalid");
      assert.ok(parsed.phone?.includes("555"));
      assert.match(parsed.location || "", /Lagos/i);
      for (const skill of ["Python", "SQL", "Docker"]) assert.ok(parsed.skills.includes(skill));
      assert.ok(parsed.experience.some((role) => role.company === "Example Test Labs" && role.title === "Data Engineer" && role.isCurrent && role.startDate.includes("2022") && role.bullets.some((bullet) => bullet.includes("12"))));
      assert.ok(parsed.education.some((item) => item.institution === "Example College" && item.graduationYear === "2021"));
      assert.ok(parsed.projects.some((project) => project.name === "Synthetic Data Tool"));
      const payload = completeOnboardingSchema.parse({
        importData: { resumeFileId: id, linkedinUrl: "https://www.linkedin.com/in/morgan-synthetic" },
        skillsData: { skills: ["Python", "SQL", "Docker"].map((name) => ({ name, category: "Domains", isVerified: true })) },
        targetsData: { targetTitles: ["Data Engineer"], workArrangement: "HYBRID", preferredLocations: ["Lagos"], seniorityLevel: "MID", minSalary: 0 },
      });
      const user = { id: owner, name: null, email: `${owner}@example.invalid` };
      await assert.rejects(persistOnboarding({ ...user, id: other }, payload), OnboardingResumeUnavailable);
      assert.equal(await db.profile.findUnique({ where: { userId: other } }), null);
      await Promise.all(Array.from({ length: 4 }, () => persistOnboarding(user, payload)));
      const saved = await db.resume.findUniqueOrThrow({ where: { id } });
      const savedData = resumeParsedDataSchema.parse(saved.parsedData);
      assert.deepEqual(savedData.experience, parsed.experience);
      assert.deepEqual(savedData.education, parsed.education);
      assert.deepEqual(savedData.projects, parsed.projects);
      assert.equal(savedData.linkedinUrl, payload.importData.linkedinUrl);
      assert.deepEqual(savedData.skills, ["Python", "SQL", "Docker"]);
      assert.equal(saved.atsScore, null);
      assert.equal(saved.originalFileUrl, imported.originalFileUrl);
      assert.equal(saved.extractedText, imported.extractedText);
      const profile = await db.profile.findUniqueOrThrow({ where: { userId: owner } });
      assert.equal(profile.remotePreference, "HYBRID"); assert.equal(profile.minSalary, 0);
      assert.equal(profile.experienceYears, null); assert.equal(profile.maxSalary, null);
      assert.equal(await db.resume.count({ where: { userId: owner, isPrimary: true } }), 1);
      const scratch = { ...payload, importData: { ...payload.importData, isScratchMode: true } };
      await Promise.all([persistOnboarding(user, scratch), persistOnboarding(user, scratch)]);
      assert.equal(await db.resume.count({ where: { userId: owner, originalFileUrl: "scratch" } }), 1);
      assert.equal(await db.resume.count({ where: { userId: owner, isPrimary: true } }), 1);
      console.log("Onboarding extraction and persistence passed: synthetic contact, skills, role, dates, achievement, education and project facts; LinkedIn reference; cross-user denial; concurrent completion; scratch replay. No LinkedIn network import or hosted Auth browser was exercised.");
    }
    console.log(live ? `Live worker check passed with real Redis, private R2, Groq, Workers AI and ${hosted ? "hosted" : "local"} PostgreSQL: three synthetic PDFs, concurrent ownership, duplicate enqueue, replay, one primary and 1024 BGE vectors. Authenticated HTTP was not exercised by this persistence test.` : "Observed actual local worker persistence: three generated PDFs, concurrent owner uploads, eight duplicate enqueues, owner-scoped reads, replay idempotency, one primary resume, and separate 1024 synthetic vectors. R2/AI and HTTP identity were mocked or not exercised.");
  } finally {
    await worker?.close();
    await queue.obliterate({ force: true });
    await queue.close();
    await events.close();
    storage?.mock.restore();
    globalThis.fetch = originalFetch;
    await db.resume.deleteMany({ where: { userId: { in: [owner, other] } } });
    await db.user.deleteMany({ where: { id: { in: [owner, other] } } });
    await db.$disconnect();
    if (live) {
      const client = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! }, maxAttempts: 1 });
      try {
        for (const key of stagedKeys) await client.send(new DeleteObjectCommand({ Bucket: "huntdeck-resumes-dev", Key: key }));
      } catch {
        throw new Error("Synthetic R2 cleanup failed; raw storage errors withheld.");
      } finally { client.destroy(); }
    }
  }
});
