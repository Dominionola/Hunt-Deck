import { strict as assert } from "node:assert";
import { test } from "node:test";
import { MAX_RESUME_BYTES, validatePdfUpload } from "../../src/lib/validations/upload";

test("accepts PDF metadata only when the complete payload begins with the PDF signature", () => {
  const pdf = Buffer.from("%PDF-1.7\nexample");
  assert.equal(validatePdfUpload({ name: "resume.pdf", type: "application/pdf", size: pdf.length }, pdf), true);
  assert.equal(validatePdfUpload({ name: "resume.pdf", type: "application/pdf", size: pdf.length + 1 }, pdf), false);
  assert.equal(validatePdfUpload({ name: "resume.pdf", type: "application/pdf", size: 5 }, Buffer.from("hello")), false);
  assert.equal(validatePdfUpload({ name: "resume.pdf", type: "application/pdf", size: 4 }, Buffer.from("%PDF")), false);
});

test("rejects oversized, empty, mislabeled and unsupported files", () => {
  const pdf = Buffer.from("%PDF-1.7");
  assert.equal(validatePdfUpload({ name: "resume.pdf", type: "application/pdf", size: MAX_RESUME_BYTES + 1 }, pdf), false);
  assert.equal(validatePdfUpload({ name: "resume.pdf", type: "application/pdf", size: 0 }, Buffer.alloc(0)), false);
  assert.equal(validatePdfUpload({ name: "resume.pdf", type: "text/plain", size: pdf.length }, pdf), false);
  assert.equal(validatePdfUpload({ name: "resume.docx", type: "application/pdf", size: pdf.length }, pdf), false);
  assert.equal(validatePdfUpload({ name: "resume.pdf.exe", type: "application/pdf", size: pdf.length }, pdf), false);
});
