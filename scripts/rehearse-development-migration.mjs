// Restores a verified private archive into a NEW local-only container. Never
// connects to the hosted database and never changes the app's DATABASE_URL.
import { spawnSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const backupRoot = path.resolve(".local-services/database-backups");
const latest = readdirSync(backupRoot).filter((entry) => existsSync(path.join(backupRoot, entry, "manifest.json"))).sort().at(-1);
if (!latest) throw new Error("A private development backup is required.");
const backup = path.join(backupRoot, latest);
const manifest = JSON.parse(readFileSync(path.join(backup, "manifest.json"), "utf8"));
if (manifest.target !== "jeufaeryqcvblejxfanq" || manifest.sha256 !== createHash("sha256").update(readFileSync(path.join(backup, "huntdeck.pgdump"))).digest("hex")) throw new Error("Backup identity/checksum mismatch.");
const name = "huntdeck-migration-rehearsal";
const database = `huntdeck_recovery_${Date.now()}`;
const resume = process.argv.includes("--resume");
const privatePath = path.resolve(".local-services/migration-rehearsal-private.json");
const password = resume ? JSON.parse(readFileSync(privatePath, "utf8")).password : randomBytes(32).toString("hex");
const env = { ...process.env, POSTGRES_PASSWORD: password, PGPASSWORD: password };
const results = { target: "isolated local Docker only", database, backup: path.relative(root, backup), checks: [], complete: false };
const report = path.resolve(".local-services/migration-rehearsal-result.json");
function docker(args, stage, input) {
  const result = spawnSync("docker", args, { encoding: "utf8", env, timeout: 120000, input });
  if (result.status !== 0) {
    results.checks.push({ stage, passed: false });
    writeFileSync(report, JSON.stringify(results, null, 2), { mode: 0o600 });
    // Raw errors can echo restored data. Only emit a fixed stage and category.
    const errorText = result.stderr ?? "";
    const category = /role .* does not exist/.test(errorText) ? "missing local role" : /already exists/.test(errorText) ? "local object conflict" : /permission denied|must be superuser/.test(errorText) ? "local role privilege mismatch" : /extension.*not available|could not open extension/.test(errorText) ? "missing local extension" : /unrecognized configuration/.test(errorText) ? "unsupported local configuration" : "details withheld";
    throw new Error(`${stage} failed (${category}); hosted database unchanged.`);
  }
  return result.stdout;
}
const existing = docker(["ps", "-a", "--filter", `name=^/${name}$`, "--format", "{{.Names}}"], "Container inventory").trim();
if (existing && !resume) throw new Error("Rehearsal container already exists; preserve and inspect it instead of replacing it.");
if (resume && (!existing || docker(["inspect", "--format", '{{index .Config.Labels "project"}}', name], "Local identity check").trim() !== "huntdeck-migration-rehearsal")) throw new Error("Existing local rehearsal identity required.");
if (!resume) {
docker(["run", "--pull=never", "-d", "--name", name, "--label", "project=huntdeck-migration-rehearsal", "--publish", "127.0.0.1:55439:5432", "--env", "POSTGRES_PASSWORD", "--mount", `type=bind,source=${backup},target=/backup,readonly`, "--mount", `type=bind,source=${path.resolve("prisma/migrations")},target=/migrations,readonly`, "--mount", `type=volume,source=${name},target=/var/lib/postgresql/data`, manifest.image], "Local database start");
writeFileSync(privatePath, JSON.stringify({ container: name, password, port: 55439 }), { mode: 0o600 });
}
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  const check = spawnSync("docker", ["exec", "--env", "PGPASSWORD", name, "psql", "-h", "127.0.0.1", "-U", "postgres", "-d", "postgres", "-t", "-A", "-c", "SELECT 1"], { encoding: "utf8", env, timeout: 5000 });
  if (check.status === 0) { ready = true; break; }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready) throw new Error("Isolated local PostgreSQL did not become ready.");
function sql(query, stage, dbName = database) {
  return docker(["exec", "-i", name, "psql", "-U", "supabase_admin", "-d", dbName, "-v", "ON_ERROR_STOP=1", "-t", "-A"], stage, query).trim();
}
sql(`DO $$ DECLARE r text; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role','supabase_admin','supabase_auth_admin','supabase_storage_admin','supabase_functions_admin','dashboard_user','authenticator','pgbouncer','supabase_etl_admin','supabase_privileged_role','supabase_read_only_user','supabase_realtime_admin','supabase_replication_admin'] LOOP IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('CREATE ROLE %I NOLOGIN',r); END IF; END LOOP; END $$;`, "Local restore roles", "postgres");
sql(`CREATE DATABASE ${database} TEMPLATE template0;`, "Fresh local restore database", "postgres");
// Stream the archive whose manifest was just verified. A resumed container's
// original /backup mount can still point at an older export directory.
docker(["exec", "-i", name, "pg_restore", "-U", "supabase_admin", "-d", database, "--no-owner", "--exit-on-error"], "Logical archive restore", readFileSync(path.join(backup, "huntdeck.pgdump")));
results.checks.push({ stage: "Logical archive restore", passed: true });
sql('ALTER SCHEMA public OWNER TO postgres; ALTER TABLE public.users OWNER TO postgres; ALTER TABLE public.profiles OWNER TO postgres; ALTER TABLE public.resumes OWNER TO postgres; ALTER TABLE public.job_postings OWNER TO postgres; ALTER TABLE public.job_fit_scores OWNER TO postgres; ALTER TABLE public.applications OWNER TO postgres; ALTER TABLE public.dork_discovery_sessions OWNER TO postgres; ALTER TABLE public.company_contacts OWNER TO postgres;', "Local application ownership adaptation");
const restored = JSON.parse(sql("SELECT json_build_object('authUsers',(SELECT count(*) FROM auth.users),'resumes',(SELECT count(*) FROM public.resumes),'jobs',(SELECT count(*) FROM public.job_postings),'users',(SELECT count(*) FROM public.users));", "Restored counts"));
if (restored.authUsers !== 2 || restored.resumes !== 0 || restored.jobs !== 0 || restored.users !== 0) throw new Error("Unexpected restored counts; hosted database unchanged.");
results.checks.push({ stage: "Restored Auth/application counts", passed: true });
sql('REVOKE ALL ON TABLE public.users,public.profiles,public.resumes,public.job_postings,public.job_fit_scores,public.applications,public.dork_discovery_sessions,public.company_contacts FROM anon,authenticated;', "Local baseline ACL reconciliation");
sql('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon,authenticated;', "Local private-table default grants");
const localUrl = `postgresql://postgres:${password}@127.0.0.1:55439/${database}?schema=public`;
function prisma(args, stage) {
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", ...args], { encoding: "utf8", env: { ...process.env, DATABASE_URL: localUrl, DIRECT_URL: localUrl }, timeout: 60000 });
  if (result.status !== 0) throw new Error(`${stage} failed; details withheld; hosted database unchanged.`);
  results.checks.push({ stage, passed: true });
}
prisma(["migrate", "resolve", "--applied", "20261105000000_initial"], "Local baseline history");
if (sql("SELECT bool_and(NOT has_table_privilege(r, 'public._prisma_migrations', p)) FROM unnest(ARRAY['anon','authenticated']) r CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p;", "Local migration history denies browser roles") !== "t") throw new Error("Local migration history inherited browser privileges.");
results.checks.push({ stage: "Default grants reconciled before baseline; migration history denies anon/authenticated", passed: true });
const legacy = JSON.stringify([0.125, ...new Array(1535).fill(0)]);
sql(`INSERT INTO public.users(id,email,"updatedAt") VALUES ('synthetic-migration-owner','synthetic-migration@example.invalid',now()); INSERT INTO public.resumes(id,"userId","originalFileUrl","extractedText","parsedData",embedding,"updatedAt") VALUES ('synthetic-resume','synthetic-migration-owner','synthetic://fixture','synthetic','{}','${legacy}'::vector,now()); INSERT INTO public.job_postings(id,title,company,description,"applicationUrl",embedding,"updatedAt") VALUES ('synthetic-job','Synthetic role','Synthetic company','synthetic','https://example.invalid','${legacy}'::vector,now());`, "Synthetic legacy sentinels");
prisma(["migrate", "deploy"], "Local additive Prisma migration");
const newVector = JSON.stringify(new Array(1024).fill(0.03125));
for (const table of ["resumes", "job_postings"]) sql(`UPDATE public.${table} SET "embedding1024"='${newVector}'::vector,"embeddingModel"='synthetic-test-embedding',"embeddingVersion"='1',"contentHash"=repeat('a',64),"embeddedAt"='2026-11-24T00:00:00Z';`, "Synthetic new vector writes");
if (sql('SELECT vector_dims(embedding)||\',\'||vector_dims("embedding1024") FROM public.resumes WHERE id=\'synthetic-resume\';', "Vector dimensions") !== "1536,1024") throw new Error("Vector dimension mismatch.");
function newVectorSnapshot(table, id) {
  return JSON.parse(sql(`SELECT json_build_object('id',id,'vector',"embedding1024"::text,'model',"embeddingModel",'generation',"embeddingVersion",'hash',"contentHash",'at',"embeddedAt"::text) FROM public.${table} WHERE id='${id}';`, "Synthetic vector metadata snapshot"));
}
const newVectorArchive = [["resumes", "synthetic-resume"], ["job_postings", "synthetic-job"]].map(([table, id]) => ({ table, id, fields: newVectorSnapshot(table, id) }));
const newVectorArchivePath = path.resolve(".local-services", `${database}-bge-vectors.json`);
writeFileSync(newVectorArchivePath, JSON.stringify(newVectorArchive), { mode: 0o600 });
results.newVectorArchive = path.relative(root, newVectorArchivePath);
sql(readFileSync("prisma/migrations/20261117120000_add_bge_m3_1024_embeddings/rollback.sql", "utf8"), "Local destructive reversal rehearsal");
for (const [table, id] of [["resumes", "synthetic-resume"], ["job_postings", "synthetic-job"]]) {
  if (sql(`SELECT embedding::text FROM public.${table} WHERE id='${id}';`, "Legacy vector preservation") !== legacy) throw new Error("Legacy sentinel changed.");
}
results.checks.push({ stage: "Reversal preserved both legacy vectors exactly", passed: true });
sql(readFileSync("prisma/migrations/20261117120000_add_bge_m3_1024_embeddings/migration.sql", "utf8"), "Local forward reapplication");
for (const [index, archived] of JSON.parse(readFileSync(newVectorArchivePath, "utf8")).entries()) {
  const expected = newVectorArchive[index];
  if (!expected || archived.table !== expected.table || archived.id !== expected.id || JSON.stringify(archived.fields) !== JSON.stringify(expected.fields)) throw new Error("Synthetic vector archive changed.");
  const payload = JSON.stringify(archived.fields).replaceAll("'", "''");
  sql(`UPDATE public.${expected.table} AS target SET "embedding1024"=saved.vector::vector,"embeddingModel"=saved.model,"embeddingVersion"=saved.generation,"contentHash"=saved.hash,"embeddedAt"=saved.at FROM jsonb_to_record('${payload}'::jsonb) AS saved(id text,vector text,model text,generation text,hash text,at timestamptz) WHERE target.id='${expected.id}' AND target.id=saved.id;`, "Restore archived synthetic vectors and metadata");
  if (JSON.stringify(newVectorSnapshot(expected.table, expected.id)) !== JSON.stringify(expected.fields)) throw new Error("Synthetic vector metadata recovery differed.");
  if (sql(`SELECT embedding::text FROM public.${expected.table} WHERE id='${expected.id}';`, "Legacy vector after metadata recovery") !== legacy) throw new Error("Legacy vector changed during metadata recovery.");
}
results.checks.push({ stage: "Archived new vectors and all metadata restored exactly after reversal/reapplication; both legacy vectors retained", passed: true });
prisma(["migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"], "Local final schema diff empty");
sql("DELETE FROM public.resumes WHERE id='synthetic-resume'; DELETE FROM public.job_postings WHERE id='synthetic-job'; DELETE FROM public.users WHERE id='synthetic-migration-owner';", "Local synthetic cleanup");
results.complete = true;
results.limitations = ["Logical restore used no-owner and placeholder NOLOGIN roles; provider role passwords, role memberships, Supabase settings and hosted restore remain unverified.", "Reversal/reapplication was isolated rehearsal; use a compensating migration for successful hosted migration history.", "New-vector archive recovery covered two synthetic sentinels only; take a fresh complete private archive before any future reversal."];
writeFileSync(report, JSON.stringify(results, null, 2), { mode: 0o600 });
writeFileSync(path.join(backup, "manifest.json"), JSON.stringify({ ...manifest, restoreTested: true, restoreTestedAt: new Date().toISOString(), localRestoreDatabase: database, limitations: results.limitations }, null, 2), { mode: 0o600 });
console.log("Isolated logical restore, Auth counts, baseline, forward/reverse/forward vector preservation and empty final Prisma diff passed. Hosted database unchanged. Private local report saved.");
