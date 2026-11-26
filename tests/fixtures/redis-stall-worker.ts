import { Worker } from "bullmq";
import { redisConnectionOptions } from "../../src/services/queue/resumeQueue";

const name = process.env.HUNTDECK_SYNTHETIC_QUEUE;
if (!name?.startsWith("huntdeck-synthetic-")) throw new Error("Synthetic queue required.");
const worker = new Worker(name, async () => {
  console.log("SYNTHETIC_ACTIVE");
  await new Promise(() => {});
}, { connection: redisConnectionOptions(true), lockDuration: 1000, stalledInterval: 1000 });
worker.on("error", () => { console.error("Synthetic worker connection failure."); });
