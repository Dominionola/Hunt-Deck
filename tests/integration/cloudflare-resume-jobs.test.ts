import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { generateMockBgeM3Embedding } from "../../src/services/ai/cloudflareEmbeddingService";

function sha256(userId: string, bytes: Uint8Array): string {
  return createHash("sha256").update(userId).update("\0").update(bytes).digest("hex");
}

it("rehearses owner isolation, concurrent creation, leases, retries, DLQ, persistence and rollback in isolated PostgreSQL", {
  skip: process.env.HUNTDECK_RUN_CLOUDFLARE_DATABASE_TEST !== "1", timeout: 60000,
}, async () => {
  const local = JSON.parse(readFileSync(".local-services/migration-rehearsal-private.json", "utf8")) as { password: string; port: number; container: string };
  assert.equal(local.container, "huntdeck-migration-rehearsal");
  assert.equal(local.port, 55439);
  const schema = `cf_resume_test_${randomUUID().replaceAll("-", "")}`;
  assert.match(schema, /^cf_resume_test_[a-f0-9]{32}$/);
  process.env.DATABASE_URL = `postgresql://postgres:${encodeURIComponent(local.password)}@127.0.0.1:55439/postgres?schema=${schema}&connection_limit=8`;
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  const { db } = await import("../../src/lib/db");
  const {
    createCloudflareResumeJob,
    getCloudflareResumeJobForOwner,
    claimCloudflareResumeJob,
    completeCloudflareResumeJob,
    publishCloudflareResumeOutbox,
    retryFailedCloudflareResumeJob,
  } = await import("../../src/services/queue/cloudflareResumeJobs");
  const {
    consumeCloudflareResumeBatch,
    consumeCloudflareResumeDeadLetterBatch,
    processCloudflareResumeMessage,
  } = await import("../../src/services/queue/cloudflareResumeProcessor");

  let created = false;
  try {
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    created = true;
    await db.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public`);
    await db.$executeRawUnsafe(`CREATE TABLE users (id text PRIMARY KEY)`);
    await db.$executeRawUnsafe(`CREATE TABLE resumes (
      id text PRIMARY KEY,
      "userId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title text NOT NULL DEFAULT 'Master Resume',
      "originalFileUrl" text NOT NULL,
      "extractedText" text NOT NULL,
      "parsedData" jsonb NOT NULL,
      "embedding1024" public.vector(1024),
      "embeddingModel" varchar(100),
      "embeddingVersion" varchar(50),
      "contentHash" varchar(64),
      "embeddedAt" timestamptz(6),
      "atsScore" integer,
      "isPrimary" boolean NOT NULL DEFAULT false,
      "createdAt" timestamptz(6) NOT NULL DEFAULT now(),
      "updatedAt" timestamptz(6) NOT NULL DEFAULT now()
    )`);
    await db.$executeRawUnsafe(`CREATE TABLE synthetic_results (owner_id text NOT NULL)`);
    await db.$executeRawUnsafe(`INSERT INTO users (id) VALUES ('owner_a'), ('owner_b')`);
    for (const sql of readFileSync("prisma/drafts/cloudflare-resume-jobs.sql", "utf8").split(";").map((item) => item.trim()).filter(Boolean)) {
      await db.$executeRawUnsafe(sql);
    }

    // 1. Concurrent duplicate creation, outbox publish & lease recovery
    const pdfA = Buffer.from("%PDF-1.4\nSynthetic resume A");
    const idA = sha256("owner_a", pdfA);
    const keyA = `resumes/owner_a/${createHash("sha256").update(pdfA).digest("hex")}.pdf`;
    await Promise.all(Array.from({ length: 12 }, () => createCloudflareResumeJob(idA, "owner_a", keyA)));
    const outbox = await db.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM cloudflare_resume_outbox WHERE job_id = ${idA}`;
    assert.equal(outbox[0].count, 1, "Concurrent submissions must create one outbox record");

    await assert.rejects(publishCloudflareResumeOutbox(async () => { throw new Error("Synthetic queue outage"); }));
    const failedOutbox = await db.$queryRaw<{ publish_attempts: number; last_error_code: string | null }[]>`
      SELECT publish_attempts, last_error_code FROM cloudflare_resume_outbox WHERE job_id = ${idA}`;
    assert.equal(failedOutbox[0].publish_attempts, 1);
    assert.equal(failedOutbox[0].last_error_code, "QUEUE_PUBLISH_FAILED");
    await db.$executeRaw`UPDATE cloudflare_resume_outbox SET lease_token = ${randomUUID()}::uuid, lease_until = now() + interval '1 minute' WHERE job_id = ${idA}`;
    assert.equal(await publishCloudflareResumeOutbox(async () => { throw new Error("Unexpired lease must prevent another publish"); }), "empty");
    await db.$executeRaw`UPDATE cloudflare_resume_outbox SET lease_until = now() - interval '1 second' WHERE job_id = ${idA}`;
    assert.equal(await publishCloudflareResumeOutbox(async (message) => {
      assert.deepEqual(message, { version: 1, kind: "resume", jobId: idA });
    }), "published");
    assert.equal(await publishCloudflareResumeOutbox(async () => { throw new Error("Published job must not be resent"); }), "empty");

    // 2. Owner isolation & conflicting reference rejection
    assert.equal((await getCloudflareResumeJobForOwner(idA, "owner_a"))?.state, "queued");
    assert.equal(await getCloudflareResumeJobForOwner(idA, "owner_b"), null);
    await assert.rejects(createCloudflareResumeJob(idA, "owner_b", `resumes/owner_b/${"b".repeat(64)}.pdf`), /conflict/);

    // 3. Concurrent claims, expired lease recovery & stale-worker fencing
    const claims = await Promise.all(Array.from({ length: 12 }, () => claimCloudflareResumeJob(idA)));
    const first = claims.find((claim) => claim !== null);
    assert.ok(first);
    assert.equal(claims.filter(Boolean).length, 1);
    await db.$executeRaw`UPDATE cloudflare_resume_jobs SET lease_until = now() - interval '1 second' WHERE id = ${idA}`;
    const recovered = await claimCloudflareResumeJob(idA);
    assert.ok(recovered);
    assert.equal(recovered.attempts, 2);
    assert.notEqual(recovered.lease_token, first.lease_token);
    let writes = 0;
    assert.equal(await completeCloudflareResumeJob(idA, first.lease_token, async () => { writes++; }), false);
    assert.equal(writes, 0, "A stale worker must not persist a result");

    // 4. Persistence rollback leaves job processing and synthetic_results empty
    await assert.rejects(completeCloudflareResumeJob(idA, recovered.lease_token, async (tx) => {
      await tx.$executeRaw`INSERT INTO synthetic_results (owner_id) VALUES ('owner_a')`;
      throw new Error("Synthetic persistence failure");
    }));
    const rolledBack = await db.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM synthetic_results`;
    assert.equal(rolledBack[0].count, 0);
    assert.equal((await getCloudflareResumeJobForOwner(idA, "owner_a"))?.state, "processing");

    // 5. Complete job & reject duplicate completion
    assert.equal(await completeCloudflareResumeJob(idA, recovered.lease_token, async (_tx, owner) => {
      assert.equal(owner, "owner_a");
      writes++;
    }), true);
    assert.equal((await getCloudflareResumeJobForOwner(idA, "owner_a"))?.state, "completed");
    assert.equal(await completeCloudflareResumeJob(idA, recovered.lease_token, async () => { writes++; }), false);
    assert.equal(writes, 1, "A completed job cannot be persisted twice");

    // 6. Full consumer pipeline with synthetic PDF & mocked providers
    const pdfB = Buffer.from("%PDF-1.4\nSynthetic resume B");
    const idB = sha256("owner_a", pdfB);
    const keyB = `resumes/owner_a/${createHash("sha256").update(pdfB).digest("hex")}.pdf`;
    await createCloudflareResumeJob(idB, "owner_a", keyB);
    const acked: string[] = [];
    const retried: string[] = [];
    await consumeCloudflareResumeBatch(
      [{ body: { version: 1, kind: "resume", jobId: idB }, ack: () => acked.push(idB), retry: () => retried.push(idB) }],
      {
        readStagedResume: async () => pdfB,
        parsePdfBuffer: async () => ({ text: "Synthetic engineer experience", pageCount: 1 }),
        extractResumeEntities: async () => ({
          fullName: "Synthetic Candidate",
          email: "synthetic@example.com",
          phone: "",
          location: "",
          summary: "",
          skills: ["TypeScript"],
          experience: [],
          education: [],
          projects: [],
        }),
        generateEmbedding: async (text) => generateMockBgeM3Embedding(text),
        r2BucketName: "huntdeck-resumes-dev",
      },
    );
    assert.deepEqual(acked, [idB]);
    assert.deepEqual(retried, []);
    const jobB = await getCloudflareResumeJobForOwner(idB, "owner_a");
    assert.equal(jobB?.state, "completed");
    assert.equal(jobB?.progress, 100);
    const persisted = await db.resume.findUnique({ where: { id: `resume_${idB}` }, select: { userId: true, isPrimary: true } });
    assert.equal(persisted?.userId, "owner_a");
    assert.equal(persisted?.isPrimary, true);

    // 7. Bounded transient retries -> exhaustion -> dead-letter & explicit retry
    const pdfC = Buffer.from("%PDF-1.4\nSynthetic resume C");
    const idC = sha256("owner_b", pdfC);
    const keyC = `resumes/owner_b/${createHash("sha256").update(pdfC).digest("hex")}.pdf`;
    await createCloudflareResumeJob(idC, "owner_b", keyC);
    const transientDeps = {
      readStagedResume: async () => pdfC,
      parsePdfBuffer: async () => ({ text: "Synthetic text", pageCount: 1 }),
      extractResumeEntities: async () => {
        throw Object.assign(new Error("Synthetic 429"), { status: 429 });
      },
      generateEmbedding: async (text: string) => generateMockBgeM3Embedding(text),
    };
    assert.equal(await processCloudflareResumeMessage({ version: 1, kind: "resume", jobId: idC }, transientDeps), "retry");
    assert.equal((await getCloudflareResumeJobForOwner(idC, "owner_b"))?.attempts, 1);
    assert.equal(await processCloudflareResumeMessage({ version: 1, kind: "resume", jobId: idC }, transientDeps), "retry");
    assert.equal((await getCloudflareResumeJobForOwner(idC, "owner_b"))?.attempts, 2);
    assert.equal(await processCloudflareResumeMessage({ version: 1, kind: "resume", jobId: idC }, transientDeps), "settled");
    const failedC = await getCloudflareResumeJobForOwner(idC, "owner_b");
    assert.equal(failedC?.state, "failed");
    assert.equal(failedC?.attempts, 3);
    assert.equal(failedC?.failure_code, "EXTRACTION_RATE_LIMITED");
    assert.ok(failedC?.dead_lettered_at);

    // 8. DLQ handler must not overwrite completed jobs
    const dlqAcked: string[] = [];
    await consumeCloudflareResumeDeadLetterBatch([
      { body: { version: 1, kind: "resume", jobId: idB }, ack: () => dlqAcked.push(idB), retry: () => {} },
    ]);
    assert.deepEqual(dlqAcked, [idB]);
    assert.equal((await getCloudflareResumeJobForOwner(idB, "owner_a"))?.state, "completed");

    // 9. Explicit retry of failed job resets state & outbox
    const requeued = await retryFailedCloudflareResumeJob(idC, "owner_b", keyC);
    assert.equal(requeued?.state, "queued");
    assert.equal(requeued?.attempts, 0);

    // 10. RLS & rollback
    const security = await db.$queryRaw<{ relrowsecurity: boolean }[]>`SELECT relrowsecurity FROM pg_class WHERE oid = 'cloudflare_resume_jobs'::regclass`;
    assert.equal(security[0].relrowsecurity, true);
    for (const sql of readFileSync("prisma/drafts/cloudflare-resume-jobs-rollback.sql", "utf8").split(";").map((item) => item.trim()).filter(Boolean)) {
      await db.$executeRawUnsafe(sql);
    }
    const tables = await db.$queryRaw<{ present: string | null }[]>`SELECT to_regclass('cloudflare_resume_jobs')::text AS present`;
    assert.equal(tables[0].present, null);
  } finally {
    if (created) await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await db.$disconnect();
  }
});
