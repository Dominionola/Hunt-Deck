import { it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { syntheticResumePdf } from "../fixtures/syntheticResume";
import { stageResumeForWorker, readStagedResume, generatePresignedDownloadUrl, deleteStagedResume } from "../../src/services/storage/r2Service";

it("verifies the real private R2 S3 upload, integrity, ownership and signed download path", { skip: process.env.HUNTDECK_RUN_R2_TESTS !== "1", timeout: 90000 }, async () => {
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  assert.equal(process.env.R2_ACCOUNT_ID, "093d489fa9bb46a82db650872b75b57e");
  assert.equal(process.env.R2_BUCKET_NAME, "huntdeck-resumes-dev");
  assert.ok(!process.env.R2_PUBLIC_URL, "Public storage configuration must remain empty.");
  assert.ok(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY, "Save bucket-scoped R2 credentials locally before running this test.");
  const client = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }, maxAttempts: 1 });
  const owner = `synthetic_${randomUUID()}`;
  const bytes = syntheticResumePdf("S3 credential path verification");
  const expected = `resumes/${owner}/${createHash("sha256").update(bytes).digest("hex")}.pdf`;
  const checks: Record<string, boolean | string> = { managementApiMocked: false, s3Mocked: false };
  let phase = "upload";
  let attempted = false;
  try {
    attempted = true;
    const keys = await Promise.all(Array.from({ length: 3 }, () => stageResumeForWorker(owner, "synthetic.pdf", bytes)));
    assert.ok(keys.every((key) => key === expected));
    checks.concurrentContentAddressedStaging = true;
    phase = "download integrity";
    assert.ok((await readStagedResume(owner, expected)).equals(bytes));
    checks.sameOwnerRoundTrip = true;
    phase = "cross-owner rejection";
    await assert.rejects(readStagedResume(`${owner}_other`, expected));
    await assert.rejects(generatePresignedDownloadUrl(`${owner}_other`, expected));
    checks.crossOwnerRejected = true;
    phase = "signed download";
    const { downloadUrl, expiresInSeconds } = await generatePresignedDownloadUrl(owner, expected);
    assert.equal(expiresInSeconds, 300);
    const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200);
    assert.ok(Buffer.from(await response.arrayBuffer()).equals(bytes));
    checks.signedDownloadMatched = true;
    phase = "unsigned download";
    const unsigned = new URL(downloadUrl);
    unsigned.search = "";
    const denied = await fetch(unsigned, { redirect: "manual", signal: AbortSignal.timeout(15000) });
    await denied.body?.cancel();
    assert.ok([400, 401, 403, 404].includes(denied.status));
    checks.unsignedRequestDidNotReturnObject = true;
    phase = "signed expiry";
    const { downloadUrl: shortUrl, expiresInSeconds: shortTtl } = await generatePresignedDownloadUrl(owner, expected, 1);
    assert.equal(shortTtl, 1);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const expired = await fetch(shortUrl, { redirect: "manual", signal: AbortSignal.timeout(15000) });
    await expired.body?.cancel();
    assert.ok([401, 403].includes(expired.status));
    checks.expiredSignedUrlRejected = true;
    phase = "owner delete";
    await assert.rejects(deleteStagedResume(`${owner}_other`, expected));
    await deleteStagedResume(owner, expected);
    checks.ownerDeleteVerified = true;
  } catch {
    // SDK/network errors can echo signed URLs. Never pass their causes to logs.
    checks.failedPhase = phase;
    throw new Error(`Private R2 S3 verification failed during ${phase}; raw errors withheld.`);
  } finally {
    if (attempted) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: "huntdeck-resumes-dev", Key: expected }));
        try {
          await readStagedResume(owner, expected);
          checks.syntheticObjectCleanup = false;
        } catch (error) {
          const failure = error as { name?: string; $metadata?: { httpStatusCode?: number } };
          checks.syntheticObjectCleanup = failure.name === "NoSuchKey" || failure.$metadata?.httpStatusCode === 404;
        }
      } catch {
        checks.syntheticObjectCleanup = false;
      }
    }
    client.destroy();
    mkdirSync(".local-services/r2-verification", { recursive: true });
    writeFileSync(".local-services/r2-verification/s3-result.json", JSON.stringify(checks, null, 2), { mode: 0o600 });
    if (checks.syntheticObjectCleanup === false) throw new Error("Private R2 synthetic object cleanup failed; remove only the test's synthetic owner prefix after inspecting the private test context.");
  }
});
