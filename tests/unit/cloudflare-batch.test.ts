import assert from "node:assert/strict";
import test from "node:test";
import { cloudflareJobReferenceSchema, consumeCloudflareBatch } from "../../src/services/queue/cloudflareBatch";

const jobId = "a".repeat(64);

test("the message contract excludes document text, user data and arbitrary properties", () => {
  assert.equal(cloudflareJobReferenceSchema.safeParse({ version: 1, kind: "resume", jobId }).success, true);
  assert.equal(cloudflareJobReferenceSchema.safeParse({ version: 1, kind: "resume", jobId, text: "private" }).success, false);
  assert.equal(cloudflareJobReferenceSchema.safeParse({ version: 1, kind: "resume", jobId: "invalid" }).success, false);
});

test("acknowledges only durably settled messages and retries independent failures", async () => {
  const outcomes: string[] = [];
  const message = (body: unknown, id: string) => ({ body, ack: () => outcomes.push(`${id}:ack`), retry: () => outcomes.push(`${id}:retry`) });
  await consumeCloudflareBatch([
    message({ version: 1, kind: "resume", jobId }, "settled"),
    message({ version: 1, kind: "job_ingestion", jobId }, "transient"),
    message({ version: 1, kind: "resume", jobId: "bad" }, "invalid"),
    message({ version: 1, kind: "resume", jobId }, "exception"),
  ], async (job) => {
    if (outcomes.length === 3) throw new Error("private provider response");
    return job.kind === "resume" ? "settled" : "retry";
  });
  assert.deepEqual(outcomes, ["settled:ack", "transient:retry", "invalid:retry", "exception:retry"]);
});
