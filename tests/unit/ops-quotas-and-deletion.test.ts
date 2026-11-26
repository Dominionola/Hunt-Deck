import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PROVIDER_QUOTAS,
  RETENTION_AND_SLO_POLICY,
  evaluateProviderQuotaStatus,
} from "../../src/services/ops/usageQuotas";
import { DELETE as deleteAccountRoute } from "../../src/app/api/account/route";

test("evaluateProviderQuotaStatus flags request, cost, and failure-rate breaches", () => {
  const healthy = evaluateProviderQuotaStatus([
    {
      provider: "groq",
      model: "openai/gpt-oss-120b",
      totalRequests: 10,
      successfulRequests: 10,
      failedRequests: 0,
      totalInputTokens: 1000,
      totalOutputTokens: 500,
      totalTokens: 1500,
      avgLatencyMs: 250,
      totalEstimatedCostUsd: 0.01,
    },
  ]);
  assert.equal(healthy.ok, true);
  assert.deepEqual(healthy.alerts, []);

  const breached = evaluateProviderQuotaStatus(
    [
      {
        provider: "groq",
        model: "openai/gpt-oss-120b",
        totalRequests: 501,
        successfulRequests: 300,
        failedRequests: 201,
        totalInputTokens: 1_000_000,
        totalOutputTokens: 500_000,
        totalTokens: 1_500_000,
        avgLatencyMs: 300,
        totalEstimatedCostUsd: 6.5,
      },
    ],
    DEFAULT_PROVIDER_QUOTAS,
  );
  assert.equal(breached.ok, false);
  assert.deepEqual(
    breached.alerts.map((a) => a.reason),
    ["requests_exceeded", "cost_exceeded", "failure_rate_exceeded"],
  );
});

test("RETENTION_AND_SLO_POLICY enforces bounded TTLs and latency targets", () => {
  assert.equal(RETENTION_AND_SLO_POLICY.signedDownloadMaxTtlSeconds, 300);
  assert.equal(RETENTION_AND_SLO_POLICY.signedUploadMaxTtlSeconds, 900);
  assert.equal(RETENTION_AND_SLO_POLICY.stagedOrphanR2MaxAgeHours, 24);
  assert.equal(RETENTION_AND_SLO_POLICY.uploadEnqueueP95Ms, 500);
});

test("DELETE /api/account rejects unauthenticated requests with 401 and no-store", async () => {
  const response = await deleteAccountRoute();
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
