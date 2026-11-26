import { it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { loadEnvConfig } from "@next/env";

it("fences source observations and rejects unstable snapshots in isolated PostgreSQL", { skip: process.env.HUNTDECK_RUN_SOURCE_DATABASE_TEST !== "1", timeout: 60000 }, async () => {
  loadEnvConfig(process.cwd());
  const local = JSON.parse(readFileSync(".local-services/migration-rehearsal-private.json", "utf8")) as { password: string; port: number; container: string };
  const rehearsal = JSON.parse(readFileSync(".local-services/migration-rehearsal-result.json", "utf8")) as { complete: boolean; database: string };
  assert.equal(local.container, "huntdeck-migration-rehearsal"); assert.equal(local.port, 55439);
  assert.equal(rehearsal.complete, true); assert.match(rehearsal.database, /^huntdeck_recovery_\d+$/);
  const schema = `source_test_${randomUUID().replaceAll("-", "")}`;
  assert.match(schema, /^source_test_[a-f0-9]{32}$/);
  // The restored rehearsal database is owned by supabase_admin; the postgres
  // maintenance database permits a temporary schema without changing its ACLs.
  process.env.DATABASE_URL = `postgresql://postgres:${encodeURIComponent(local.password)}@127.0.0.1:55439/postgres?schema=${schema}&connection_limit=4`;
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  const { db } = await import("../../src/lib/db");
  const { getJobs } = await import("../../src/services/db/jobService");
  const { jobQuerySchema } = await import("../../src/lib/validations/job");
  const { visibleSourcePredicate } = await import("../../src/services/jobs/sourceVisibility");
  const { approveSource, disableSource, dispatchApprovedSources, isScheduledSourceApproved } = await import("../../src/services/jobs/approvedSources");
  const { scheduledIngestionJobId } = await import("../../src/services/queue/jobIngestionQueue");
  const { beginSourceObservation, getSourceObservation, recordSourceObservation, reconcileVerifiedSource } = await import("../../src/services/jobs/sourceObservations");
  let created = false;
  try {
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true;
    await db.$executeRawUnsafe('CREATE TYPE "AtsPlatform" AS ENUM (\'GREENHOUSE\', \'LEVER\')');
    await db.$executeRawUnsafe('CREATE TYPE "RemotePreference" AS ENUM (\'ANY\', \'REMOTE_ONLY\', \'HYBRID\', \'ONSITE\')');
    await db.$executeRawUnsafe("CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT NOT NULL)");
    await db.$executeRaw`INSERT INTO users (id, role) VALUES ('synthetic-admin', 'ADMIN'), ('synthetic-user', 'USER')`;
    await db.$executeRawUnsafe('CREATE TABLE job_postings (id TEXT PRIMARY KEY, company TEXT NOT NULL, title TEXT NOT NULL DEFAULT \'Synthetic\', description TEXT NOT NULL DEFAULT \'Synthetic\', location TEXT, "remoteType" "RemotePreference" NOT NULL DEFAULT \'ANY\', "atsPlatform" "AtsPlatform" NOT NULL, "externalJobId" TEXT, "applicationUrl" TEXT NOT NULL DEFAULT \'https://example.invalid\', "postedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "salaryMin" INTEGER, "salaryMax" INTEGER)');
    for (const statement of readFileSync("prisma/drafts/job-source-checkpoints.sql", "utf8").split(";").map((s) => s.trim()).filter(Boolean)) {
      await db.$executeRawUnsafe(statement);
    }
    for (const statement of readFileSync("prisma/drafts/job-source-schedules.sql", "utf8").split(";").map((s) => s.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
    const approval = { source: { platform: "GREENHOUSE", board: "scheduled-fixture" }, intervalHours: 24, termsReviewed: true };
    await assert.rejects(approveSource("synthetic-user", approval), /Admin authorization/);
    await assert.rejects(approveSource("synthetic-admin", { ...approval, termsReviewed: false }));
    const approved = await approveSource("synthetic-admin", approval);
    const slots = new Set<string>();
    const enqueue = (async (data: { scheduleId: string }, due: Date) => { slots.add(scheduledIngestionJobId(data.scheduleId, due)); return undefined; }) as unknown as typeof import("../../src/services/queue/jobIngestionQueue").enqueueScheduledIngestion;
    const clock = new Date(Date.now() + 5000);
    await Promise.all([dispatchApprovedSources(clock, enqueue), dispatchApprovedSources(clock, enqueue)]);
    assert.equal(slots.size, 1, "Concurrent dispatch must target the same queue job ID");
    const scheduledJob = { userId: "synthetic-admin", scheduleId: approved.id, sources: [{ platform: "GREENHOUSE" as const, board: "scheduled-fixture" }] };
    assert.equal(await isScheduledSourceApproved(scheduledJob), true);
    assert.equal((await dispatchApprovedSources(clock, enqueue)).dispatched, 0, "A source is not due again in the same slot");
    await approveSource("synthetic-admin", approval);
    assert.equal((await dispatchApprovedSources(clock, enqueue)).dispatched, 0, "Reapproval cannot bypass the daily schedule");
    await disableSource("synthetic-admin", { scheduleId: approved.id });
    assert.equal(await isScheduledSourceApproved(scheduledJob), false, "Revoked schedules must not be processed");
    await approveSource("synthetic-admin", approval);
    assert.equal((await dispatchApprovedSources(clock, enqueue)).dispatched, 0, "Re-enabling cannot bypass the daily schedule");
    await disableSource("synthetic-admin", { scheduleId: approved.id });
    const capped = await Promise.allSettled(Array.from({ length: 12 }, (_, index) => approveSource("synthetic-admin", {
      ...approval, source: { platform: "GREENHOUSE", board: `budget-${index}` },
    })));
    assert.equal(capped.filter((result) => result.status === "fulfilled").length, 10, "Concurrent approvals must respect the schedule cap");
    await db.$executeRaw`UPDATE job_source_schedules SET enabled = false WHERE board LIKE 'budget-%'`;
    const entries = Array.from({ length: 200 }, (_, index) => ({ externalId: `external-${index}`, jobId: `job-${index}` }));
    await db.$executeRaw`INSERT INTO job_postings (id, company, "atsPlatform", "externalJobId") VALUES ${Prisma.join(entries.map((entry) => Prisma.sql`(${entry.jobId}, 'fixture', 'GREENHOUSE'::"AtsPlatform", ${entry.externalId})`))}`;
    const source = { platform: "GREENHOUSE", board: "fixture" };
    const [one, two] = await Promise.all([beginSourceObservation(source), beginSourceObservation(source)]);
    const older = one.generation < two.generation ? one : two; const current = one.generation > two.generation ? one : two;
    const record = (run: typeof current, offset: number, terminal: boolean, items: typeof entries, invalidCount = 0) =>
      recordSourceObservation({ ...run, offset, terminal, entries: items, invalidCount });
    await assert.rejects(record(older, 0, true, entries.slice(0, 1)), /stale or out of sequence/);
    assert.equal((await record(current, 0, false, entries)).state, "collecting");
    assert.deepEqual(await getSourceObservation(current), { state: "collecting", nextOffset: 200 });
    await assert.rejects(getSourceObservation(older), /stale or unavailable/);
    await assert.rejects(record(current, 200, true, [entries[0]]));
    const state = await db.$queryRaw<{ nextOffset: number }[]>`SELECT "nextOffset" FROM job_source_runs WHERE id = ${current.runId}`;
    assert.equal(state[0].nextOffset, 200, "Duplicate across batches must roll back the checkpoint");
    await record(current, 200, true, [entries[0]], 1).then((result) => assert.equal(result.state, "rejected"));
    const mismatch = await beginSourceObservation(source);
    assert.equal((await record(mismatch, 0, true, entries.slice(0, 2))).state, "verifying");
    assert.equal((await recordSourceObservation({ ...mismatch, offset: 0, terminal: true, invalidCount: 0, entries: [{ externalId: entries[0].externalId }] })).state, "rejected");
    const good = await beginSourceObservation(source);
    assert.equal((await record(good, 0, true, entries.slice(0, 2))).state, "verifying");
    assert.deepEqual(await getSourceObservation(good), { state: "verifying", nextOffset: 0 });
    assert.equal((await recordSourceObservation({ ...good, offset: 0, terminal: true, invalidCount: 0, entries: entries.slice(0, 2).map(({ externalId }) => ({ externalId })) })).state, "verified");
    const records = await db.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM job_source_records WHERE "closedAt" IS NOT NULL`;
    assert.equal(records[0].count, 0, "Verification must not close listings");
    await db.$executeRaw`INSERT INTO job_postings (id, company, "atsPlatform", "externalJobId") VALUES ('conflicting-job', 'fixture', 'GREENHOUSE'::"AtsPlatform", ${entries[0].externalId})`;
    const conflict = await beginSourceObservation(source);
    await assert.rejects(record(conflict, 0, true, [{ externalId: entries[0].externalId, jobId: "conflicting-job" }]), /identity conflict/);
    const empty = await beginSourceObservation(source);
    assert.equal((await record(empty, 0, true, [])).state, "rejected");
    const closureEntries = Array.from({ length: 11 }, (_, index) => ({ externalId: `closed-external-${index}`, jobId: `closed-job-${index}` }));
    await db.$executeRaw`INSERT INTO job_postings (id, company, "atsPlatform", "externalJobId") VALUES ${Prisma.join(closureEntries.map((entry) => Prisma.sql`(${entry.jobId}, 'closurefixture', 'GREENHOUSE'::"AtsPlatform", ${entry.externalId})`))}`;
    const closureSource = { platform: "GREENHOUSE", board: "closurefixture" };
    const verifiedRun = async (items: typeof closureEntries) => {
      const run = await beginSourceObservation(closureSource);
      assert.equal((await record(run, 0, true, items)).state, "verifying");
      assert.equal((await recordSourceObservation({ ...run, offset: 0, terminal: true, invalidCount: 0, entries: items.map(({ externalId }) => ({ externalId })) })).state, "verified");
      return run;
    };
    await verifiedRun(closureEntries);
    const firstMissing = await verifiedRun(closureEntries.slice(0, 10));
    assert.equal((await reconcileVerifiedSource(firstMissing)).reason, "insufficient_history");
    await db.$executeRaw`UPDATE job_source_runs SET "finishedAt" = NOW() - INTERVAL '25 hours' WHERE id = ${firstMissing.runId}`;
    const secondMissing = await verifiedRun(closureEntries.slice(0, 10));
    assert.deepEqual(await reconcileVerifiedSource(secondMissing), { closed: 1, reason: "reconciled" });
    assert.deepEqual(await reconcileVerifiedSource(secondMissing), { closed: 0, reason: "no_changes" });
    process.env.JOB_SOURCE_CLOSURE_ENABLED = "1";
    const query = jobQuerySchema.parse({ search: "closurefixture" });
    const filtered = await getJobs(query);
    assert.equal(filtered.pagination.total, 10);
    assert.ok(filtered.items.every((item) => item.id !== closureEntries[10].jobId));
    const visible = await db.$queryRaw<{ id: string }[]>`SELECT j.id FROM job_postings j WHERE j.company = 'closurefixture' AND ${visibleSourcePredicate}`;
    assert.equal(visible.length, 10); assert.ok(visible.every((item) => item.id !== closureEntries[10].jobId));
    await db.$executeRaw`INSERT INTO job_source_records ("sourceId", "externalId", "jobId", "lastGeneration") VALUES ((SELECT id FROM job_sources WHERE board = 'fixture'), 'alternate-source', ${closureEntries[10].jobId}, 1)`;
    assert.equal((await getJobs(query)).pagination.total, 11, "A listing remains visible while another source is active");
    assert.equal((await db.$queryRaw<{ id: string }[]>`SELECT j.id FROM job_postings j WHERE j.company = 'closurefixture' AND ${visibleSourcePredicate}`).length, 11);
    await db.$executeRaw`DELETE FROM job_source_records WHERE "externalId" = 'alternate-source'`;
    await db.$executeRaw`INSERT INTO job_postings (id, company, "atsPlatform") VALUES ('untracked-job', 'closurefixture', 'GREENHOUSE'::"AtsPlatform")`;
    assert.equal((await getJobs(query)).pagination.total, 11, "An untracked legacy job remains visible");
    assert.equal((await db.$queryRaw<{ id: string }[]>`SELECT j.id FROM job_postings j WHERE j.company = 'closurefixture' AND ${visibleSourcePredicate}`).length, 11);
    await db.$executeRaw`DELETE FROM job_postings WHERE id = 'untracked-job'`;
    delete process.env.JOB_SOURCE_CLOSURE_ENABLED;
    const firstLarge = await verifiedRun(closureEntries.slice(0, 8));
    await db.$executeRaw`UPDATE job_source_runs SET "finishedAt" = NOW() - INTERVAL '25 hours' WHERE id = ${firstLarge.runId}`;
    const secondLarge = await verifiedRun(closureEntries.slice(0, 8));
    assert.equal((await reconcileVerifiedSource(secondLarge)).reason, "change_limit");
    const reopened = await verifiedRun(closureEntries);
    const closed = await db.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM job_source_records WHERE "closedAt" IS NOT NULL AND "sourceId" = (SELECT id FROM job_sources WHERE board = 'closurefixture')`;
    assert.equal(closed[0].count, 0, "A source listing should reopen when observed again");
    await assert.rejects(reconcileVerifiedSource(secondMissing), /stale or unavailable/);
    assert.equal((await getSourceObservation(reopened)).state, "verified");
    // Rehearse committed rollback/recreation and restore only synthetic source metadata.
    const tables = ["job_sources", "job_source_runs", "job_source_records", "job_source_observations"] as const;
    const archive = new Map<string, string>();
    for (const table of tables) {
      const rows = await db.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${table}"`);
      archive.set(table, JSON.stringify(rows));
    }
    for (const statement of readFileSync("prisma/drafts/job-source-checkpoints.rollback.sql", "utf8").split(";").map((s) => s.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
    const left = await db.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = ${schema} AND table_name IN ('job_sources','job_source_runs','job_source_records','job_source_observations')`;
    assert.equal(left[0].count, 0);
    for (const statement of readFileSync("prisma/drafts/job-source-checkpoints.sql", "utf8").split(";").map((s) => s.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
    for (const table of tables) await db.$executeRawUnsafe(`INSERT INTO "${table}" SELECT * FROM jsonb_populate_recordset(NULL::"${table}", $1::jsonb)`, archive.get(table));
    for (const table of tables) {
      const rows = await db.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${table}"`);
      const archived = JSON.parse(archive.get(table)!) as unknown[];
      assert.deepEqual(rows.map((row) => JSON.stringify(row)).sort(), archived.map((row) => JSON.stringify(row)).sort(), `Restore changed ${table} rows`);
    }
    assert.equal((await getSourceObservation(empty)).state, "rejected");
    if (process.env.HUNTDECK_RUN_SOURCE_WORKER_TEST === "1") {
      const redisUrl = new URL(process.env.REDIS_URL ?? "");
      assert.ok(["127.0.0.1", "localhost", "::1"].includes(redisUrl.hostname));
      const { Queue, Worker } = await import("bullmq");
      const { redisConnectionOptions } = await import("../../src/services/queue/resumeQueue");
      const { processObservedJobIngestion } = await import("../../src/services/queue/observedJobIngestion");
      const { BoardRequestError } = await import("../../src/services/jobs/adapters/publicBoard");
      const queueName = `source-worker-test-${randomUUID()}`;
      const queue = new Queue(queueName, { connection: redisConnectionOptions() });
      const slotId = scheduledIngestionJobId(approved.id, clock);
      const queued = await Promise.all([queue.add("slot", scheduledJob, { jobId: slotId }), queue.add("slot", scheduledJob, { jobId: slotId })]);
      assert.equal(queued[0].id, queued[1].id);
      assert.equal((await queue.getJobCounts("waiting")).waiting, 1, "Redis must deduplicate concurrent scheduled enqueues");
      await (await queue.getJob(slotId))!.remove();
      await approveSource("synthetic-admin", { source: { platform: "GREENHOUSE", board: "workerfixture" }, intervalHours: 24, termsReviewed: true });
      let scheduledId = "";
      const scheduledEnqueue = (async (data: typeof scheduledJob, due: Date) => {
        scheduledId = scheduledIngestionJobId(data.scheduleId, due);
        return queue.add("scheduled-synthetic", data, { jobId: scheduledId, attempts: 3, backoff: { type: "fixed", delay: 3000 } });
      }) as unknown as typeof import("../../src/services/queue/jobIngestionQueue").enqueueScheduledIngestion;
      assert.equal((await dispatchApprovedSources(new Date(Date.now() + 5000), scheduledEnqueue)).dispatched, 1);
      const previousClosureFlag = process.env.JOB_SOURCE_CLOSURE_ENABLED;
      process.env.JOB_SOURCE_CLOSURE_ENABLED = "1";
      const workerEntries = [{ externalId: "w1", jobId: "worker-job-1" }, { externalId: "w2", jobId: "worker-job-2" }];
      await db.$executeRaw`INSERT INTO job_postings (id, company, "atsPlatform", "externalJobId") VALUES ${Prisma.join(workerEntries.map((entry) => Prisma.sql`(${entry.jobId}, 'workerfixture', 'GREENHOUSE'::"AtsPlatform", ${entry.externalId})`))}`;
      let calls = 0; let saves = 0;
      const deps = { authorized: async (userId: string) => (await db.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role === "ADMIN", allowSource: async () => true,
        fetchBoard: async () => { calls++; if (calls === 2) throw new BoardRequestError(true);
          return { fetched: 2, selected: 2, invalid: 0, incomplete: false, nextOffset: null,
            jobs: workerEntries.map((entry) => ({ title: "SYNTHETIC_SOURCE_TEXT_CANARY", company: "workerfixture", description: "Synthetic posting", remoteType: "ANY" as const,
              atsPlatform: "GREENHOUSE" as const, applicationUrl: "https://example.invalid", externalJobId: entry.externalId })) }; },
        persist: async (job: { externalJobId?: string }) => { saves++; return { id: workerEntries.find((entry) => entry.externalId === job.externalJobId)!.jobId, embedded: false }; } };
      const start = (failCheckpoint = false) => new Worker(queueName, (job) => {
        if (failCheckpoint) {
          const update = job.updateProgress.bind(job); let updates = 0;
          job.updateProgress = async (value) => { if (++updates === 2) throw new Error("synthetic checkpoint failure"); return update(value); };
        }
        return processObservedJobIngestion(job, deps);
      }, { connection: redisConnectionOptions(true) });
      let worker = start(true);
      const until = async (predicate: () => Promise<boolean>) => { const deadline = Date.now() + 15000; while (Date.now() < deadline) { if (await predicate()) return; await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error("Synthetic worker timed out."); };
      try {
        const job = await queue.getJob(scheduledId);
        assert.ok(job, "The scheduler should enqueue the synthetic source");
        await until(async () => (await job.getState()) === "delayed");
        assert.equal(JSON.stringify((await queue.getJob(job.id!))?.toJSON()).includes("SYNTHETIC_SOURCE_TEXT_CANARY"), false);
        await worker.close(); worker = start();
        await until(async () => (await job.getState()) === "completed");
        assert.equal(calls, 3); assert.equal(saves, 2, "Verification must not save or embed jobs again");
        const outcome = await db.$queryRaw<{ state: string }[]>`SELECT r.state FROM job_source_runs r JOIN job_sources s ON s.id = r."sourceId" WHERE s.board = 'workerfixture'`;
        assert.equal(outcome[0].state, "verified");
      } finally {
        if (previousClosureFlag === undefined) delete process.env.JOB_SOURCE_CLOSURE_ENABLED;
        else process.env.JOB_SOURCE_CLOSURE_ENABLED = previousClosureFlag;
        await worker.close(); await queue.obliterate({ force: true }); await queue.close();
      }
    }
    await db.$executeRawUnsafe(readFileSync("prisma/drafts/job-source-schedules.rollback.sql", "utf8"));
  } finally {
    if (created) await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await db.$disconnect();
  }
});
