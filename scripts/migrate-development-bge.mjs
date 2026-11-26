// Explicitly scoped hosted DEVELOPMENT migration. No initial CREATE TABLE SQL,
// reset, db push, remote Auth edits, real-data backfill or automatic rollback.
import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const target = "jeufaeryqcvblejxfanq";
const tables = ["users", "profiles", "resumes", "job_postings", "job_fit_scores", "applications", "dork_discovery_sessions", "company_contacts"];
const migrations = ["20261105000000_initial", "20261117120000_add_bge_m3_1024_embeddings"];
const roles = ["anon", "authenticated"];
const privileges = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER", "MAINTAIN"];
const image = "public.ecr.aws/supabase/postgres:17.11.0.018";
const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const save = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const listed = (values) => values.map(quote).join(",");
for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  const url = new URL(process.env[name] ?? "");
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !(url.hostname === `db.${target}.supabase.co` || (url.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(url.username) === `postgres.${target}`)) || url.pathname !== "/postgres") throw new Error("Exact Huntdeck development target required.");
}
const direct = new URL(process.env.DIRECT_URL);
const env = { ...process.env, PGHOST: direct.hostname, PGPORT: direct.port || "5432", PGUSER: decodeURIComponent(direct.username), PGPASSWORD: decodeURIComponent(direct.password), PGDATABASE: "postgres", PGSSLMODE: "require" };
function sql(query, stage) {
  const args = ["run", "--pull=never", "--rm", "-i", ...["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGSSLMODE"].flatMap((name) => ["--env", name]), "--entrypoint", "psql", image, "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1"];
  const result = spawnSync("docker", args, { input: query, encoding: "utf8", env, timeout: 60000 });
  if (result.status !== 0) throw new Error(`${stage} failed; connection/query details withheld.`);
  return result.stdout.trim();
}
function prisma(args, stage) {
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", ...args], { encoding: "utf8", env: process.env, timeout: 90000 });
  if (result.status !== 0) throw new Error(`${stage} failed; raw engine output withheld${(result.stderr ?? "").match(/P[0-9]{4}/)?.[0] ? ` (${result.stderr.match(/P[0-9]{4}/)[0]})` : ""}.`);
  return result.stdout;
}
const snapshotQuery = `SELECT json_build_object(
 'role',current_user,'database',current_database(),
 'counts',(SELECT json_object_agg(name,n) FROM (${tables.map((table) => `SELECT '${table}' AS name,count(*) AS n FROM public.${table}`).join(" UNION ALL ")}) counts),
 'authUsers',(SELECT count(*) FROM auth.users),'authIdentityDigest',(SELECT md5(string_agg(id::text,',' ORDER BY id)) FROM auth.users),
 'storageObjects',(SELECT count(*) FROM storage.objects),'history',to_regclass('public._prisma_migrations'),
 'legacyVectors',(SELECT json_agg(json_build_object('table',c.relname,'type',format_type(a.atttypid,a.atttypmod)) ORDER BY c.relname) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('resumes','job_postings') AND a.attname='embedding' AND NOT a.attisdropped),
 'newColumns',(SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('resumes','job_postings') AND column_name IN ('embedding1024','embeddingModel','embeddingVersion','contentHash','embeddedAt')),
 'rls',(SELECT json_agg(json_build_object('table',relname,'enabled',relrowsecurity,'forced',relforcerowsecurity) ORDER BY relname) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN (${listed(tables)})),
 'tableAcl',(SELECT json_agg(row_to_json(x)) FROM (SELECT c.relname AS name,pg_get_userbyid(a.grantor) AS grantor,CASE a.grantee WHEN 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type AS privilege,a.is_grantable AS grantable FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE c.relnamespace='public'::regnamespace AND c.relname IN (${listed(tables)}) ORDER BY c.relname,a.grantee,a.privilege_type) x),
 'defaultAcl',(SELECT json_agg(row_to_json(x)) FROM (SELECT pg_get_userbyid(d.defaclrole) AS owner,CASE a.grantee WHEN 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type AS privilege,a.is_grantable AS grantable FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace AND d.defaclobjtype='r' ORDER BY a.grantee,a.privilege_type) x),
 'browserPrivileges',(SELECT count(*) FROM unnest(ARRAY[${listed(tables)}]) t CROSS JOIN unnest(ARRAY[${listed(roles)}]) r CROSS JOIN unnest(ARRAY[${listed(privileges)}]) p WHERE has_table_privilege(r,'public.'||t,p))
);`;
function assertEmptyDevelopment(state) {
  if (state.role !== "postgres" || state.database !== "postgres" || state.authUsers !== 2 || state.storageObjects !== 0 || Object.values(state.counts).some((count) => count !== 0) || state.legacyVectors?.length !== 2 || state.legacyVectors.some((item) => item.type !== "vector(1536)") || state.rls?.length !== 8 || state.rls.some((item) => !item.enabled || item.forced)) throw new Error("Development preconditions changed; inspect before proceeding.");
}
const reportFile = path.resolve(".local-services/hosted-bge-plan.json");
if (!process.argv.includes("--apply")) {
  const rehearsal = json(".local-services/migration-rehearsal-result.json");
  const backup = path.resolve(rehearsal.backup);
  const manifest = json(path.join(backup, "manifest.json"));
  if (!rehearsal.complete || !rehearsal.checks.some((item) => item.passed && item.stage.startsWith("Archived new vectors")) || !rehearsal.checks.some((item) => item.passed && item.stage.startsWith("Default grants reconciled")) || manifest.target !== target || sha(readFileSync(path.join(backup, "huntdeck.pgdump"))) !== manifest.sha256 || Date.now() - Date.parse(manifest.createdAt) > 7200000) throw new Error("Fresh tested backup and complete recovery rehearsal required.");
  const before = JSON.parse(sql(snapshotQuery, "Read-only catalog snapshot"));
  assertEmptyDevelopment(before);
  if (before.history || before.newColumns !== 0) throw new Error("Baseline state differs from reviewed plan.");
  const legacy = "docs/development-verification/legacy.prisma";
  const diff = prisma(["migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", legacy, "--exit-code"], "Live legacy structural equivalence");
  if (!diff.includes("No difference") && !diff.includes("empty")) throw new Error("Expected an observed empty legacy diff.");
  const directory = path.resolve(".local-services/hosted-bge-recovery", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(path.join(directory, "source"), { recursive: true, mode: 0o700 });
  const files = [];
  function copy(entry) {
    for (const item of readdirSync(entry, { withFileTypes: true })) {
      const relative = path.join(entry, item.name);
      if (item.isDirectory()) copy(relative);
      else if (/\.(?:ts|tsx|js|mjs|json|css|sql|prisma|toml)$/.test(item.name)) files.push(relative);
    }
  }
  for (const entry of ["src", "prisma", "scripts", "tests"]) copy(entry);
  files.push("package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs", "eslint.config.mjs");
  const secrets = ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "GROQ_API_KEY", "CLOUDFLARE_AI_API_TOKEN"].map((name) => process.env[name]).filter((value) => value && value.length >= 12);
  const hashes = {};
  for (const file of files) {
    const bytes = readFileSync(file);
    if (secrets.some((secret) => bytes.includes(Buffer.from(secret)))) throw new Error("Provider secret detected in source; snapshot refused.");
    const destination = path.join(directory, "source", file);
    mkdirSync(path.dirname(destination), { recursive: true }); copyFileSync(file, destination); hashes[file.replaceAll("\\", "/")] = sha(bytes);
  }
  const grants = before.tableAcl.filter((item) => roles.includes(item.grantee));
  if (grants.some((item) => item.grantor !== "postgres" || item.grantable)) throw new Error("Unexpected grant chain; review recovery before changing ACLs.");
  const restore = ["-- Exact pre-change grants; review before recovery, never blanket GRANT ALL.", "BEGIN;", ...grants.map((item) => `GRANT ${item.privilege} ON TABLE public.${item.name} TO ${item.grantee};`), ...before.defaultAcl.filter((item) => roles.includes(item.grantee)).map((item) => `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ${item.privilege} ON TABLES TO ${item.grantee}${item.grantable ? " WITH GRANT OPTION" : ""};`), "COMMIT;"];
  writeFileSync(path.join(directory, "restore-original-grants.sql"), restore.join("\n"), { mode: 0o600 });
  save(path.join(directory, "source-manifest.json"), hashes);
  save(reportFile, { target, preparedAt: new Date().toISOString(), backup, backupSha256: manifest.sha256, rehearsalDatabase: rehearsal.database, recovery: directory, before, sourceHashes: hashes, applied: false, checks: [] });
  console.log("Read-only migration preparation passed: fresh tested backup, exact development target, empty legacy diff, private working-tree snapshot and original-grant recovery saved.");
} else {
  const plan = json(reportFile);
  if (plan.target !== target || plan.applied || Date.now() - Date.parse(plan.preparedAt) > 7200000 || sha(readFileSync(path.join(plan.backup, "huntdeck.pgdump"))) !== plan.backupSha256) throw new Error("Fresh unexecuted reviewed plan required.");
  const pause = json(".local-services/development-web-pause.json");
  if (pause.target !== target || !pause.paused || Date.now() - Date.parse(pause.pausedAt) > 7200000) throw new Error("Development write pause required.");
  const paused = spawnSync("powershell.exe", ["-NoProfile", "-Command", "$ErrorActionPreference='Stop'; if (Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue) { exit 1 }; if (Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'resume-worker[.]ts' }) { exit 1 }"], { encoding: "utf8", timeout: 15000, windowsHide: true });
  if (paused.status !== 0) throw new Error("Development web/worker write pause could not be verified.");
  const localMigrations = readdirSync("prisma/migrations", { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => item.name).sort();
  if (JSON.stringify(localMigrations) !== JSON.stringify(migrations)) throw new Error("Unexpected pending migrations; stopped.");
  for (const file of ["prisma/schema.prisma", ...migrations.map((name) => `prisma/migrations/${name}/migration.sql`)]) if (sha(readFileSync(file)) !== plan.sourceHashes[file]) throw new Error("Reviewed schema/migration changed after snapshot.");
  const before = JSON.parse(sql(snapshotQuery, "Final read-only preflight"));
  assertEmptyDevelopment(before);
  if (before.history || before.newColumns !== 0 || JSON.stringify(before) !== JSON.stringify(plan.before)) throw new Error("Catalog/data changed since preparation; stopped.");
  function checked(stage, operation) {
    try { const value = operation(); plan.checks.push({ stage, passed: true }); save(reportFile, plan); return value; }
    catch (error) { plan.checks.push({ stage, passed: false }); save(reportFile, plan); throw error; }
  }
  checked("Reconcile browser table/default privileges", () => sql(`BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'; REVOKE ALL ON TABLE ${tables.map((table) => `public.${table}`).join(",")} FROM anon,authenticated; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon,authenticated; COMMIT;`, "ACL reconciliation"));
  checked("Baseline security equivalence", () => { const state = JSON.parse(sql(snapshotQuery, "Reconciled security check")); if (state.browserPrivileges !== 0 || JSON.stringify(state.rls) !== JSON.stringify(before.rls)) throw new Error("Browser grants/RLS differ from expected baseline."); });
  checked("Record existing initial Prisma baseline", () => prisma(["migrate", "resolve", "--applied", migrations[0]], "Prisma baseline recording"));
  checked("Migration history denies browser roles", () => { if (sql(`SELECT bool_and(NOT has_table_privilege(r,'public._prisma_migrations',p)) FROM unnest(ARRAY[${listed(roles)}]) r CROSS JOIN unnest(ARRAY[${listed(privileges)}]) p;`, "History privilege verification") !== "t") throw new Error("Migration history inherited browser access."); });
  checked("Apply additive BGE migration through Prisma", () => prisma(["migrate", "deploy"], "Additive Prisma migration"));
  checked("Prisma migration status current", () => prisma(["migrate", "status"], "Prisma migration status"));
  checked("Final Prisma schema diff empty", () => prisma(["migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"], "Final structural diff"));
  const after = JSON.parse(sql(snapshotQuery, "Final catalog snapshot"));
  checked("Counts, identities, legacy types, RLS and unrelated grants preserved", () => {
    assertEmptyDevelopment(after);
    if (after.authIdentityDigest !== before.authIdentityDigest || after.newColumns !== 10 || after.browserPrivileges !== 0 || JSON.stringify(after.rls) !== JSON.stringify(before.rls) || JSON.stringify(after.tableAcl.filter((item) => !roles.includes(item.grantee))) !== JSON.stringify(before.tableAcl.filter((item) => !roles.includes(item.grantee))) || JSON.stringify(after.defaultAcl.filter((item) => !roles.includes(item.grantee))) !== JSON.stringify(before.defaultAcl.filter((item) => !roles.includes(item.grantee)))) throw new Error("Final preservation/security verification failed.");
  });
  const history = JSON.parse(sql("SELECT json_agg(json_build_object('name',migration_name,'checksum',checksum,'finished',finished_at IS NOT NULL,'rolledBack',rolled_back_at IS NOT NULL) ORDER BY migration_name) FROM public._prisma_migrations;", "History checksum verification"));
  checked("Two successful Prisma history rows match source checksums", () => {
    if (history?.length !== 2 || history.some((item, index) => item.name !== migrations[index] || !item.finished || item.rolledBack || item.checksum !== plan.sourceHashes[`prisma/migrations/${item.name}/migration.sql`])) throw new Error("Migration history/checksum mismatch.");
  });
  plan.after = after; plan.history = history; plan.applied = true; plan.completedAt = new Date().toISOString(); save(reportFile, plan);
  console.log("Hosted development baseline and additive BGE migration passed: two checksum-matched Prisma records, empty schema diff, preserved Auth identities/legacy vectors/RLS and no browser table/history privileges. No real-data backfill performed.");
}
