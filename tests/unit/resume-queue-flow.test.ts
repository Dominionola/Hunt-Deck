import { it } from "node:test";
import assert from "node:assert/strict";
import { resumeJobId, redisConnectionOptions, assertResumeJobOwner } from "../../src/services/queue/resumeQueue";
import { isTransientResumeError } from "../../src/services/queue/resumeProcessor";
import { pollResumeJob } from "../../src/features/resume/pollResumeJob";
import { GET as getStatus } from "../../src/app/api/resumes/status/route";
import { POST as uploadResume } from "../../src/app/api/resumes/upload/route";
import { resumeJobDataSchema } from "../../src/lib/validations/resumeJob";

it("uses deterministic user-scoped idempotency IDs", () => {
  const bytes = Buffer.from("%PDF-synthetic");
  assert.equal(resumeJobId("owner", bytes), resumeJobId("owner", bytes));
  assert.notEqual(resumeJobId("owner", bytes), resumeJobId("other", bytes));
  assert.notEqual(resumeJobId("owner", bytes), resumeJobId("owner", Buffer.from("%PDF-other")));
});

it("rejects a different user accessing a job", () => {
  assert.doesNotThrow(() => assertResumeJobOwner("owner", "owner"));
  assert.throws(() => assertResumeJobOwner("owner", "other"), /Forbidden/);
});

it("accepts only owner-scoped opaque queue references", () => {
  const references = { userId: "owner", storageKey: `resumes/owner/${"a".repeat(64)}.pdf` };
  assert.equal(resumeJobDataSchema.safeParse(references).success, true);
  assert.equal(resumeJobDataSchema.safeParse({ ...references, fileName: "private-resume-name.pdf" }).success, false);
  assert.equal(resumeJobDataSchema.safeParse({ ...references, text: "private document text" }).success, false);
  assert.equal(resumeJobDataSchema.safeParse({ ...references, userId: "other" }).success, false);
  assert.equal(resumeJobDataSchema.safeParse({ ...references, storageKey: "https://example.test/signed-url" }).success, false);
});

it("fails closed without configured Redis", () => {
  const previous = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  try { assert.throws(() => redisConnectionOptions(), /not configured/); }
  finally { if (previous !== undefined) process.env.REDIS_URL = previous; }
});

it("retries transient provider and connection failures only", () => {
  assert.equal(isTransientResumeError({ status: 429 }), true);
  assert.equal(isTransientResumeError({ status: 503 }), true);
  assert.equal(isTransientResumeError({ code: "ECONNRESET" }), true);
  assert.equal(isTransientResumeError({ name: "TimeoutError" }), true);
  assert.equal(isTransientResumeError({ name: "APIConnectionTimeoutError" }), true);
  assert.equal(isTransientResumeError({ status: 400 }), false);
  assert.equal(isTransientResumeError(new Error("bad output")), false);
});

it("loads only a completed validated resume from status", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ status: "completed", resumeId: "synthetic", parsedData: { fullName: "Synthetic", skills: [], experience: [], education: [], projects: [] } });
  try {
    const result = await pollResumeJob("job", () => {});
    assert.equal(result.resumeId, "synthetic");
    assert.equal(result.parsedData.fullName, "Synthetic");
  } finally { globalThis.fetch = original; }
});

it("reports failed jobs without exposing provider errors", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ status: "failed", error: "synthetic provider detail" });
  try { await assert.rejects(pollResumeJob("job", () => {}), /Resume processing failed/); }
  finally { globalThis.fetch = original; }
});

it("requires authentication before upload or status access", async () => {
  const status = await getStatus(new Request(`http://localhost/api/resumes/status?jobId=${"a".repeat(64)}`));
  const upload = await uploadResume(new Request("http://localhost/api/resumes/upload", { method: "POST" }));
  assert.equal(status.status, 401);
  assert.equal(upload.status, 401);
});
