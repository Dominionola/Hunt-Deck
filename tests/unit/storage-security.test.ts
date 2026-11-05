import { strict as assert } from "node:assert";
import { test } from "node:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { generatePresignedUploadUrl, uploadResumeFile } from "../../src/services/storage/r2Service";

test("local staging is private, non-public, and unavailable outside development", async () => {
  const keys = ["NODE_ENV", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  let createdPath: string | undefined;
  try {
    for (const key of keys) delete process.env[key];
    Object.assign(process.env, { NODE_ENV: "development" });
    const bytes = Buffer.from("%PDF-1.7\nexample");
    const result = await uploadResumeFile(bytes, "sensitive-name.pdf", "application/pdf");
    assert.match(result.url, /^local-staging:\/\//);
    assert.doesNotMatch(result.storageKey, /sensitive-name/);
    const reference = new URL(result.url);
    const tmp = await fs.realpath(os.tmpdir());
    const directory = await fs.realpath(path.join(tmp, reference.hostname));
    assert.equal(path.dirname(directory), tmp);
    assert.match(path.basename(directory), /^huntdeck-resume-/);
    createdPath = path.join(directory, path.basename(reference.pathname));
    assert.deepEqual(await fs.readFile(createdPath), bytes);
    assert.equal(path.relative(path.join(process.cwd(), "public"), createdPath).startsWith(".."), true);
    await assert.rejects(uploadResumeFile(Buffer.from("not a pdf"), "resume.pdf", "application/pdf"));
    await assert.rejects(generatePresignedUploadUrl());
    Object.assign(process.env, { NODE_ENV: "production" });
    await assert.rejects(uploadResumeFile(bytes, "resume.pdf", "application/pdf"), /not configured/);
    Object.assign(process.env, { NODE_ENV: "development", R2_PUBLIC_URL: "https://example.com" });
    await assert.rejects(uploadResumeFile(bytes, "resume.pdf", "application/pdf"), /Public resume storage/);
  } finally {
    if (createdPath) {
      await fs.unlink(createdPath);
      await fs.rmdir(path.dirname(createdPath));
    }
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else Object.assign(process.env, { [key]: saved[key] });
    }
  }
});
