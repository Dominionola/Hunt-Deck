// Uses the explicit Hunt Deck CLI profile; no API credentials are printed.
// This checks the management API, not the application's S3 credential path.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { syntheticResumePdf } from "../tests/fixtures/syntheticResume";

async function main() {
  const accountId = "093d489fa9bb46a82db650872b75b57e";
  const bucket = "huntdeck-resumes-dev";
  const binary = path.join(process.env.APPDATA ?? "", "npm/node_modules/cf/bin/cf");
  const env = { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId };
  const directory = path.resolve(".local-services/r2-verification");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  function cli(args: string[], requireSuccess = true) {
    const result = spawnSync(process.execPath, [binary, ...args, "--profile", "huntdeck"], { env, timeout: 60000 });
    if (requireSuccess && result.status !== 0) throw new Error("R2 verification command failed; raw output withheld.");
    return result;
  }
  const identity = JSON.parse(cli(["auth", "whoami"]).stdout.toString()) as { authenticated: boolean; email: string; accounts: Array<{ id: string }> };
  assert.equal(identity.authenticated, true);
  assert.equal(identity.email, "dominionsamuelola@gmail.com");
  assert.ok(identity.accounts.some((account) => account.id === accountId));
  const managed = JSON.parse(cli(["r2", "buckets", "domains", "managed", "list", "--bucket-name", bucket]).stdout.toString()) as { enabled: boolean; domain: string };
  const custom = JSON.parse(cli(["r2", "buckets", "domains", "custom", "list", "--bucket-name", bucket]).stdout.toString()) as { domains: unknown[] };
  assert.equal(managed.enabled, false);
  assert.equal(custom.domains.length, 0);
  const bytes = syntheticResumePdf("private storage verification");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const key = `resumes/synthetic_${randomUUID()}/${hash}.pdf`;
  const fixture = path.join(directory, "synthetic.pdf");
  writeFileSync(fixture, bytes, { mode: 0o600 });
  const checks: Record<string, boolean | number | string> = { accountId, bucket, publicDevelopmentDomainDisabled: true, customDomainCount: 0 };
  let attempted = false;
  try {
    cli(["r2", "buckets", "objects", "upload", key, "--bucket-name", bucket, "--file", fixture, "--content-type", "application/pdf", "--dry-run"]);
    attempted = true;
    cli(["r2", "buckets", "objects", "upload", key, "--bucket-name", bucket, "--file", fixture, "--content-type", "application/pdf"]);
    const downloaded = cli(["r2", "buckets", "objects", "get", key, "--bucket-name", bucket]).stdout;
    assert.deepEqual(downloaded, bytes);
    checks.syntheticPdfRoundTrip = true;
    checks.byteCount = bytes.length;
    for (const [label, url] of [
      ["unauthenticatedS3Status", `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`],
      ["disabledPublicDomainStatus", `https://${managed.domain}/${key}`],
    ]) {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15000) });
      await response.body?.cancel();
      assert.ok([400, 401, 403, 404].includes(response.status), "Unauthenticated object access must fail.");
      checks[label] = response.status;
    }
  } finally {
    if (attempted) {
      // Only this invocation's newly generated synthetic object is disposable.
      cli(["r2", "buckets", "objects", "delete", key, "--bucket-name", bucket, "--force"]);
      const missing = cli(["r2", "buckets", "objects", "get", key, "--bucket-name", bucket], false);
      checks.syntheticObjectRemoved = missing.status !== 0 && /404|NoSuchKey|does not exist|not found/i.test(missing.stderr.toString());
      assert.equal(checks.syntheticObjectRemoved, true);
    }
    writeFileSync(path.join(directory, "result.json"), JSON.stringify(checks, null, 2), { mode: 0o600 });
  }
  console.log(JSON.stringify(checks));
}

main().catch(() => { console.error("R2 smoke verification did not finish; inspect the sanitized local result. No resume text or credentials were logged."); process.exitCode = 1; });
