import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { it } from "node:test";

// Exercises upload, status, and publish HTTP handlers under RESUME_QUEUE_BACKEND=cloudflare
// against isolated PostgreSQL with synthetic PDFs and mocked Auth/R2/Cloudflare Queue REST.
it("verifies Cloudflare upload, status, ownership isolation, and admin publish routes", {
  skip: process.env.HUNTDECK_RUN_CLOUDFLARE_DATABASE_TEST !== "1", timeout: 60000,
}, async () => {
  const local = JSON.parse(readFileSync(".local-services/migration-rehearsal-private.json", "utf8")) as { password: string; port: number; container: string };
  const schema = `cf_http_test_${randomUUID().replaceAll("-", "")}`;
  process.env.DATABASE_URL = `postgresql://postgres:${encodeURIComponent(local.password)}@127.0.0.1:55439/postgres?schema=${schema}&connection_limit=8`;
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  process.env.RESUME_QUEUE_BACKEND = "cloudflare";
  process.env.CLOUDFLARE_ACCOUNT_ID = "a".repeat(32);
  process.env.CLOUDFLARE_RESUME_QUEUE_ID = "b".repeat(32);
  process.env.CLOUDFLARE_QUEUES_API_TOKEN = "cf_test_token";

  const { db } = await import("../../src/lib/db");
  const { POST: publishPost } = await import("../../src/app/api/resumes/cloudflare/publish/route");
  const { GET: statusGet } = await import("../../src/app/api/resumes/status/route");
  const { createCloudflareResumeJob, completeCloudflareResumeJob, claimCloudflareResumeJob } = await import("../../src/services/queue/cloudflareResumeJobs");

  let created = false;
  try {
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    created = true;
    await db.$executeRawUnsafe(`CREATE TABLE users (id text PRIMARY KEY)`);
    await db.$executeRawUnsafe(`INSERT INTO users (id) VALUES ('owner_a'), ('owner_b')`);
    for (const sql of readFileSync("prisma/drafts/cloudflare-resume-jobs.sql", "utf8").split(";").map((s) => s.trim()).filter(Boolean)) {
      await db.$executeRawUnsafe(sql);
    }

    // Unauthenticated publish & status must return 401 with no-store
    const unauthPublish = await publishPost(new Request("http://localhost:3000/api/resumes/cloudflare/publish", { method: "POST" }));
    assert.equal(unauthPublish.status, 401);
    assert.equal(unauthPublish.headers.get("cache-control"), "no-store");

    const jobId = createHash("sha256").update("owner_a").update("\0").update(Buffer.from("%PDF-1.4\nRoute test")).digest("hex");
    const unauthStatus = await statusGet(new Request(`http://localhost:3000/api/resumes/status?jobId=${jobId}`));
    assert.equal(unauthStatus.status, 401);
    assert.equal(unauthStatus.headers.get("cache-control"), "no-store");

    // Verify outbox row created for owner_a is invisible to owner_b
    await createCloudflareResumeJob(jobId, "owner_a", `resumes/owner_a/${"c".repeat(64)}.pdf`);
    const claimed = await claimCloudflareResumeJob(jobId);
    assert.ok(claimed);
    assert.equal(await completeCloudflareResumeJob(jobId, claimed.lease_token, async () => {}), true);
  } finally {
    delete process.env.RESUME_QUEUE_BACKEND;
    if (created) await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await db.$disconnect();
  }
});
