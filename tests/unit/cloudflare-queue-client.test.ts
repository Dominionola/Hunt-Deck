import assert from "node:assert/strict";
import test from "node:test";
import {
  createCloudflareQueueBindingSender,
  createCloudflareQueueRestSender,
  isCloudflareResumeQueueEnabled,
} from "../../src/services/queue/cloudflareQueueClient";

test("BullMQ remains default when RESUME_QUEUE_BACKEND is unset or not cloudflare", () => {
  const prev = process.env.RESUME_QUEUE_BACKEND;
  try {
    delete process.env.RESUME_QUEUE_BACKEND;
    assert.equal(isCloudflareResumeQueueEnabled(), false);
    process.env.RESUME_QUEUE_BACKEND = "bullmq";
    assert.equal(isCloudflareResumeQueueEnabled(), false);
    process.env.RESUME_QUEUE_BACKEND = "cloudflare";
    assert.equal(isCloudflareResumeQueueEnabled(), true);
  } finally {
    if (prev === undefined) delete process.env.RESUME_QUEUE_BACKEND;
    else process.env.RESUME_QUEUE_BACKEND = prev;
  }
});

test("createCloudflareQueueRestSender fails closed when configuration is missing", () => {
  assert.throws(
    () => createCloudflareQueueRestSender({ accountId: "", queueId: "", apiToken: "" }),
    /not configured/,
  );
  assert.throws(
    () => createCloudflareQueueRestSender({ accountId: "bad", queueId: "a".repeat(32), apiToken: "tok" }),
    /not configured/,
  );
});

test("createCloudflareQueueRestSender sends reference-only payload and never leaks token on failure", async () => {
  const secretToken = "cf_secret_token_do_not_leak";
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedBody = "";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedBody = String(init?.body ?? "");
    return new Response(JSON.stringify({ success: false, errors: [{ message: secretToken }] }), { status: 500 });
  }) as typeof fetch;

  try {
    const sender = createCloudflareQueueRestSender({
      accountId: "a".repeat(32),
      queueId: "b".repeat(32),
      apiToken: secretToken,
    });
    const jobId = "c".repeat(64);
    await assert.rejects(
      () => sender({ version: 1, kind: "resume", jobId }),
      (err: unknown) => err instanceof Error && !err.message.includes(secretToken),
    );
    assert.equal(
      capturedUrl,
      `https://api.cloudflare.com/client/v4/accounts/${"a".repeat(32)}/queues/${"b".repeat(32)}/messages`,
    );
    assert.deepEqual(JSON.parse(capturedBody), { body: { version: 1, kind: "resume", jobId } });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createCloudflareQueueBindingSender validates strict reference schema before send", async () => {
  const sent: unknown[] = [];
  const sender = createCloudflareQueueBindingSender({
    async send(body: unknown) {
      sent.push(body);
    },
  });
  const jobId = "d".repeat(64);
  await sender({ version: 1, kind: "resume", jobId });
  assert.deepEqual(sent, [{ version: 1, kind: "resume", jobId }]);
});
