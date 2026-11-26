import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteStagedResume,
  generatePresignedDownloadUrl,
  selectOrphanedStagedKeys,
} from "../../src/services/storage/r2Service";
import { MAX_RESUME_BYTES, validatePdfUpload } from "../../src/lib/validations/upload";

test("generatePresignedDownloadUrl clamps expiry to [1, 300] seconds and enforces owner prefix", async () => {
  const validKey = `resumes/user_1/${"a".repeat(64)}.pdf`;
  const capped = await generatePresignedDownloadUrl("user_1", validKey, 9999);
  assert.equal(capped.expiresInSeconds, 300);

  const floored = await generatePresignedDownloadUrl("user_1", validKey, 0);
  assert.equal(floored.expiresInSeconds, 1);

  await assert.rejects(() => generatePresignedDownloadUrl("user_2", validKey), /Access denied/);
});

test("deleteStagedResume rejects cross-owner and malformed storage keys", async () => {
  await assert.rejects(() => deleteStagedResume("user_2", `resumes/user_1/${"a".repeat(64)}.pdf`), /Invalid resume storage reference/);
  await assert.rejects(() => deleteStagedResume("user_1", "resumes/user_1/not-a-hash.pdf"), /Invalid resume storage reference/);
  await assert.rejects(() => deleteStagedResume("bad/user", `resumes/bad/user/${"a".repeat(64)}.pdf`), /Invalid resume storage reference/);
});

test("selectOrphanedStagedKeys selects only unreferenced staged PDFs older than cutoff up to maxDelete", () => {
  const now = Date.now();
  const cutoff = new Date(now - 24 * 3600_000);
  const oldOrphanA = `resumes/user_1/${"a".repeat(64)}.pdf`;
  const oldOrphanB = `resumes/user_1/${"b".repeat(64)}.pdf`;
  const oldReferenced = `resumes/user_1/${"c".repeat(64)}.pdf`;
  const freshOrphan = `resumes/user_1/${"d".repeat(64)}.pdf`;
  const unrelatedKey = "other/file.pdf";

  const selected = selectOrphanedStagedKeys(
    [
      { key: oldReferenced, lastModified: new Date(now - 48 * 3600_000) },
      { key: freshOrphan, lastModified: new Date(now - 1 * 3600_000) },
      { key: unrelatedKey, lastModified: new Date(now - 48 * 3600_000) },
      { key: oldOrphanA, lastModified: new Date(now - 48 * 3600_000) },
      { key: oldOrphanB, lastModified: new Date(now - 48 * 3600_000) },
    ],
    (key) => key === oldReferenced,
    cutoff,
    1,
  );

  assert.deepEqual(selected, [oldOrphanA]);
});

test("validatePdfUpload rejects oversized, empty, non-PDF extension, spoofed MIME, and non-%PDF- bytes", () => {
  const validBytes = Buffer.from("%PDF-1.4\nValid");
  assert.equal(validatePdfUpload({ name: "resume.pdf", type: "application/pdf", size: validBytes.length }, validBytes), true);

  // Oversized (> 10 MB)
  const oversized = Buffer.alloc(MAX_RESUME_BYTES + 1, 0x25);
  assert.equal(validatePdfUpload({ name: "big.pdf", type: "application/pdf", size: oversized.length }, oversized), false);

  // Empty
  assert.equal(validatePdfUpload({ name: "empty.pdf", type: "application/pdf", size: 0 }, Buffer.alloc(0)), false);

  // Spoofed MIME with HTML/JS payload
  const htmlBytes = Buffer.from("<html><script>alert(1)</script></html>");
  assert.equal(validatePdfUpload({ name: "resume.pdf", type: "application/pdf", size: htmlBytes.length }, htmlBytes), false);

  // Non-PDF extension with %PDF- bytes
  assert.equal(validatePdfUpload({ name: "resume.exe", type: "application/pdf", size: validBytes.length }, validBytes), false);
});
