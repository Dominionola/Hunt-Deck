import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  createWorkersAiEmbeddingGenerator,
  createWorkersR2Reader,
  type WorkersAiBinding,
  type WorkersR2Bucket,
} from "../../src/services/queue/cloudflareWorkerBindings";

test("createWorkersR2Reader enforces owner scope, PDF signature, and SHA-256 integrity", async () => {
  const pdfBytes = Buffer.from("%PDF-1.4\nSynthetic worker R2 test");
  const hash = createHash("sha256").update(pdfBytes).digest("hex");
  const validKey = `resumes/user_1/${hash}.pdf`;

  const bucket: WorkersR2Bucket = {
    async get(key: string) {
      if (key !== validKey) return null;
      return {
        size: pdfBytes.length,
        async arrayBuffer() {
          return pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
        },
      };
    },
  };

  const read = createWorkersR2Reader(bucket);
  const loaded = await read("user_1", validKey);
  assert.deepEqual(loaded, pdfBytes);

  await assert.rejects(() => read("user_2", validKey), /Invalid resume storage reference/);
  await assert.rejects(() => read("user_1", `resumes/user_1/${"0".repeat(64)}.pdf`), /Invalid staged resume/);
});

test("createWorkersAiEmbeddingGenerator validates 1024-dim vector and model metadata", async () => {
  const vector = Array.from({ length: 1024 }, (_, idx) => (idx === 0 ? 1 : 0));
  const ai: WorkersAiBinding = {
    async run(model: string, input: { text: string[] }) {
      assert.equal(model, "@cf/baai/bge-m3");
      assert.equal(input.text.length, 1);
      return { data: [vector] };
    },
  };

  const embed = createWorkersAiEmbeddingGenerator(ai);
  const result = await embed("Synthetic candidate profile text");
  assert.equal(result.model, "@cf/baai/bge-m3");
  assert.equal(result.version, "1.0");
  assert.equal(result.dimensions, 1024);
  assert.equal(result.vector.length, 1024);

  const badAi: WorkersAiBinding = {
    async run() {
      return { data: [[1, 2, 3]] };
    },
  };
  await assert.rejects(() => createWorkersAiEmbeddingGenerator(badAi)("text"), /invalid vector dimensions/i);
});
