import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { Queue } = await import("bullmq");
  const { redisConnectionOptions, RESUME_QUEUE } = await import("../src/services/queue/resumeQueue");
  const { JOB_INGESTION_QUEUE } = await import("../src/services/queue/jobIngestionQueue");
  const { inspectWorkerQueue, workerQueueHealthy } = await import("../src/services/queue/workerHealth");
  const configuredLimit = process.env.WORKER_HEALTH_MAX_WAITING ?? "20";
  if (!/^\d{1,6}$/.test(configuredLimit)) throw new Error("Invalid queue threshold.");
  const maxWaiting = Number(configuredLimit);
  const connection = { ...redisConnectionOptions(), retryStrategy: () => null };
  const queues = [RESUME_QUEUE, JOB_INGESTION_QUEUE].map((name) => {
    const queue = new Queue(name, { connection });
    queue.on("error", () => {});
    return queue;
  });
  try {
    const statuses = await Promise.all(queues.map((queue) => inspectWorkerQueue(queue.name, queue)));
    const healthy = statuses.every((status) => workerQueueHealthy(status, maxWaiting));
    console.log(JSON.stringify({ event: "worker_health", healthy, maxWaiting, queues: statuses }));
    if (!healthy) process.exitCode = 1;
  } finally {
    await Promise.all(queues.map((queue) => queue.close()));
  }
}

const timeout = setTimeout(() => {
  console.error(JSON.stringify({ event: "worker_health_unavailable" }));
  process.exit(1);
}, 10000);
main().catch(() => {
  console.error(JSON.stringify({ event: "worker_health_unavailable" }));
  process.exitCode = 1;
}).finally(() => clearTimeout(timeout));
