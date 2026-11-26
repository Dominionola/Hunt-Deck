// Synthetic, opt-in worker fixture. Provider responses are mocked; persistence,
// queue locks/retries and vector SQL use the real isolated local services.
import { loadEnvConfig } from "@next/env";
import { Worker } from "bullmq";
loadEnvConfig(process.cwd());
async function main() {
  if (process.env.HUNTDECK_RUN_HTTP_TESTS !== "1" || !process.env.HUNTDECK_JOB_TEST_BOARD) throw new Error("Explicit synthetic test required.");
  const { processJobIngestion } = await import("../../src/services/queue/jobIngestionProcessor");
  const { JOB_INGESTION_QUEUE } = await import("../../src/services/queue/jobIngestionQueue");
  const { redisConnectionOptions } = await import("../../src/services/queue/resumeQueue");
  const { persistIngestedJob } = await import("../../src/services/jobs/persistJob");
  const { db } = await import("../../src/lib/db");
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (!String(url).startsWith("https://api.cloudflare.com/client/v4/accounts/")) return realFetch(url, init);
    const body = JSON.parse(String(init?.body)) as { text: string[] };
    if (!body.text[0].includes("SYNTHETIC_JOB_CANARY")) throw new Error("Synthetic fixture content required.");
    const vector = Array(1024).fill(0); vector[body.text[0].includes("Beta") ? 1 : 0] = 1;
    return Response.json({ result: { data: [vector] } });
  };
  const worker = new Worker(JOB_INGESTION_QUEUE, async (job) => {
    if (process.env.HUNTDECK_JOB_TEST_HOLD === "1") await new Promise((resolve) => setTimeout(resolve, 30000));
    return processJobIngestion(job, {
      authorized: async (userId) => (await db.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role === "ADMIN",
      allowSource: async () => true,
      fetchBoard: async (source) => {
        if (source.board !== process.env.HUNTDECK_JOB_TEST_BOARD) throw new Error("Unexpected synthetic board.");
        if (process.env.HUNTDECK_JOB_TEST_ALWAYS_FAIL === "1" || (job.attemptsMade === 0 && process.env.HUNTDECK_JOB_TEST_FAIL_FIRST === "1")) {
          const { BoardRequestError } = await import("../../src/services/jobs/adapters/publicBoard");
          throw new BoardRequestError(true);
        }
        return { fetched: 2, selected: 2, invalid: 0, incomplete: false, nextOffset: null, jobs: ["Alpha", "Beta"].map((title) => ({
          title: `Synthetic ${title}`, company: source.board, description: `SYNTHETIC_JOB_CANARY ${title} Python SQL verification listing.`,
          remoteType: "HYBRID" as const, location: "Lagos", atsPlatform: "GREENHOUSE" as const,
          applicationUrl: `https://example.invalid/${source.board}/${title}`,
        })) };
      }, persist: persistIngestedJob,
    });
  }, { connection: redisConnectionOptions(true), concurrency: 1, lockDuration: 1500, stalledInterval: 1000 });
  worker.on("error", () => console.error("Synthetic job worker connection error."));
  const stop = async () => { await worker.close(); await db.$disconnect(); process.exit(0); };
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
}
main().catch(() => { console.error("Synthetic job worker startup failed."); process.exitCode = 1; });
