import { it } from "node:test";
import assert from "node:assert/strict";
import { type Job, UnrecoverableError } from "bullmq";
import { ingestionJobSchema, ingestionRequestSchema, type IngestionJob, type IngestionCounts, type IngestionSource } from "../../src/lib/validations/jobIngestion";
import { fetchPublicBoard, BoardRequestError } from "../../src/services/jobs/adapters/publicBoard";
import { processJobIngestion } from "../../src/services/queue/jobIngestionProcessor";

const source = { platform: "GREENHOUSE" as const, board: "synthetic" };
const posting = { id: 1, title: "Synthetic Engineer", absolute_url: "https://example.invalid/one", content: "&lt;p&gt;Python and SQL. Synthetic job description only.&lt;/p&gt;" };
function job() {
  const logs: string[] = [];
  return { data: { userId: "owner", sources: [source] }, updateProgress: async () => {}, log: async (text: string) => { logs.push(text); }, logs };
}
it("rejects arbitrary URLs, text payloads, excess sources and caller identity", () => {
  assert.equal(ingestionRequestSchema.safeParse({ sources: [{ ...source, board: "https://private.invalid" }] }).success, false);
  assert.equal(ingestionRequestSchema.safeParse({ sources: [source], userId: "injected" }).success, false);
  assert.equal(ingestionJobSchema.safeParse({ userId: "owner", sources: [source], resumeText: "canary" }).success, false);
  assert.equal(ingestionRequestSchema.safeParse({ sources: Array(6).fill(source) }).success, false);
  assert.equal(ingestionRequestSchema.parse({ sources: [source, source] }).sources.length, 1);
});
it("fetches only fixed hosts without redirects and bounds selections", async () => {
  let seen = "";
  const result = await fetchPublicBoard(source, async (url, init) => {
    seen = String(url); assert.equal(init?.redirect, "error"); assert.ok(init?.signal);
    return Response.json({ jobs: Array.from({ length: 60 }, (_, id) => ({ ...posting, id })) });
  });
  assert.equal(seen, "https://boards-api.greenhouse.io/v1/boards/synthetic/jobs?content=true");
  assert.equal(result.fetched, 60); assert.equal(result.selected, 60); assert.equal(result.jobs.length, 60); assert.equal(result.incomplete, false);
  assert.equal(result.jobs[0].description.includes("<p>"), false);
});
it("fetches bounded Lever pages and reports a source beyond the limit", async () => {
  const offsets: number[] = [];
  const result = await fetchPublicBoard({ platform: "LEVER", board: "synthetic" }, async (url) => {
    const skip = Number(new URL(String(url)).searchParams.get("skip")); offsets.push(skip);
    return Response.json(Array.from({ length: skip === 200 ? 1 : 50 }, (_, index) => ({ id: String(skip + index), text: "Synthetic role", hostedUrl: `https://example.invalid/${skip + index}`, descriptionPlain: "Synthetic description long enough for validation." })));
  });
  assert.deepEqual(offsets, [0, 50, 100, 150, 200]); assert.equal(result.jobs.length, 200); assert.equal(result.incomplete, true);
});
it("continues bounded board batches without presenting the first batch as complete", async () => {
  const entries = Array.from({ length: 220 }, (_, id) => ({ ...posting, id }));
  const greenhouseFetch = async () => Response.json({ jobs: entries });
  const first = await fetchPublicBoard(source, greenhouseFetch);
  const second = await fetchPublicBoard(source, greenhouseFetch, first.nextOffset!);
  assert.equal(first.jobs.length, 200); assert.equal(first.incomplete, true); assert.equal(first.nextOffset, 200);
  assert.equal(second.jobs.length, 20); assert.equal(second.incomplete, false); assert.equal(second.nextOffset, null);
  assert.equal(second.jobs[0].externalJobId, "200");
  const offsets: number[] = [];
  const lever = await fetchPublicBoard({ platform: "LEVER", board: "synthetic" }, async (url) => {
    const skip = Number(new URL(String(url)).searchParams.get("skip")); offsets.push(skip);
    return Response.json(skip === 200 ? [{ id: "200", text: "Role", hostedUrl: "https://example.invalid/job", descriptionPlain: "Synthetic description long enough to validate." }] : []);
  }, 200);
  assert.deepEqual(offsets, [200]); assert.equal(lever.jobs[0].externalJobId, "200"); assert.equal(lever.nextOffset, null);
  await assert.rejects(fetchPublicBoard(source, greenhouseFetch, 1), BoardRequestError);
  await assert.rejects(fetchPublicBoard(source, greenhouseFetch, 10200), BoardRequestError);
});
it("fails closed when changing pages return the same listing twice", async () => {
  const duplicate = { id: "same", text: "Synthetic role", hostedUrl: "https://example.invalid/job", descriptionPlain: "Synthetic description long enough to validate." };
  await assert.rejects(fetchPublicBoard({ platform: "LEVER", board: "synthetic" }, async () => Response.json(Array(50).fill(duplicate))), (error: unknown) => error instanceof BoardRequestError && error.transient);
});
it("counts malformed source entries without fabricating jobs", async () => {
  const result = await fetchPublicBoard(source, async () => Response.json({ jobs: [posting, { ...posting, absolute_url: "javascript:alert(1)" }, { title: "bad" }] }));
  assert.equal(result.invalid, 2); assert.equal(result.jobs.length, 1);
});
it("preserves Lever multi-location choices and the documented on-site workplace type", async () => {
  const leverSource = { platform: "LEVER" as const, board: "synthetic" };
  const result = await fetchPublicBoard(leverSource, async () => Response.json([{ id: "1", text: "Synthetic role", hostedUrl: "https://example.invalid/job", descriptionPlain: "Synthetic description for a local job.", categories: { location: "Remote", allLocations: ["Remote", "Nigeria", "Kenya"] }, workplaceType: "on-site" }]));
  assert.equal(result.jobs[0].location, "Remote / Nigeria / Kenya");
  assert.equal(result.jobs[0].remoteType, "ONSITE");
});
it("does not disguise missing boards, throttling or huge bodies as empty success", async () => {
  await assert.rejects(fetchPublicBoard(source, async () => new Response("PRIVATE_CANARY", { status: 404 })), (error: unknown) => error instanceof BoardRequestError && !error.transient && !error.message.includes("CANARY"));
  await assert.rejects(fetchPublicBoard(source, async () => new Response("PRIVATE_CANARY", { status: 429 })), (error: unknown) => error instanceof BoardRequestError && error.transient);
  await assert.rejects(fetchPublicBoard(source, async () => new Response("x".repeat(4 * 1024 * 1024 + 1))), BoardRequestError);
});
it("enforces worker-side authorization before source access", async () => {
  const current = job(); let requests = 0;
  await assert.rejects(processJobIngestion(current as unknown as Job<IngestionJob, IngestionCounts>, {
    authorized: async () => false, allowSource: async () => true,
    fetchBoard: async () => { requests++; throw new Error(); }, persist: async () => ({ id: "id", embedded: false }),
  }), UnrecoverableError);
  assert.equal(requests, 0);
});
it("reports exact saved/failed counts and logs only numbers", async () => {
  const current = job(); let writes = 0;
  const board = await fetchPublicBoard(source, async () => Response.json({ jobs: [posting, { ...posting, id: 2 }, {}] }));
  const result = await processJobIngestion(current as unknown as Job<IngestionJob, IngestionCounts>, {
    authorized: async () => true, allowSource: async () => true, fetchBoard: async () => board,
    persist: async () => { if (++writes === 2) throw new Error("PRIVATE_JOB_CANARY"); return { id: "id", embedded: true }; },
  });
  assert.deepEqual(result, { fetched: 3, selected: 3, saved: 1, failed: 2, embedded: 1, sourcesFailed: 0, incompleteSources: 0 });
  assert.equal(current.logs.join("").includes("CANARY"), false);
});
it("retries transient source failures with a fixed content-free error", async () => {
  const current = job();
  await assert.rejects(processJobIngestion(current as unknown as Job<IngestionJob, IngestionCounts>, {
    authorized: async () => true, allowSource: async () => true,
    fetchBoard: async () => { throw new BoardRequestError(true); }, persist: async () => ({ id: "id", embedded: false }),
  }), /^Error: Job ingestion temporarily unavailable\.$/);
  assert.deepEqual(JSON.parse(current.logs[0]), { fetched: 0, selected: 0, saved: 0, failed: 0, embedded: 0, sourcesFailed: 1, incompleteSources: 0 });
});
it("resumes after the last saved batch without retaining listing text in queue progress", async () => {
  const board = await fetchPublicBoard(source, async () => Response.json({ jobs: [posting] }));
  let progress: unknown = 0; let interrupted = false; const offsets: number[] = []; let writes = 0;
  const current = { data: { userId: "owner", sources: [source] }, get progress() { return progress; },
    updateProgress: async (value: unknown) => { progress = structuredClone(value); }, log: async () => {} };
  const deps = { authorized: async () => true, allowSource: async () => true,
    fetchBoard: async (_source: IngestionSource, _fetcher?: typeof fetch, offset = 0) => {
      offsets.push(offset);
      if (offset === 0) return { ...board, incomplete: true, nextOffset: 200 };
      if (!interrupted) { interrupted = true; throw new BoardRequestError(true); }
      return { ...board, jobs: [], fetched: 0, selected: 0, nextOffset: null };
    }, persist: async () => { writes++; return { id: "id", embedded: true }; } };
  await assert.rejects(processJobIngestion(current as unknown as Job<IngestionJob, IngestionCounts>, deps), /temporarily unavailable/);
  assert.deepEqual(offsets, [0, 200]); assert.equal(writes, 1);
  assert.equal(JSON.stringify(progress).includes("Synthetic Engineer"), false);
  const result = await processJobIngestion(current as unknown as Job<IngestionJob, IngestionCounts>, deps);
  assert.deepEqual(offsets, [0, 200, 200]); assert.equal(writes, 1); assert.equal(result.saved, 1);
  assert.equal(progress, 100);
});
it("stops at the per-source budget and reports incomplete coverage", async () => {
  const board = await fetchPublicBoard(source, async () => Response.json({ jobs: [posting] }));
  const offsets: number[] = [];
  const result = await processJobIngestion(job() as unknown as Job<IngestionJob, IngestionCounts>, {
    authorized: async () => true, allowSource: async () => true,
    fetchBoard: async (_source, _fetcher, offset = 0) => { offsets.push(offset); return { ...board, incomplete: true, nextOffset: offset + 200 }; },
    persist: async () => ({ id: "id", embedded: false }),
  });
  assert.deepEqual(offsets, [0, 200, 400, 600, 800]); assert.equal(result.incompleteSources, 1);
});
it("retries rather than advancing when Redis cannot save a checkpoint", async () => {
  const board = await fetchPublicBoard(source, async () => Response.json({ jobs: [posting] }));
  const current = { data: { userId: "owner", sources: [source] }, progress: 0,
    updateProgress: async () => { throw new Error("PRIVATE_REDIS_CANARY"); }, log: async () => {} };
  await assert.rejects(processJobIngestion(current as unknown as Job<IngestionJob, IngestionCounts>, {
    authorized: async () => true, allowSource: async () => true, fetchBoard: async () => board,
    persist: async () => ({ id: "id", embedded: false }),
  }), /^Error: Job ingestion temporarily unavailable\.$/);
});
