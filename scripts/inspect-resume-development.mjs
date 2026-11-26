// Read-only inspection: never applies migrations or invokes AI providers.
import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const projectRef = "jeufaeryqcvblejxfanq";
const required = ["DATABASE_URL", "DIRECT_URL", "REDIS_URL", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "GROQ_API_KEY", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_AI_API_TOKEN"];
console.log(JSON.stringify({ configuration: Object.fromEntries(required.map((key) => [key, process.env[key] ? "present" : "missing"])) }));

function matchesTarget(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ["postgres:", "postgresql:"].includes(url.protocol) &&
      (url.hostname === `db.${projectRef}.supabase.co` ||
        (url.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(url.username) === `postgres.${projectRef}`));
  } catch { return false; }
}
if (![process.env.DATABASE_URL, process.env.DIRECT_URL].every(matchesTarget)) {
  console.error("Stopped: both database settings must identify the approved Huntdeck development project.");
  process.exitCode = 1;
} else {
  const directory = path.resolve("docs/development-verification");
  mkdirSync(directory, { recursive: true });
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const legacy = schema.split(/\r?\n/).filter((line) => !/^\s*(embedding1024|embeddingModel|embeddingVersion|contentHash|embeddedAt)\s/.test(line) && !line.includes("@@index([contentHash,")).join("\n");
  const legacyPath = path.join(directory, "legacy.prisma");
  writeFileSync(legacyPath, legacy);
  function diff(name, args) {
    const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", ...args, "--script"], { encoding: "utf8", env: process.env, timeout: 60000 });
    // Do not echo engine errors: they can contain connection details.
    if (result.status !== 0) {
      console.error(`${name}: failed (details withheld; no database changes performed).`);
      process.exitCode = 1;
      return null;
    }
    writeFileSync(path.join(directory, `${name}.sql`), result.stdout);
    console.log(`${name}: read-only comparison saved.`);
    return result.stdout;
  }
  const generated = diff("generated-initial", ["--from-empty", "--to-schema-datamodel", legacyPath]);
  const canonical = (sql) => sql.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();
  if (generated !== null) {
    // Prisma does not represent the hand-written RLS/ACL tail. Inspect that
    // separately before ever recording the initial migration as applied.
    const initial = readFileSync("prisma/migrations/20261105000000_initial/migration.sql", "utf8");
    const matches = canonical(generated) === canonical(initial.split("-- Deny direct API access")[0]);
    console.log(JSON.stringify({ initialStructuralSqlMatchesLegacyDatamodel: matches, baselineReady: false, remaining: "Verify and reconcile RLS/ACL tail; establish tested recovery before recording history." }));
    if (!matches) process.exitCode = 1;
  }
  diff("live-to-legacy", ["--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", legacyPath]);
  diff("live-to-bge", ["--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/schema.prisma"]);
}
