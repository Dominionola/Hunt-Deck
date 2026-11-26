import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { it } from "node:test";

it("rehearses Cloudflare job_ingestion outbox, checkpoints, retries, admin auth, DLQ and rollback in isolated PostgreSQL", {
  skip: process.env.HUNTDECK_RUN_CLOUDFLARE_DATABASE_TEST !== "1", timeout: 60000,
}, async () => {
  const local = JSON.parse(readFileSync(".local-services/migration-rehearsal-private.json", "utf8")) as { password: string; port: number; container: string };
  assert.equal(local.container, "huntdeck-migration-rehearsal");
  assert.equal(local.port, 55439);
  const schema = `cf_ingest_test_${randomUUID().replaceAll("-", "")}`;
  process.env.DATABASE_URL = `postgresql://postgres:${encodeURIComponent(local.password)}@127.0.0.1:55439/postgres?schema=${schema}&connection_limit=8`;
  process.env.DIRECT_URL = process.env.DATABASE_URL;

  const { db } = await import("../../src/lib/db");
  const {
    createCloudflareJobIngestionJob,
    getCloudflareJobIngestionJobForOwner,
    publishCloudflareJobIngestionOutbox,
  } = await import("../../src/services/queue/cloudflareJobIngestionJobs");
  const { processCloudflareJobIngestionMessage } = await import("../../src/services/queue/cloudflareJobIngestionProcessor");
  const { handleCloudflareResumeQueueBatch } = await import("../../src/services/queue/cloudflareWorkerEntry");
  const { BoardRequestError } = await import("../../src/services/jobs/adapters/publicBoard");

  let created = false;
  try {
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    created = true;
    await db.$executeRawUnsafe(`CREATE TABLE users (id text PRIMARY KEY)`);
    await db.$executeRawUnsafe(`INSERT INTO users (id) VALUES ('admin_1'), ('user_1')`);
    for (const sql of readFileSync("prisma/drafts/cloudflare-job-ingestion.sql", "utf8").split(";").map((s) => s.trim()).filter(Boolean)) {
      await db.$executeRawUnsafe(sql);
    }

    const sources: Array<{ platform: "GREENHOUSE" | "LEVER" | "ASHBY"; board: string }> = [{ platform: "GREENHOUSE", board: "moniepoint" }];
    const jobId = createHash("sha256").update(JSON.stringify({ userId: "admin_1", sources })).digest("hex");

    // 1. Concurrent creation -> 1 outbox record & publish
    await Promise.all(Array.from({ length: 6 }, () => createCloudflareJobIngestionJob(jobId, "admin_1", sources)));
    const outbox = await db.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM cloudflare_job_ingestion_outbox WHERE job_id = ${jobId}`;
    assert.equal(outbox[0].count, 1);

    assert.equal(await publishCloudflareJobIngestionOutbox(async (msg) => {
      assert.deepEqual(msg, { version: 1, kind: "job_ingestion", jobId });
    }), "published");
    assert.equal(await publishCloudflareJobIngestionOutbox(async () => {}), "empty");

    // 2. Owner isolation
    assert.equal(await getCloudflareJobIngestionJobForOwner(jobId, "user_1"), null);
    assert.equal((await getCloudflareJobIngestionJobForOwner(jobId, "admin_1"))?.state, "queued");

    // 3. Batch 1 saves checkpoint at offset 200; batch 2 hits transient error -> retries and completes from checkpoint
    let calls = 0;
    const offsetsSeen: number[] = [];
    const deps = {
      authorized: async (userId: string) => userId === "admin_1",
      allowSource: async () => true,
      fetchBoard: async (_source: { platform: "GREENHOUSE" | "LEVER" | "ASHBY"; board: string }, _fetcher?: typeof fetch, offset = 0) => {
        calls++;
        offsetsSeen.push(offset);
        if (calls === 2) throw new BoardRequestError(true);
        if (offset === 0) {
          return {
            fetched: 200,
            selected: 200,
            invalid: 0,
            incomplete: true,
            nextOffset: 200,
            jobs: [{
              title: "Engineer",
              company: "Synthetic Co",
              location: "Remote",
              remoteType: "REMOTE_ONLY" as const,
              description: "Synthetic role",
              requirements: ["TypeScript"],
              applicationUrl: "https://boards.greenhouse.io/synthetic/jobs/1",
              atsPlatform: "GREENHOUSE" as const,
              sourceBoard: "moniepoint",
              externalId: "1",
              postedAt: new Date(),
            }],
          };
        }
        return {
          fetched: 10,
          selected: 10,
          invalid: 0,
          incomplete: false,
          nextOffset: null,
          jobs: [],
        };
      },
      persist: async () => ({ id: "job_1", embedded: true }),
    };

    const firstOutcome = await processCloudflareJobIngestionMessage({ version: 1, kind: "job_ingestion", jobId }, deps);
    assert.equal(firstOutcome, "retry");
    const mid = await getCloudflareJobIngestionJobForOwner(jobId, "admin_1");
    assert.equal(mid?.state, "queued");
    assert.equal(mid?.checkpoint?.offset, 200);

    const acked: string[] = [];
    await handleCloudflareResumeQueueBatch(
      {
        queue: "huntdeck-resume-jobs",
        messages: [{ body: { version: 1, kind: "job_ingestion", jobId }, ack: () => acked.push(jobId), retry: () => {} }],
      },
      {},
      undefined,
      deps,
    );
    assert.deepEqual(acked, [jobId]);
    assert.deepEqual(offsetsSeen, [0, 200, 200]);
    const done = await getCloudflareJobIngestionJobForOwner(jobId, "admin_1");
    assert.equal(done?.state, "completed");
    assert.equal(done?.counts?.saved, 1);
    assert.equal(done?.counts?.embedded, 1);

    // 4. Non-admin fails permanently without retrying
    const nonAdminId = createHash("sha256").update("non_admin").digest("hex");
    await createCloudflareJobIngestionJob(nonAdminId, "user_1", sources);
    const nonAdminOutcome = await processCloudflareJobIngestionMessage({ version: 1, kind: "job_ingestion", jobId: nonAdminId }, deps);
    assert.equal(nonAdminOutcome, "settled");
    assert.equal((await getCloudflareJobIngestionJobForOwner(nonAdminId, "user_1"))?.failure_code, "UNAUTHORIZED");

    // 5. RLS & rollback
    const security = await db.$queryRaw<{ relrowsecurity: boolean }[]>`SELECT relrowsecurity FROM pg_class WHERE oid = 'cloudflare_job_ingestion_jobs'::regclass`;
    assert.equal(security[0].relrowsecurity, true);
    for (const sql of readFileSync("prisma/drafts/cloudflare-job-ingestion-rollback.sql", "utf8").split(";").map((s) => s.trim()).filter(Boolean)) {
      await db.$executeRawUnsafe(sql);
    }
    const tables = await db.$queryRaw<{ present: string | null }[]>`SELECT to_regclass('cloudflare_job_ingestion_jobs')::text AS present`;
    assert.equal(tables[0].present, null);
  } finally {
    if (created) await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await db.$disconnect();
  }
});
