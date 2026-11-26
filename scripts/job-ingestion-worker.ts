import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
async function main() {
  const { startJobIngestionWorker } = await import("../src/services/queue/jobIngestionProcessor");
  const runtime = startJobIngestionWorker();
  runtime.worker.on("error", () => console.error("Job ingestion worker connection error."));
  const stop = async () => { await runtime.close(); process.exit(0); };
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
}
main().catch(() => { console.error("Job ingestion worker could not start."); process.exitCode = 1; });
