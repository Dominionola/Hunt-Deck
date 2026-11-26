import assert from "node:assert/strict";
import test from "node:test";
import { formatQuotaBreachSummary, sendOpsAlert } from "../../src/services/ops/opsAlerts";
import { GET as getOpsQuotas } from "../../src/app/api/ops/quotas/route";

test("sendOpsAlert skips cleanly when OPS_ALERT_WEBHOOK_URL is unset and rejects non-HTTPS", async () => {
  const skipped = await sendOpsAlert(
    { severity: "warning", category: "quota_breach", summary: "Quota check" },
    { webhookUrl: "" },
  );
  assert.deepEqual(skipped, { sent: false, skipped: true });

  await assert.rejects(
    () =>
      sendOpsAlert(
        { severity: "warning", category: "quota_breach", summary: "Quota check" },
        { webhookUrl: "http://insecure.example.com/hook" },
      ),
    /HTTPS/,
  );
});

test("sendOpsAlert posts aggregate-only payload to HTTPS webhook", async () => {
  let capturedBody = "";
  const result = await sendOpsAlert(
    {
      severity: "critical",
      category: "dead_letter",
      summary: formatQuotaBreachSummary([{ provider: "groq", model: "openai/gpt-oss-120b", reason: "cost_exceeded" }]),
      counts: { deadLettered: 2 },
    },
    {
      webhookUrl: "https://alerts.example.com/webhook",
      fetcher: (async (_url: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = String(init?.body ?? "");
        return new Response(null, { status: 204 });
      }) as typeof fetch,
    },
  );
  assert.deepEqual(result, { sent: true, skipped: false });
  const parsed = JSON.parse(capturedBody) as { service: string; severity: string; counts: { deadLettered: number } };
  assert.equal(parsed.service, "huntdeck");
  assert.equal(parsed.severity, "critical");
  assert.equal(parsed.counts.deadLettered, 2);
});

test("GET /api/ops/quotas rejects unauthenticated requests with 401 and no-store", async () => {
  const response = await getOpsQuotas();
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
