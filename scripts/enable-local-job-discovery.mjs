// Enable the development-only source workflow without printing secrets.
import { readFileSync, writeFileSync } from "node:fs";
import nextEnv from "@next/env";

if (process.argv[2] !== "--enable-local-development") throw new Error("Explicit local development invocation required.");
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const target = "jeufaeryqcvblejxfanq";
const url = new URL(process.env.DIRECT_URL ?? "");
if (!(url.hostname === `db.${target}.supabase.co` || (url.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(url.username) === `postgres.${target}`))) throw new Error("Expected development target required.");
const file = ".env.local";
let content = readFileSync(file, "utf8");
const newline = content.includes("\r\n") ? "\r\n" : "\n";
for (const [name, value] of [["JOB_SOURCE_OBSERVATIONS_ENABLED", "1"], ["JOB_SOURCE_SCHEDULER_ENABLED", "1"], ["HUNTDECK_ISOLATED_DEV", "1"]]) {
  const pattern = new RegExp(`^[ \\t]*${name}[ \\t]*=.*$`, "gm");
  const matches = [...content.matchAll(pattern)];
  if (matches.length > 1) throw new Error(`Duplicate ${name}; inspect local configuration first.`);
  if (matches.length === 1) content = content.replace(pattern, `${name}="${value}"`);
  else content += `${content.endsWith("\n") || content.length === 0 ? "" : newline}${name}="${value}"${newline}`;
}
writeFileSync(file, content, { encoding: "utf8", mode: 0o600 });
console.log("Observation, scheduler and isolated development cache enabled locally. Closure setting was not changed.");
