import { consumeCloudflareBatch, cloudflareJobReferenceSchema } from "./cloudflareBatch";
import {
  consumeCloudflareResumeDeadLetterBatch,
  processCloudflareResumeMessage,
  type CloudflareResumeProcessorDeps,
} from "./cloudflareResumeProcessor";
import { deadLetterCloudflareJobIngestionJob } from "./cloudflareJobIngestionJobs";
import {
  processCloudflareJobIngestionMessage,
  type CloudflareJobIngestionDeps,
} from "./cloudflareJobIngestionProcessor";
import { createWorkersProcessorDeps, type WorkersBindingEnv } from "./cloudflareWorkerBindings";
import type { HyperdriveBinding } from "@/lib/dbWorkers";

export interface CloudflareQueueBatch {
  readonly queue: string;
  readonly messages: ReadonlyArray<{
    readonly body: unknown;
    ack(): void;
    retry(options?: { delaySeconds?: number }): void;
  }>;
}

export interface CloudflareWorkerEnv extends WorkersBindingEnv {
  RESUME_DEAD_LETTER_QUEUE_NAME?: string;
  HYPERDRIVE?: HyperdriveBinding;
}

/**
 * Cloudflare Worker queue consumer entrypoint.
 * Dispatches both "resume" and "job_ingestion" messages and handles DLQ settlement.
 * Use createWorkersPrismaClient(env.HYPERDRIVE.connectionString) when running in workerd
 * with a provisioned Hyperdrive binding.
 */
export async function handleCloudflareResumeQueueBatch(
  batch: CloudflareQueueBatch,
  env: CloudflareWorkerEnv,
  deps?: CloudflareResumeProcessorDeps,
  jobIngestionDeps?: CloudflareJobIngestionDeps,
): Promise<void> {
  const dlqName = env.RESUME_DEAD_LETTER_QUEUE_NAME || "huntdeck-resume-dlq";
  if (batch.queue === dlqName || batch.queue.endsWith("-dlq")) {
    const resumeMessages = batch.messages.filter((msg) => {
      const parsed = cloudflareJobReferenceSchema.safeParse(msg.body);
      return !parsed.success || parsed.data.kind === "resume";
    });
    const ingestionMessages = batch.messages.filter((msg) => {
      const parsed = cloudflareJobReferenceSchema.safeParse(msg.body);
      return parsed.success && parsed.data.kind === "job_ingestion";
    });
    if (resumeMessages.length) {
      await consumeCloudflareResumeDeadLetterBatch(resumeMessages);
    }
    for (const msg of ingestionMessages) {
      const parsed = cloudflareJobReferenceSchema.safeParse(msg.body);
      if (!parsed.success) {
        msg.ack();
        continue;
      }
      try {
        await deadLetterCloudflareJobIngestionJob(parsed.data.jobId);
        msg.ack();
      } catch {
        msg.retry();
      }
    }
    return;
  }

  const resolvedResumeDeps = deps ?? createWorkersProcessorDeps(env);
  await consumeCloudflareBatch(batch.messages, async (reference) => {
    if (reference.kind === "job_ingestion") {
      return processCloudflareJobIngestionMessage(reference, jobIngestionDeps);
    }
    return processCloudflareResumeMessage(reference, resolvedResumeDeps);
  });
}

const worker = {
  async queue(batch: CloudflareQueueBatch, env: CloudflareWorkerEnv): Promise<void> {
    await handleCloudflareResumeQueueBatch(batch, env);
  },
};

export default worker;
