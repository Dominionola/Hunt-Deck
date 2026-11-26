import assert from "node:assert/strict";
import test from "node:test";
import { sendTransactionalEmail } from "../../src/services/email/resendAdapter";

const baseInput = {
  ownerId: "user_123",
  to: "candidate@example.com",
  subject: "First-Mover Alert: Engineer",
  html: "<p>Synthetic role match</p>",
  text: "Synthetic role match",
  idempotencyKey: "alert_user_123_job_456",
};

test("fails closed when RESEND_API_KEY or EMAIL_FROM is missing or placeholder", async () => {
  await assert.rejects(
    () => sendTransactionalEmail(baseInput, { apiKey: "", from: "Hunt Deck <alerts@huntdeck.io>" }),
    /not configured/,
  );
  await assert.rejects(
    () => sendTransactionalEmail(baseInput, { apiKey: "re_your_resend_api_key", from: "Hunt Deck <alerts@huntdeck.io>" }),
    /not configured/,
  );
  await assert.rejects(
    () => sendTransactionalEmail(baseInput, { apiKey: "re_test_valid", from: "" }),
    /not configured/,
  );
});

test("forwards Idempotency-Key across bounded transient retries and succeeds", async () => {
  let calls = 0;
  const seenIdempotencyKeys: string[] = [];
  const sleeps: number[] = [];

  const result = await sendTransactionalEmail(baseInput, {
    apiKey: "re_live_secret_token",
    from: "Hunt Deck <alerts@huntdeck.io>",
    maxAttempts: 3,
    rateBuckets: new Map(),
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    fetcher: (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls++;
      const headers = init?.headers as Record<string, string>;
      seenIdempotencyKeys.push(headers["Idempotency-Key"]);
      if (calls < 3) {
        return new Response(JSON.stringify({ message: "rate limited" }), { status: 429 });
      }
      return new Response(JSON.stringify({ id: "email_msg_001" }), { status: 200 });
    }) as typeof fetch,
  });

  assert.equal(result.id, "email_msg_001");
  assert.equal(result.attempts, 3);
  assert.deepEqual(seenIdempotencyKeys, [
    "alert_user_123_job_456",
    "alert_user_123_job_456",
    "alert_user_123_job_456",
  ]);
  assert.deepEqual(sleeps, [250, 500]);
});

test("does not retry permanent 4xx errors and never leaks PII or API key", async () => {
  let calls = 0;
  const secretKey = "re_secret_do_not_leak";
  const secretEmail = "private.candidate@example.com";

  await assert.rejects(
    () =>
      sendTransactionalEmail(
        { ...baseInput, to: secretEmail },
        {
          apiKey: secretKey,
          from: "Hunt Deck <alerts@huntdeck.io>",
          maxAttempts: 3,
          rateBuckets: new Map(),
          sleep: async () => {},
          fetcher: (async () => {
            calls++;
            return new Response(JSON.stringify({ message: `${secretKey} ${secretEmail}` }), { status: 422 });
          }) as typeof fetch,
        },
      ),
    (err: unknown) =>
      err instanceof Error &&
      !err.message.includes(secretKey) &&
      !err.message.includes(secretEmail),
  );

  assert.equal(calls, 1);
});

test("enforces per-owner hourly sliding-window rate limit", async () => {
  const buckets = new Map<string, number[]>();
  const config = {
    apiKey: "re_test_valid",
    from: "Hunt Deck <alerts@huntdeck.io>",
    maxPerHour: 2,
    rateBuckets: buckets,
    fetcher: (async () => new Response(JSON.stringify({ id: "ok" }), { status: 200 })) as typeof fetch,
  };

  await sendTransactionalEmail(baseInput, config);
  await sendTransactionalEmail({ ...baseInput, idempotencyKey: "alert_user_123_job_789" }, config);
  await assert.rejects(
    () => sendTransactionalEmail({ ...baseInput, idempotencyKey: "alert_user_123_job_999" }, config),
    /rate limit exceeded/i,
  );
});
