// Restores the latest approved private archive into a fresh, temporary local
// database. Never connects to or modifies the hosted database.
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const backupRoot = path.resolve(".local-services/database-backups");
const latest = readdirSync(backupRoot).filter((entry) => existsSync(path.join(backupRoot, entry, "manifest.json"))).sort().at(-1);
if (!latest) throw new Error("A private development backup is required.");
const backup = path.join(backupRoot, latest);
const manifestPath = path.join(backup, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const archive = readFileSync(path.join(backup, "huntdeck.pgdump"));
if (manifest.target !== "jeufaeryqcvblejxfanq" || manifest.sha256 !== createHash("sha256").update(archive).digest("hex")) throw new Error("Backup identity or checksum mismatch.");
const local = JSON.parse(readFileSync(".local-services/migration-rehearsal-private.json", "utf8"));
if (local.container !== "huntdeck-migration-rehearsal" || local.port !== 55439 || typeof local.password !== "string") throw new Error("Expected isolated local rehearsal is unavailable.");
const env = { ...process.env, PGPASSWORD: local.password };
const database = `huntdeck_verify_${Date.now()}_${randomBytes(4).toString("hex")}`;
if (!/^huntdeck_verify_[0-9]+_[a-f0-9]{8}$/.test(database)) throw new Error("Invalid local database identity.");
function docker(args, input) {
  const result = spawnSync("docker", args, { env, input, encoding: "utf8", timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error("Local restore check failed; raw database output withheld.");
  return result.stdout.trim();
}
const label = docker(["inspect", "--format", '{{index .Config.Labels "project"}}', local.container]);
if (label !== "huntdeck-migration-rehearsal") throw new Error("Local container identity mismatch.");
function sql(query, target = database) {
  return docker(["exec", "-i", local.container, "psql", "-U", "supabase_admin", "-d", target, "-v", "ON_ERROR_STOP=1", "-t", "-A"], query);
}
let created = false;
let restored = false;
try {
  sql(`CREATE DATABASE ${database} TEMPLATE template0;`, "postgres"); created = true;
  docker(["exec", "-i", local.container, "pg_restore", "-U", "supabase_admin", "-d", database, "--no-owner", "--exit-on-error"], archive);
  const checkSql = `SELECT json_build_object(
    'app_tables', (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('users','profiles','resumes','job_postings','job_fit_scores','applications','dork_discovery_sessions','company_contacts')),
    'users', (SELECT count(*) FROM public.users), 'resumes', (SELECT count(*) FROM public.resumes),
    'jobs', (SELECT count(*) FROM public.job_postings), 'auth_users', (SELECT count(*) FROM auth.users),
    'vectors', (SELECT json_agg(format_type(a.atttypid, a.atttypmod) ORDER BY c.relname, a.attname) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('resumes','job_postings') AND a.attname IN ('embedding','embedding1024') AND NOT a.attisdropped));`;
  const checks = JSON.parse(sql(checkSql));
  if (checks.app_tables !== 8) throw new Error("Expected application tables were not restored.");
  if (sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('job_sources','job_source_runs','job_source_records','job_source_observations','job_source_schedules');") !== "0") throw new Error("Source tables already exist in this backup; reconcile before rehearsing.");
  const forward = ["prisma/drafts/job-source-checkpoints.sql", "prisma/drafts/job-source-schedules.sql"].map((file) => readFileSync(file, "utf8"));
  const rollback = ["prisma/drafts/job-source-schedules.rollback.sql", "prisma/drafts/job-source-checkpoints.rollback.sql"].map((file) => readFileSync(file, "utf8"));
  // Adapt only this temporary copy so the application role can run Prisma migrations.
  sql('ALTER SCHEMA public OWNER TO postgres; ALTER TABLE public._prisma_migrations OWNER TO postgres; ALTER TABLE public.job_postings OWNER TO postgres;');
  const localUrl = `postgresql://postgres:${encodeURIComponent(local.password)}@127.0.0.1:55439/${database}?schema=public`;
  const migrate = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
    encoding: "utf8", env: { ...process.env, DATABASE_URL: localUrl, DIRECT_URL: localUrl }, timeout: 60000,
  });
  if (migrate.status !== 0) throw new Error("Prisma migration failed in the isolated copy; connection details withheld.");
  if (sql("SELECT count(*) FROM public._prisma_migrations WHERE migration_name='20261125070000_job_source_tracking' AND finished_at IS NOT NULL AND rolled_back_at IS NULL;") !== "1") throw new Error("Local Prisma migration history was not recorded.");
  const secured = sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('job_sources','job_source_runs','job_source_records','job_source_observations','job_source_schedules') AND c.relrowsecurity AND NOT has_table_privilege('anon',c.oid,'SELECT') AND NOT has_table_privilege('authenticated',c.oid,'SELECT');");
  if (secured !== "5") throw new Error("Draft source tables were not all private with RLS enabled.");
  for (const statement of rollback) sql(statement);
  if (sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('job_sources','job_source_runs','job_source_records','job_source_observations','job_source_schedules');") !== "0") throw new Error("Source rollback did not remove all draft tables.");
  if (JSON.stringify(JSON.parse(sql(checkSql))) !== JSON.stringify(checks)) throw new Error("Application counts or vector types changed during local rehearsal.");
  for (const statement of forward) sql(statement);
  if (sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('job_sources','job_source_runs','job_source_records','job_source_observations','job_source_schedules');") !== "5") throw new Error("Source migration could not be reapplied locally.");
  if (JSON.stringify(JSON.parse(sql(checkSql))) !== JSON.stringify(checks)) throw new Error("Application counts or vector types changed during local reapplication.");
  const diff = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"], {
    encoding: "utf8", env: { ...process.env, DATABASE_URL: localUrl, DIRECT_URL: localUrl }, timeout: 60000,
  });
  if (diff.status !== 0) throw new Error("Local Prisma schema comparison was not empty; connection details withheld.");
  restored = true;
  console.log("Private archive restored locally; Prisma recorded the source migration, and its schema was rolled back and reapplied. Application counts and vector types remained unchanged; source tables had RLS and denied browser-role reads. Row contents withheld.");
} finally {
  if (created) {
    try { sql(`DROP DATABASE ${database} WITH (FORCE);`, "postgres"); }
    catch { console.error(`Temporary local restore cleanup failed for ${database}; remove it from the local rehearsal container after inspection.`); restored = false; }
  }
}
if (!restored) throw new Error("The local restore or cleanup did not complete.");
writeFileSync(manifestPath, JSON.stringify({ ...manifest, restoreTested: true, restoreTestedAt: new Date().toISOString(),
  limitations: ["Local pg_restore used --no-owner and existing local roles; provider configuration, role ownership, role memberships, R2 objects, and hosted disaster recovery were not tested.", "Draft source tables were empty during rollback; restoring populated source tracking data after a rollback was not tested here.", "Application counts and vector types were checked; this does not compare every row with the live database."] }, null, 2), { mode: 0o600 });
console.log("Temporary local restore removed. Hosted database and provider configuration were unchanged.");
