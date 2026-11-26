import { it } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHmac, createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { createServer, request as httpRequest, type Server } from "node:http";
import { once } from "node:events";
import { loadEnvConfig } from "@next/env";
import Redis from "ioredis";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { syntheticResumePdf, syntheticOnboardingPdf } from "../fixtures/syntheticResume";
import { dashboardMetricsSchema } from "../../src/lib/validations/dashboard";

// Real Supabase Auth runs locally from an already-installed image; no hosted
// users, email delivery, schema, credentials, or resource settings are changed.
it("verifies signed-in HTTP uploads, polling, isolation, restart and bounded failures", { skip: process.env.HUNTDECK_RUN_HTTP_TESTS !== "1", timeout: 360000 }, async () => {
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const local = JSON.parse(readFileSync(".local-services/migration-rehearsal-private.json", "utf8")) as { password: string; port: number; container: string };
  const rehearsal = JSON.parse(readFileSync(".local-services/migration-rehearsal-result.json", "utf8")) as { complete: boolean; database: string };
  assert.equal(local.container, "huntdeck-migration-rehearsal");
  assert.equal(local.port, 55439);
  assert.equal(rehearsal.complete, true);
  assert.match(rehearsal.database, /^huntdeck_recovery_[0-9]+$/);
  assert.equal(process.env.R2_ACCOUNT_ID, "093d489fa9bb46a82db650872b75b57e");
  assert.equal(process.env.CLOUDFLARE_ACCOUNT_ID, process.env.R2_ACCOUNT_ID);
  assert.equal(process.env.R2_BUCKET_NAME, "huntdeck-resumes-dev");
  assert.ok(!process.env.R2_PUBLIC_URL);
  const redisUrl = new URL(process.env.REDIS_URL ?? "");
  assert.equal(redisUrl.hostname, "127.0.0.1");
  assert.equal(redisUrl.port, "16379");
  redisUrl.pathname = "/14";
  process.env.REDIS_URL = redisUrl.toString();
  process.env.DATABASE_URL = `postgresql://postgres:${local.password}@127.0.0.1:55439/${rehearsal.database}?schema=public`;
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  const { db } = await import("../../src/lib/db");
  const { getResumeQueue, closeResumeQueueConnections } = await import("../../src/services/queue/resumeQueue");
  const { getJobIngestionQueue, closeJobIngestionQueue, enqueueJobIngestion } = await import("../../src/services/queue/jobIngestionQueue");
  const redis = new Redis(process.env.REDIS_URL);
  redis.on("error", () => {});
  const run = randomUUID().slice(0, 8);
  const httpRoot = `.local-services/http-app-${run}`;
  let sourceCopied = false;
  const authDatabase = `huntdeck_authcheck_${Date.now()}`;
  const authContainer = `huntdeck-authcheck-${run}`;
  const checks: string[] = [];
  const onboardingOnly = process.env.HUNTDECK_ONBOARDING_ONLY === "1";
  const rolesOnly = process.env.HUNTDECK_ROLES_ONLY === "1";
  let rolesComplete = false;
  let onboardingComplete = false;
  let phase = "preflight";
  let authCreated = false;
  let authDbCreated = false;
  let queueOwned = false;
  let web: ChildProcess | undefined;
  let worker: ChildProcess | undefined;
  let proxy: Server | undefined;
  let faults: Server | undefined;
  const logs: string[] = [];
  const userIds: string[] = [];
  const storageKeys = new Set<string>();
  const syntheticJobIds: string[] = [];
  const jars = new Map<string, Map<string, string>>();
  const origin = "http://localhost:3107";
  const authOrigin = "http://127.0.0.1:35432";
  const childEnv = { ...process.env, NODE_ENV: "development" as const, NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_SUPABASE_URL: authOrigin, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", HUNTDECK_HTTP_PORT: "3107", HUNTDECK_HTTP_ROOT: httpRoot };
  function docker(args: string[], input?: string) {
    const result = spawnSync("docker", args, { encoding: "utf8", input, timeout: 30000 });
    if (result.status !== 0) throw new Error("Local Docker operation failed.");
    return result.stdout.trim();
  }
  function sql(query: string, database = "postgres") {
    return docker(["exec", "-i", local.container, "psql", "-U", "supabase_admin", "-d", database, "-v", "ON_ERROR_STOP=1", "-t", "-A"], query);
  }
  function child(file: string, overrides = {}) {
    const proc = spawn(process.execPath, ["--import", "tsx", file], { env: { ...childEnv, ...overrides }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    for (const stream of [proc.stdout, proc.stderr]) stream?.on("data", (chunk: Buffer) => logs.push(chunk.toString()));
    return proc;
  }
  async function stop(proc?: ChildProcess) {
    if (proc && proc.exitCode === null && proc.signalCode === null) {
      const closed = once(proc, "close");
      proc.kill("SIGKILL");
      await closed;
    }
  }
  async function until(check: () => Promise<boolean>, limit = 90000) {
    const deadline = Date.now() + limit;
    while (Date.now() < deadline) {
      if (await check()) return;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error("Timed out at current verification phase.");
  }
  async function call(path: string, cookie = "", init: RequestInit = {}) {
    const jar = jars.get(cookie);
    const current = jar ? [...jar].map(([name, value]) => `${name}=${value}`).join("; ") : cookie;
    const response = await fetch(`${origin}${path}`, { ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), ...(current ? { Cookie: current } : {}) }, signal: AbortSignal.timeout(60000) });
    if (jar) for (const value of response.headers.getSetCookie()) {
      const pair = value.split(";")[0]; const separator = pair.indexOf("=");
      if (/max-age=0/i.test(value)) jar.delete(pair.slice(0, separator));
      else jar.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  }
  async function upload(bytes: Buffer, cookie: string, name = "private-synthetic-name.pdf") {
    const form = new FormData();
    form.set("file", new File([new Uint8Array(bytes)], name, { type: "application/pdf" }));
    form.set("userId", "synthetic-untrusted-owner");
    const response = await call("/api/resumes/upload", cookie, { method: "POST", body: form });
    phase = `synthetic upload HTTP${response.status}`;
    assert.equal(response.status, 202);
    assert.match(response.headers.get("cache-control") ?? "", /(?:^|,)\s*no-store(?:,|$)/);
    const result = await response.json() as { jobId: string };
    assert.match(result.jobId, /^[a-f0-9]{64}$/);
    return result.jobId;
  }
  try {
    assert.equal(await redis.dbsize(), 0, "Redis database14 must be empty before taking ownership.");
    queueOwned = true;
    assert.equal(await db.user.count(), 0);
    assert.equal(await db.resume.count(), 0);
    assert.equal(docker(["inspect", "--format", '{{index .Config.Labels "project"}}', local.container]), "huntdeck-migration-rehearsal");
    phase = "local Auth setup";
    sql(`CREATE DATABASE ${authDatabase} OWNER postgres TEMPLATE template0;`);
    authDbCreated = true;
    sql("CREATE SCHEMA auth AUTHORIZATION postgres;", authDatabase);
    const ip = docker(["inspect", "--format", '{{(index .NetworkSettings.Networks "bridge").IPAddress}}', local.container]);
    assert.match(ip, /^172\.[0-9.]+$/);
    const secret = randomBytes(32).toString("hex");
    const segment = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = `${segment({ alg: "HS256", typ: "JWT" })}.${segment({ role: "anon", iss: "supabase", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}`;
    childEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = `${unsigned}.${createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
    const authEnv: Record<string, string> = {
      GOTRUE_API_HOST: "0.0.0.0", GOTRUE_API_PORT: "9999", API_EXTERNAL_URL: `${authOrigin}/auth/v1`,
      GOTRUE_SITE_URL: origin, GOTRUE_DB_DRIVER: "postgres", GOTRUE_DB_DATABASE_URL: `postgresql://postgres:${local.password}@${ip}:5432/${authDatabase}?sslmode=disable&search_path=auth`,
      GOTRUE_JWT_SECRET: secret, GOTRUE_JWT_EXP: "120", GOTRUE_JWT_AUD: "authenticated", GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated",
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true", GOTRUE_MAILER_AUTOCONFIRM: "true", GOTRUE_DISABLE_SIGNUP: "false", GOTRUE_LOG_LEVEL: "error",
    };
    // Values travel through inherited environment only, never command arguments.
    const authStart = spawnSync("docker", ["run", "--pull=never", "-d", "--name", authContainer, "--label", "project=huntdeck-http-verification", "--log-driver", "none", "--publish", "127.0.0.1:3999:9999", ...Object.keys(authEnv).flatMap((key) => ["--env", key]), "public.ecr.aws/supabase/gotrue:v2.197.0"], { env: { ...process.env, ...authEnv }, encoding: "utf8", timeout: 30000 });
    assert.equal(authStart.status, 0);
    authCreated = true;
    await until(async () => {
      const state = docker(["inspect", "--format", "{{.State.Status}}", authContainer]);
      if (state === "exited") {
        // Reattach once to the failed, log-disabled service; redact its only
        // supplied secrets before exposing startup diagnostics. No requests or
        // resume content have reached Auth at this point.
        const diagnostic = spawnSync("docker", ["start", "--attach", authContainer], { encoding: "utf8", timeout: 5000 });
        const safe = `${diagnostic.stdout ?? ""}${diagnostic.stderr ?? ""}`.replaceAll(local.password, "[redacted]").replaceAll(secret, "[redacted]").replace(/postgres(?:ql)?:\/\/\S+/g, "[database URL redacted]");
        console.log(`Local Auth startup diagnostic: ${safe.match(/ERROR: .*?\(SQLSTATE [A-Z0-9]+\)/)?.[0] ?? "service exited; raw details withheld"}`);
        throw new Error("Local Auth exited during startup.");
      }
      try { return (await fetch("http://127.0.0.1:3999/health", { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
    }, 25000);
    proxy = createServer((incoming, outgoing) => {
      const upstream = httpRequest({ hostname: "127.0.0.1", port: 3999, path: (incoming.url ?? "/").replace(/^\/auth\/v1/, "") || "/", method: incoming.method, headers: incoming.headers }, (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers); response.pipe(outgoing);
      });
      upstream.on("error", () => { outgoing.writeHead(502); outgoing.end(); });
      incoming.pipe(upstream);
    });
    proxy.listen(35432, "127.0.0.1"); await once(proxy, "listening");
    checks.push("Real local Supabase Auth ready; email auto-confirmed locally without SMTP");
    phase = "Next development startup";
    mkdirSync(httpRoot); sourceCopied = true;
    cpSync("src", `${httpRoot}/src`, { recursive: true });
    for (const file of ["next.config.ts", "tsconfig.json", "package.json", "postcss.config.mjs"]) cpSync(file, `${httpRoot}/${file}`);
    web = child("tests/fixtures/httpNextServer.ts");
    await until(async () => {
      if (web?.exitCode !== null) throw new Error("Isolated Next process exited.");
      try { return (await call("/api/resumes/status?jobId=" + "0".repeat(64))).status === 401; } catch { return false; }
    });
    const accounts: Array<{ id: string; cookie: string }> = [];
    phase = "real local sign-in cookies";
    for (const label of ["a", "b"]) {
      const credentials = { email: `synthetic-${run}-${label}@example.invalid`, password: `${randomBytes(24).toString("hex")}Aa1!` };
      const signup = await call("/api/auth/sign-up", "", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ ...credentials, fullName: "Synthetic Candidate" }) });
      phase = `local Auth signup HTTP${signup.status}`;
      assert.equal(signup.status, 200);
      const auth = await signup.json() as { confirmationRequired: boolean; user: { id: string } };
      assert.equal(auth.confirmationRequired, false);
      const signin = await call("/api/auth/sign-in", "", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(credentials) });
      phase = `local app sign-in HTTP${signin.status}`;
      assert.equal(signin.status, 200);
      const cookie = signin.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
      phase = "sign-in cookie issuance"; assert.ok(cookie.includes("auth-token"));
      jars.set(cookie, new Map(cookie.split("; ").map((pair) => { const separator = pair.indexOf("="); return [pair.slice(0, separator), pair.slice(separator + 1)]; })));
      const mapped = await call("/api/resumes/status?jobId=" + "0".repeat(64), cookie);
      phase = `signed-in user mapping HTTP${mapped.status}`; assert.equal(mapped.status, 404);
      const user = await db.user.findUnique({ where: { authSubject: auth.user.id } });
      assert.ok(user);
      userIds.push(user.id); accounts.push({ id: user.id, cookie });
    }
    checks.push("Two genuine Auth sign-ins mapped server-side to separate local users");
    const [a, b] = accounts;
    const queue = getResumeQueue();
    if (rolesOnly) {
      phase = "role catalog authenticated search";
      assert.equal((await call("/api/roles?q=SWE")).status, 401);
      const lookup = await call("/api/roles?q=SWE", a.cookie); assert.equal(lookup.status, 200);
      assert.match(lookup.headers.get("cache-control") ?? "", /no-store/);
      const found = await lookup.json() as { version: string; items: { id: string; title: string }[] };
      assert.equal(found.version, "v1.2.1"); assert.ok(found.items.length > 0);
      assert.ok(found.items.some((item) => /software/i.test(item.title)));
      assert.equal((await call("/api/roles?q=data&limit=100", a.cookie)).status, 400);
      assert.equal((await call(`/api/roles?q=data&userId=${b.id}`, a.cookie)).status, 400);
      const profile = { skills: ["Python", "SQL", "Excel"], experience: [{ title: "Research Assistant", bullets: [] }], education: [], projects: [] };
      const suggest = (cookie: string, body: unknown = { profile }) => call("/api/roles/suggestions", cookie, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      phase = "role catalog private suggestion validation";
      assert.equal((await suggest("")).status, 401);
      assert.equal((await suggest(a.cookie, { profile, userId: b.id })).status, 400);
      assert.equal((await suggest(a.cookie, { profile: { ...profile, skills: Array(201).fill("SQL") } })).status, 400);
      const oversized = await call("/api/roles/suggestions", a.cookie, { method: "POST", headers: { Origin: origin }, body: "x".repeat(196609) });
      assert.equal(oversized.status, 413);
      const suggestions = await suggest(a.cookie); assert.equal(suggestions.status, 200);
      const recommendation = await suggestions.json() as { suggestions: { title: string; kind: string }[] };
      assert.ok(recommendation.suggestions.length > 6, "More suggestions must have actual extra candidates");
      assert.ok(recommendation.suggestions.some((item) => item.kind === "transferable"));
      assert.equal(await db.profile.findUnique({ where: { userId: a.id } }), null, "Suggestions must not auto-save preferences");
      const selected = found.items[0].title;
      const resume = await db.resume.create({ data: { userId: a.id, title: "Synthetic role review", originalFileUrl: "scratch", extractedText: "Synthetic profile only.",
        parsedData: { fullName: "Synthetic Candidate", skills: profile.skills, experience: [], education: [], projects: [] } } });
      phase = "accepted catalog role account persistence";
      const payload = { importData: { resumeFileId: resume.id, isScratchMode: false }, skillsData: { skills: profile.skills.map((name) => ({ name, category: "Domains", isVerified: true })) },
        targetsData: { targetTitles: [selected], workArrangement: "HYBRID", seniorityLevel: "MID", minSalary: 0 } };
      assert.equal((await call("/api/onboarding", a.cookie, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(payload) })).status, 200);
      assert.deepEqual((await db.profile.findUniqueOrThrow({ where: { userId: a.id } })).targetTitles, [selected]);
      assert.equal(await db.profile.findUnique({ where: { userId: b.id } }), null);
      checks.push("Real local Auth role search401/200; alias normalization; query bounds; private suggestions401/400/413/200; actual extra candidates; no automatic writes; explicit accepted canonical title persisted only for its owner");
      rolesComplete = true;
      console.log("Synthetic authenticated role catalog and accepted preference HTTP checks passed. No provider calls or hosted Auth changes.");
      return;
    }
    if (onboardingOnly) {
      phase = "synthetic onboarding HTTP";
      worker = child("scripts/resume-worker.ts");
      const jobId = await upload(syntheticOnboardingPdf(), a.cookie);
      const job = await queue.getJob(jobId); assert.ok(job); storageKeys.add(job.data.storageKey);
      await until(async () => {
        const current = await queue.getJob(jobId);
        const state = await current?.getState();
        phase = `onboarding worker ${state}; progress=${current?.progress}; attempts=${current?.attemptsMade}; processExit=${worker?.exitCode}`;
        if (state === "failed") throw new Error("Synthetic worker failed; provider text withheld.");
        return state === "completed";
      }, 90000);
      phase = "onboarding completed status response";
      const status = await call(`/api/resumes/status?jobId=${jobId}`, a.cookie);
      assert.equal(status.status, 200);
      const result = await status.json() as { parsedData: { fullName: string; skills: string[] }; resumeId: string };
      assert.ok(result.parsedData.fullName.includes("Morgan"));
      phase = "onboarding dashboard gate before saving";
      const before = await call("/dashboard", a.cookie, { redirect: "manual" });
      assert.equal(before.status, 307); assert.equal(new URL(before.headers.get("location")!, origin).pathname, "/onboarding");
      const body = {
        userId: b.id,
        importData: { resumeFileId: result.resumeId, linkedinUrl: "https://www.linkedin.com/in/morgan-synthetic" },
        skillsData: { skills: ["Python", "SQL", "Docker"].map((name) => ({ name, category: "Domains", isVerified: true })) },
        targetsData: { targetTitles: ["Data Engineer"], workArrangement: "HYBRID", seniorityLevel: "MID", minSalary: 0, preferredLocations: ["Lagos"] },
      };
      const save = (cookie: string, payload = body) => call("/api/onboarding", cookie, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      phase = "onboarding unauthenticated and cross-user saves";
      assert.equal((await save("")).status, 401);
      assert.equal((await save(b.cookie)).status, 404);
      assert.equal(await db.profile.findUnique({ where: { userId: b.id } }), null);
      assert.equal((await save(a.cookie, { ...body, importData: { ...body.importData, linkedinUrl: "https://example.invalid/profile" } })).status, 400);
      phase = "onboarding valid save";
      const saved = await save(a.cookie); assert.equal(saved.status, 200);
      assert.equal((await saved.json() as { success: boolean }).success, true);
      const profile = await db.profile.findUniqueOrThrow({ where: { userId: a.id } });
      assert.deepEqual(profile.targetTitles, ["Data Engineer"]); assert.equal(profile.remotePreference, "HYBRID");
      const resume = await db.resume.findUniqueOrThrow({ where: { id: result.resumeId } });
      assert.equal((resume.parsedData as { linkedinUrl: string }).linkedinUrl, body.importData.linkedinUrl);
      phase = "saved resume reload without processing";
      const reloaded = await call("/api/resumes", a.cookie);
      assert.equal(reloaded.status, 200);
      assert.equal((await reloaded.json() as { resume: { id: string } }).resume.id, result.resumeId);
      phase = "onboarding dashboard gate after saving";
      assert.equal((await call("/dashboard", a.cookie)).status, 200);
      const anonymous = await call("/dashboard", "", { redirect: "manual" });
      assert.equal(anonymous.status, 307);
      assert.equal(new URL(anonymous.headers.get("location")!, origin).pathname, "/login");
      phase = "dashboard authenticated empty metrics";
      assert.equal((await call("/api/dashboard/metrics")).status, 401);
      const empty = dashboardMetricsSchema.parse(await (await call("/api/dashboard/metrics", a.cookie)).json());
      assert.equal(empty.pipeline.total, 0); assert.equal(empty.velocity.applicationsThisWeek, 0);
      assert.deepEqual(empty.recentApplications, []); assert.equal(empty.primaryResume?.id, result.resumeId);
      const now = new Date();
      const monday = new Date(empty.velocity.weeks[5].start);
      for (const [index, owner, state, appliedAt] of [
        [0, a.id, "APPLIED", now], [1, a.id, "SAVED", null],
        [2, a.id, "REJECTED", new Date(monday.getTime() - 86400000)],
        [3, b.id, "OFFER", now],
      ] as const) {
        const posting = await db.jobPosting.create({ data: { title: `Synthetic role ${index}`, company: "Dashboard test",
          description: "Synthetic listing for local verification.", applicationUrl: `https://example.invalid/${run}/${index}` } });
        syntheticJobIds.push(posting.id);
        // Use the existing synthetic resume only for its real owner. User B gets
        // a separate synthetic resume, matching the application's owner invariant.
        const ownerResume = owner === a.id ? resume : await db.resume.create({ data: {
          userId: b.id, title: "Synthetic other-owner resume", parsedData: { fullName: "Other Synthetic", skills: [] },
          originalFileUrl: "https://example.invalid/synthetic.pdf", extractedText: "Synthetic local dashboard fixture.",
        } });
        await db.application.create({ data: { userId: owner, jobId: posting.id, resumeId: ownerResume.id, status: state, appliedAt } });
      }
      phase = "dashboard persisted counts dates and isolation";
      const response = await call("/api/dashboard/metrics", a.cookie);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      const metrics = dashboardMetricsSchema.parse(await response.json());
      assert.deepEqual(metrics.pipeline, { total: 2, saved: 1, applied: 1, interviewing: 0, offers: 0, rejected: 1 });
      assert.equal(metrics.velocity.applicationsThisWeek, 1);
      assert.equal(metrics.velocity.weeks[4].count, 1);
      assert.equal(metrics.recentApplications.length, 3);
      const other = dashboardMetricsSchema.parse(await (await call("/api/dashboard/metrics", b.cookie)).json());
      assert.equal(other.pipeline.offers, 1); assert.equal(other.recentApplications.length, 1);
      phase = "job ingestion admin authorization and validation";
      const sources = { sources: [{ platform: "GREENHOUSE", board: `test-${run}` }] };
      const ingest = (cookie: string, body: unknown = sources) => call("/api/jobs", cookie, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      assert.equal((await ingest(a.cookie)).status, 403);
      await db.user.update({ where: { id: a.id }, data: { role: "ADMIN" } });
      assert.equal((await ingest(a.cookie, { sources: [{ platform: "GREENHOUSE", board: "https://private.invalid" }] })).status, 400);
      const accepted = await ingest(a.cookie); assert.equal(accepted.status, 202);
      const ingestionId = (await accepted.json() as { jobId: string }).jobId;
      const duplicate = await ingest(a.cookie);
      assert.equal((await duplicate.json() as { jobId: string }).jobId, ingestionId);
      const ingestionQueue = getJobIngestionQueue();
      assert.equal(await ingestionQueue.getWaitingCount(), 1);
      phase = "job ingestion worker interruption and recovery";
      await stop(worker); worker = child("tests/fixtures/jobIngestionWorker.ts", { HUNTDECK_JOB_TEST_BOARD: `test-${run}`, HUNTDECK_JOB_TEST_HOLD: "1" });
      await until(async () => (await (await ingestionQueue.getJob(ingestionId))?.getState()) === "active");
      await stop(worker); worker = undefined;
      worker = child("tests/fixtures/jobIngestionWorker.ts", { HUNTDECK_JOB_TEST_BOARD: `test-${run}`, HUNTDECK_JOB_TEST_FAIL_FIRST: "1" });
      await until(async () => {
        const current = await ingestionQueue.getJob(ingestionId); const state = await current?.getState();
        if (state === "failed") throw new Error("Synthetic job ingestion failed; details withheld.");
        return state === "completed";
      }, 90000);
      const ingested = await db.jobPosting.findMany({ where: { company: `test-${run}` } });
      syntheticJobIds.push(...ingested.map((job) => job.id));
      assert.equal(ingested.length, 2);
      const ingestJob = await ingestionQueue.getJob(ingestionId);
      assert.deepEqual(Object.keys(ingestJob!.data).sort(), ["sources", "userId"]);
      assert.deepEqual(ingestJob!.returnvalue, { fetched: 2, selected: 2, saved: 2, failed: 0, embedded: 2, sourcesFailed: 0 });
      assert.equal(ingestJob!.attemptsMade, 2);
      assert.ok(!JSON.stringify(ingestJob!.toJSON()).includes("SYNTHETIC_JOB_CANARY"));
      const statusPath = `/api/jobs/ingestion/status?jobId=${ingestionId}`;
      assert.equal((await call(statusPath, b.cookie)).status, 403);
      await db.user.update({ where: { id: b.id }, data: { role: "ADMIN" } });
      assert.equal((await call(statusPath, b.cookie)).status, 404);
      assert.equal((await call(statusPath, a.cookie)).status, 200);
      phase = "job ingestion exhausted retry budget and safe failure status";
      await stop(worker); worker = child("tests/fixtures/jobIngestionWorker.ts", { HUNTDECK_JOB_TEST_BOARD: `test-${run}`, HUNTDECK_JOB_TEST_ALWAYS_FAIL: "1" });
      const exhausted = await enqueueJobIngestion({ userId: a.id, sources: [{ platform: "GREENHOUSE", board: `test-${run}` }] }, Date.now() + 1200000);
      await until(async () => (await (await ingestionQueue.getJob(exhausted.id!))?.getState()) === "failed", 110000);
      const failedJob = (await ingestionQueue.getJob(exhausted.id!))!;
      assert.equal(failedJob.attemptsMade, 3); assert.equal(await ingestionQueue.getDelayedCount(), 0);
      assert.equal(failedJob.failedReason, "Job ingestion temporarily unavailable.");
      const failureStatus = await (await call(`/api/jobs/ingestion/status?jobId=${exhausted.id}`, a.cookie)).json() as { status: string; result: { sourcesFailed: number }; error: string };
      assert.equal(failureStatus.status, "failed"); assert.equal(failureStatus.result.sourcesFailed, 1);
      assert.ok(!JSON.stringify(failureStatus).includes("SYNTHETIC_JOB_CANARY"));
      phase = "personalized vector ranking and model isolation";
      const vectorA = Array(1024).fill(0); vectorA[0] = 1;
      const vectorB = Array(1024).fill(0); vectorB[1] = 1;
      const { CLOUDFLARE_BGE_M3_MODEL: model, CLOUDFLARE_BGE_M3_VERSION: version } = await import("../../src/services/ai/cloudflareEmbeddingService");
      await db.$executeRaw`UPDATE resumes SET "embedding1024" = ${JSON.stringify(vectorA)}::vector, "embeddingModel" = ${model}, "embeddingVersion" = ${version} WHERE id = ${result.resumeId}`;
      const otherResume = await db.resume.findFirstOrThrow({ where: { userId: b.id } });
      await db.$executeRaw`UPDATE resumes SET "isPrimary" = true, "embedding1024" = ${JSON.stringify(vectorB)}::vector, "embeddingModel" = ${model}, "embeddingVersion" = ${version} WHERE id = ${otherResume.id}`;
      const matchPath = `/api/jobs/matches?search=${encodeURIComponent(`test-${run}`)}`;
      const ranked = await call(matchPath, a.cookie); assert.equal(ranked.status, 200);
      const ranks = await ranked.json() as { items: { id: string; title: string; semanticSimilarity: number }[] };
      assert.equal(ranks.items[0].title, "Synthetic Alpha"); assert.equal(ranks.items[0].semanticSimilarity, 100);
      assert.ok(!JSON.stringify(ranks).includes("SYNTHETIC_JOB_CANARY"));
      const otherRanks = await (await call(matchPath, b.cookie)).json() as typeof ranks;
      assert.equal(otherRanks.items[0].title, "Synthetic Beta");
      assert.equal(((await (await call("/api/jobs/matches", a.cookie)).json()) as typeof ranks).items.length, 2);
      await db.profile.update({ where: { userId: a.id }, data: { targetTitles: ["Synthetic Alpha"] } });
      assert.equal(((await (await call("/api/jobs/matches", a.cookie)).json()) as typeof ranks).items.length, 2);
      await db.profile.update({ where: { userId: a.id }, data: { minSalary: 20000 } });
      assert.equal(((await (await call(matchPath, a.cookie)).json()) as typeof ranks).items.length, 0);
      await db.profile.update({ where: { userId: a.id }, data: { minSalary: 0, remotePreference: "REMOTE_ONLY" } });
      assert.equal(((await (await call(matchPath, a.cookie)).json()) as typeof ranks).items.length, 0);
      await db.profile.update({ where: { userId: a.id }, data: { remotePreference: "HYBRID" } });
      assert.equal((await call(matchPath)).status, 401);
      assert.equal((await call(`${matchPath}&userId=${b.id}`, a.cookie)).status, 400);
      const incompatible = ingested.find((job) => job.title === "Synthetic Alpha")!;
      await db.$executeRaw`UPDATE job_postings SET "embeddingVersion" = 'incompatible-test' WHERE id = ${incompatible.id}`;
      const isolated = await (await call(matchPath, a.cookie)).json() as typeof ranks;
      assert.equal(isolated.items.length, 1); assert.equal(isolated.items[0].title, "Synthetic Beta");
      const listings = await (await call(`/api/jobs?search=${encodeURIComponent(`test-${run}`)}`, a.cookie)).json() as { items: Record<string, unknown>[] };
      assert.equal(listings.items.length, 2);
      assert.ok(listings.items.every((item) => !["description", "embedding1024", "contentHash"].some((key) => key in item)));
      checks.push("Real job queue admin POST and canonical duplicate ID; interrupted worker recovery; bounded transient retry; two atomic listing/vector saves; safe payload; owner/admin status; local cosine ranking; own-primary isolation; incompatible version exclusion; minimal public projection");
      phase = "real sign-out invalidates app cookie";
      assert.equal((await call("/api/auth/sign-out", a.cookie, { method: "POST", headers: { Origin: origin } })).status, 200);
      assert.equal((await call("/api/dashboard/metrics", a.cookie)).status, 401);
      checks.push("Real local Auth signup/signin; synthetic PDF worker; onboarding save; LinkedIn400; cross-user404; ignored client owner; saved resume reload; dashboard gates; real empty/populated metrics; appliedAt UTC weeks; owner isolation; sign-out401");
      onboardingComplete = true;
      console.log("Synthetic authenticated onboarding HTTP checks passed. Local Auth and database, real private R2/Groq/Workers AI/Redis; hosted email confirmation and browser clicks not exercised.");
      return;
    }
    phase = "HTTP upload and waiting status";
    assert.equal((await call("/api/resumes/upload", "", { method: "POST" })).status, 401);
    assert.equal((await call("/api/resumes/status?jobId=invalid", a.cookie)).status, 400);
    assert.equal((await call("/api/resumes/status?jobId=" + "0".repeat(64), "sb-127-auth-token=forged")).status, 401);
    const bytes = syntheticResumePdf("HTTP synthetic verification");
    const duplicateIds = await Promise.all(Array.from({ length: 6 }, () => upload(bytes, a.cookie)));
    assert.equal(new Set(duplicateIds).size, 1);
    const ids = [duplicateIds[0], await upload(syntheticResumePdf("HTTP second verification"), a.cookie), await upload(bytes, b.cookie)];
    assert.notEqual(ids[0], ids[2]);
    for (const [index, id] of ids.entries()) {
      const job = await queue.getJob(id); assert.ok(job);
      assert.deepEqual(Object.keys(job.data).sort(), ["storageKey", "userId"]);
      assert.equal(job.data.userId, index === 2 ? b.id : a.id);
      storageKeys.add(job.data.storageKey);
    }
    assert.equal(await queue.getWaitingCount(), 3);
    const waiting = await call(`/api/resumes/status?jobId=${ids[0]}`, a.cookie);
    assert.equal((await waiting.json() as { status: string }).status, "waiting");
    assert.match(waiting.headers.get("cache-control") ?? "", /(?:^|,)\s*no-store(?:,|$)/);
    assert.equal((await call(`/api/resumes/status?jobId=${ids[0]}`, b.cookie)).status, 403);
    checks.push("HTTP202, six concurrent duplicate uploads, three owner-specific jobs, waiting polling and cross-user403");
    console.log("Observed signed-in uploads and waiting-state access checks.");
    phase = "actual worker forced termination";
    worker = child("scripts/resume-worker.ts");
    await until(async () => {
      const job = await queue.getJob(ids[0]); return job?.progress === 35;
    }, 20000);
    await stop(worker); worker = undefined;
    phase = "actual stalled-job restart recovery";
    worker = child("scripts/resume-worker.ts");
    await until(async () => (await Promise.all(ids.map(async (id) => (await queue.getJob(id))?.getState()))).every((state) => state === "completed"), 130000);
    assert.ok(((await queue.getJob(ids[0]))?.attemptsStarted ?? 0) >= 2);
    phase = "completed HTTP status after restart";
    for (const [index, id] of ids.entries()) {
      const response = await call(`/api/resumes/status?jobId=${id}`, index === 2 ? b.cookie : a.cookie);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control") ?? "", /(?:^|,)\s*no-store(?:,|$)/);
      const body = await response.json() as { status: string; progress: number; resumeId: string; parsedData: object };
      assert.equal(body.status, "completed"); assert.equal(body.progress, 100); assert.equal(body.resumeId, `resume_${id}`); assert.ok(body.parsedData);
    }
    assert.equal((await call(`/api/resumes/status?jobId=${ids[0]}`, b.cookie)).status, 403);
    assert.equal(await db.resume.count({ where: { userId: a.id } }), 2);
    assert.equal(await db.resume.count({ where: { userId: a.id, isPrimary: true } }), 1);
    assert.equal(await db.resume.count({ where: { userId: b.id, isPrimary: true } }), 1);
    const vectors = await db.$queryRaw<Array<{ dimensions: number; model: string }>>`SELECT vector_dims("embedding1024") AS dimensions, "embeddingModel" AS model FROM resumes WHERE "userId" IN (${a.id}, ${b.id})`;
    assert.ok(vectors.length === 3 && vectors.every((row) => row.dimensions === 1024 && row.model === "@cf/baai/bge-m3"));
    checks.push("Real worker killed during extraction, restarted with default BullMQ locks, recovered and persisted once; completed HTTP status and1024 BGE vectors");
    console.log("Observed real worker restart recovery and completed-state access checks.");
    await stop(worker); worker = undefined;
    phase = "permanent failure and controlled429 exhaustion";
    const retryTimes: number[] = [];
    faults = createServer((request, response) => {
      request.resume(); request.on("end", () => { retryTimes.push(Date.now()); response.writeHead(429, { "Content-Type": "application/json" }); response.end(JSON.stringify({ error: { message: "PRIVATE_PROVIDER_RESPONSE_CANARY", type: "rate_limit_error", code: "rate_limit_exceeded" } })); });
    });
    faults.listen(35433, "127.0.0.1"); await once(faults, "listening");
    const retryId = await upload(syntheticResumePdf("HTTP retry verification"), a.cookie);
    const brokenId = await upload(Buffer.from("%PDF-1.4\nsynthetic invalid document\n%%EOF"), b.cookie);
    for (const id of [retryId, brokenId]) { const job = await queue.getJob(id); assert.ok(job); storageKeys.add(job.data.storageKey); }
    worker = child("scripts/resume-worker.ts", { GROQ_API_KEY: "synthetic-fault-test", GROQ_BASE_URL: "http://127.0.0.1:35433/v1" });
    await until(async () => (await queue.getJob(retryId))?.getState().then((state) => state === "failed") ?? false, 30000);
    await until(async () => (await queue.getJob(brokenId))?.getState().then((state) => state === "failed") ?? false, 10000);
    const retry = await queue.getJob(retryId); const broken = await queue.getJob(brokenId);
    assert.equal(retry?.attemptsMade, 3); assert.equal(broken?.attemptsMade, 1); assert.equal(retryTimes.length, 3);
    assert.ok(retryTimes[1] - retryTimes[0] >= 900 && retryTimes[2] - retryTimes[1] >= 1800);
    const failed = await call(`/api/resumes/status?jobId=${retryId}`, a.cookie);
    const failure = await failed.json() as { status: string; error: string };
    assert.equal(failure.status, "failed"); assert.equal(failure.error, "Resume processing failed. Please try again later.");
    checks.push("Real processor: controlled Groq429 retried exactly3 times with exponential delays; corrupt PDF stopped after1 attempt; sanitized HTTP failure");
    await stop(worker); worker = undefined;
    phase = "HTTP rate limit and session replay";
    let rateLimited = false;
    for (let i = 0; i < 16; i++) {
      const form = new FormData(); form.set("file", new File([new Uint8Array(bytes)], "synthetic.pdf", { type: "application/pdf" }));
      const response = await call("/api/resumes/upload", a.cookie, { method: "POST", body: form });
      if (response.status === 429) { rateLimited = true; break; } assert.equal(response.status, 202);
    }
    assert.ok(rateLimited);
    const replayCookie = [...jars.get(a.cookie)!].map(([name, value]) => `${name}=${value}`).join("; ");
    const serialized = [...jars.get(a.cookie)!].filter(([name]) => name.includes("auth-token")).sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => value).join("");
    const session = JSON.parse(Buffer.from(decodeURIComponent(serialized).replace(/^base64-/, ""), "base64url").toString()) as { access_token: string };
    const expiry = (JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url").toString()) as { exp: number }).exp;
    assert.equal((await call("/api/auth/sign-out", a.cookie, { method: "POST", headers: { Origin: origin } })).status, 200);
    // Access JWTs survive sign-out until expiry. Replay only after the configured
    // real token lifetime, when the revoked refresh session cannot renew.
    await until(async () => Date.now() > expiry * 1000 + 1000, 130000);
    assert.equal((await fetch(`${origin}/api/resumes/status?jobId=${ids[0]}`, { headers: { Cookie: replayCookie }, signal: AbortSignal.timeout(10000) })).status, 401);
    checks.push("HTTP sliding-window429; signed-out cookie replay denied after real JWT expiry/refresh revocation");
    phase = "queue and process log privacy";
    const forbidden = ["Synthetic Candidate", "HTTP synthetic verification", "HTTP second verification", "HTTP retry verification", "synthetic invalid document", "PRIVATE_PROVIDER_RESPONSE_CANARY", "private-synthetic-name.pdf", ...["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "GROQ_API_KEY", "CLOUDFLARE_AI_API_TOKEN"].map((key) => process.env[key]).filter((value): value is string => Boolean(value))];
    for (const job of await queue.getJobs(["completed", "failed", "wait", "active", "delayed"])) {
      assert.ok(forbidden.every((value) => !JSON.stringify(job.toJSON()).includes(value)));
    }
    assert.ok(forbidden.every((value) => !logs.join("").includes(value)));
    checks.push("Observed job metadata and captured web/worker logs contained no synthetic resume text, original filename, provider response canary or configured secret values");
    console.log("Signed-in HTTP worker verification passed. Hosted schema/Auth untouched; real local Auth/Redis/PostgreSQL and live private R2/Groq/Workers AI used. Controlled429 only for failure scheduling.");
  } catch (error: unknown) {
    for (const match of logs.join("").matchAll(/"event":"onboarding_save_failed","code":"(P1001|P1002|P1017|P2022|P2024|P2028|P2034|ONBOARDING_FAILED)"/g)) console.log(`Onboarding safe diagnostic: ${match[1]}`);
    if (error instanceof assert.AssertionError) {
      const safeValue = (value: unknown) => typeof value === "number" || typeof value === "boolean" ? String(value) : typeof value;
      console.log(`HTTP assertion: ${error.operator}; expected ${safeValue(error.expected)}, observed ${safeValue(error.actual)}.`);
    }
    if (phase === "Next development startup") {
      let safe = logs.join("");
      for (const value of [local.password, childEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, ...Object.entries(process.env).filter(([key]) => /KEY|TOKEN|PASSWORD|URL/.test(key)).map(([, value]) => value)].filter((value): value is string => Boolean(value) && value!.length > 5)) safe = safe.replaceAll(value, "[redacted]");
      console.log(`Isolated Next startup diagnostic: ${safe.slice(-2200)}`);
    }
    throw new Error(`HTTP worker verification failed at: ${phase}. Raw provider/process output withheld.`);
  } finally {
    await stop(worker); await stop(web);
    if (sourceCopied) {
      const resolved = path.resolve(httpRoot);
      assert.ok(resolved.startsWith(path.resolve(".local-services") + path.sep) && path.basename(resolved) === `http-app-${run}`);
      rmSync(resolved, { recursive: true, force: true });
    }
    if (proxy) { proxy.closeAllConnections(); await new Promise<void>((resolve) => proxy!.close(() => resolve())); }
    if (faults) { faults.closeAllConnections(); await new Promise<void>((resolve) => faults!.close(() => resolve())); }
    if (queueOwned) {
      const queue = getResumeQueue();
      for (const job of await queue.getJobs(["completed", "failed", "wait", "active", "delayed"])) if (userIds.includes(job.data.userId)) storageKeys.add(job.data.storageKey);
      await queue.obliterate({ force: true });
      await getJobIngestionQueue().obliterate({ force: true });
      for (const id of userIds) await redis.del(`huntdeck:resume-rate:${createHash("sha256").update(id).digest("hex")}`);
    }
    await closeResumeQueueConnections(); await closeJobIngestionQueue(); redis.disconnect();
    await db.resume.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.jobPosting.deleteMany({ where: { id: { in: syntheticJobIds } } });
    await db.$disconnect();
    if (authCreated && docker(["inspect", "--format", '{{index .Config.Labels "project"}}', authContainer]) === "huntdeck-http-verification") docker(["rm", "-f", authContainer]);
    if (authDbCreated && /^huntdeck_authcheck_[0-9]+$/.test(authDatabase)) sql(`DROP DATABASE ${authDatabase} WITH (FORCE);`);
    const s3 = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! }, maxAttempts: 1 });
    try { for (const Key of storageKeys) await s3.send(new DeleteObjectCommand({ Bucket: "huntdeck-resumes-dev", Key })); }
    catch { throw new Error("Synthetic HTTP storage cleanup failed; raw details withheld."); }
    finally { s3.destroy(); }
    writeFileSync(rolesOnly ? ".local-services/roles-http-verification.json" : onboardingOnly ? ".local-services/onboarding-http-verification.json" : ".local-services/http-worker-verification.json", JSON.stringify({ checkedAt: new Date().toISOString(), phase, checks, cleanup: "local synthetic rows, Auth container/database, owned queue and staged R2 objects removed", complete: rolesOnly ? rolesComplete : onboardingOnly ? onboardingComplete : checks.length === 7 }, null, 2));
  }
});
