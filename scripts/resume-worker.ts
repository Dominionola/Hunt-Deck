import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { startResumeWorker } = await import("../src/services/queue/resumeProcessor");
  const worker = startResumeWorker();
  worker.on("error", () => console.error("Resume worker connection error."));
  const shutdown = async () => { await worker.close(); process.exit(0); };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch(() => { console.error("Resume worker could not start."); process.exitCode = 1; });
