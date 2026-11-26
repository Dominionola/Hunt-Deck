// Applies only the reviewed source migration to the explicitly named development
// project, after a fresh private backup and isolated restore rehearsal.
import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

if (process.argv[2] !== "--apply-confirmed-huntdeck-development") throw new Error("Explicit development migration invocation required.");
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const url = new URL(process.env.DIRECT_URL ?? "");
const target = "jeufaeryqcvblejxfanq";
if (!(url.hostname === `db.${target}.supabase.co` || (url.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(url.username) === `postgres.${target}`))) throw new Error("Expected development target required.");
const root = path.resolve(".local-services/database-backups");
const latest = readdirSync(root).filter((name) => existsSync(path.join(root, name, "manifest.json"))).sort().at(-1);
if (!latest) throw new Error("A verified development backup is required.");
const backup = path.join(root, latest);
const manifest = JSON.parse(readFileSync(path.join(backup, "manifest.json"), "utf8"));
const age = Date.now() - Date.parse(manifest.createdAt);
const restored = Date.parse(manifest.restoreTestedAt);
if (manifest.target !== target || manifest.restoreTested !== true || !Number.isFinite(age) || age < 0 || age > 30 * 60 * 1000 || !Number.isFinite(restored) || restored < Date.parse(manifest.createdAt) || manifest.sha256 !== createHash("sha256").update(readFileSync(path.join(backup, "huntdeck.pgdump"))).digest("hex")) throw new Error("Fresh restored backup verification required.");
const expected = ["20261105000000_initial", "20261117120000_add_bge_m3_1024_embeddings", "20261125070000_job_source_tracking"];
const migrations = readdirSync("prisma/migrations", { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
if (JSON.stringify(migrations) !== JSON.stringify(expected)) throw new Error("Unexpected Prisma migrations; inspect before applying.");
const expectedSql = readFileSync("prisma/drafts/job-source-checkpoints.sql", "utf8") + "\n" + readFileSync("prisma/drafts/job-source-schedules.sql", "utf8");
if (readFileSync("prisma/migrations/20261125070000_job_source_tracking/migration.sql", "utf8") !== expectedSql) throw new Error("Migration differs from rehearsed source drafts.");
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
  encoding: "utf8", env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL }, timeout: 120000, maxBuffer: 1024 * 1024,
});
if (result.status !== 0) throw new Error("Development migration did not complete; inspect migration state before retrying. Raw details withheld.");
console.log("Development Prisma migration completed; verify migration history, table permissions and schema before enabling any feature flags.");
