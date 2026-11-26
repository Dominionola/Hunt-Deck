// Read-only schema comparison; never prints the connection string or row data.
import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const url = new URL(process.env.DIRECT_URL ?? "");
const target = "jeufaeryqcvblejxfanq";
if (!(url.hostname === `db.${target}.supabase.co` || (url.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(url.username) === `postgres.${target}`))) throw new Error("Expected development target required.");
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], {
  encoding: "utf8", env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL }, timeout: 60000, maxBuffer: 1024 * 1024,
});
if (result.status !== 0) throw new Error("Read-only schema comparison failed; connection details withheld.");
process.stdout.write(result.stdout);
