import { z } from "zod";

// Queue messages carry only an opaque reference. The durable job record must
// contain the owner and input reference; neither document text nor credentials
// belong in a message or log.
export const cloudflareJobReferenceSchema = z.object({
  version: z.literal(1),
  kind: z.enum(["resume", "job_ingestion"]),
  jobId: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type CloudflareJobReference = z.infer<typeof cloudflareJobReferenceSchema>;

type QueueMessage = {
  body: unknown;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
};

// A processor may return "settled" only after success or a permanent failure
// has been durably recorded. Redelivery and concurrent execution must be safe.
export type CloudflareJobProcessor = (reference: CloudflareJobReference) => Promise<"settled" | "retry">;

/** Process each message independently; never log untrusted bodies or errors. */
export async function consumeCloudflareBatch(messages: readonly QueueMessage[], processJob: CloudflareJobProcessor): Promise<void> {
  for (const message of messages) {
    const reference = cloudflareJobReferenceSchema.safeParse(message.body);
    if (!reference.success) {
      // Retry malformed messages to the configured dead-letter queue rather
      // than acknowledge and silently lose a message without a job record.
      message.retry();
      continue;
    }
    try {
      if (await processJob(reference.data) === "settled") message.ack();
      else message.retry();
    } catch {
      message.retry();
    }
  }
}
