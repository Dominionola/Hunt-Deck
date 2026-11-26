// Read-only remote export. Backups are private local artifacts, never Git files.
import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const url = new URL(process.env.DIRECT_URL ?? "");
const target = "jeufaeryqcvblejxfanq";
if (!(url.hostname === `db.${target}.supabase.co` || (url.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(url.username) === `postgres.${target}`))) throw new Error("Approved development target required.");
const directory = path.resolve(".local-services/database-backups", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(directory, { recursive: true, mode: 0o700 });
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: url.pathname.slice(1), PGSSLMODE: "require" };
const image = "public.ecr.aws/supabase/postgres:17.11.0.018";
const common = ["run", "--pull=never", "--rm", "--mount", `type=bind,source=${directory},target=/backup`];
for (const key of ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGSSLMODE"]) common.push("--env", key);
function run(args, stage) {
  const result = spawnSync("docker", [...common, "--entrypoint", args[0], image, ...args.slice(1)], { encoding: "utf8", env, timeout: 120000 });
  if (result.status !== 0) {
    console.error(`${stage} failed; connection details withheld. No remote writes were performed.`);
    process.exit(1);
  }
  return result.stdout;
}
run(["pg_dump", "--format=custom", "--file=/backup/huntdeck.pgdump"], "Database export");
const listing = run(["pg_restore", "--list", "/backup/huntdeck.pgdump"], "Archive validation");
const checksum = createHash("sha256").update(readFileSync(path.join(directory, "huntdeck.pgdump"))).digest("hex");
writeFileSync(path.join(directory, "manifest.json"), JSON.stringify({ target, createdAt: new Date().toISOString(), image, sha256: checksum, archiveEntries: listing.split("\n").filter((line) => line && !line.startsWith(";")).length, restoreTested: false }, null, 2), { mode: 0o600 });
console.log(`Development database exported and archive listing validated at ${path.relative(process.cwd(), directory)}. SHA-256 recorded privately. This is not a successful restore test; provider settings and R2 objects require separate recovery.`);
