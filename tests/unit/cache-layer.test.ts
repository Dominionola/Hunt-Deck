import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { clearMemoryCache, getOrSetCached } from "../../src/lib/cache";

describe("Upstream Response Cache Layer (src/lib/cache.ts)", () => {
  beforeEach(() => {
    clearMemoryCache();
  });

  it("caches responses by namespace + keyParts and skips redundant upstream calls", async () => {
    let calls = 0;
    const loader = async () => {
      calls++;
      return { items: [`result-${calls}`] };
    };

    const first = await getOrSetCached("remote-feeds:himalayas", { q: "react", limit: 20 }, 60, loader);
    assert.equal(first.cached, false);
    assert.deepEqual(first.data, { items: ["result-1"] });
    assert.equal(calls, 1);

    const second = await getOrSetCached("remote-feeds:himalayas", { q: "react", limit: 20 }, 60, loader);
    assert.equal(second.cached, true);
    assert.deepEqual(second.data, { items: ["result-1"] });
    assert.equal(calls, 1);

    // Different keyParts should miss and increment calls
    const third = await getOrSetCached("remote-feeds:himalayas", { q: "python", limit: 20 }, 60, loader);
    assert.equal(third.cached, false);
    assert.deepEqual(third.data, { items: ["result-2"] });
    assert.equal(calls, 2);
  });

  it("coalesces concurrent in-flight cache misses into a single upstream request", async () => {
    let calls = 0;
    const slowLoader = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 25));
      return { ok: true, count: calls };
    };

    const results = await Promise.all([
      getOrSetCached("hacker-news-hiring", { page: 0 }, 60, slowLoader),
      getOrSetCached("hacker-news-hiring", { page: 0 }, 60, slowLoader),
      getOrSetCached("hacker-news-hiring", { page: 0 }, 60, slowLoader),
      getOrSetCached("hacker-news-hiring", { page: 0 }, 60, slowLoader),
    ]);

    assert.equal(calls, 1);
    assert.equal(results[0].cached, false);
    assert.equal(results[1].cached, true);
    assert.equal(results[2].cached, true);
    assert.equal(results[3].cached, true);
    for (const r of results) {
      assert.deepEqual(r.data, { ok: true, count: 1 });
    }
  });

  it("refetches cleanly after TTL expires", async () => {
    let calls = 0;
    const loader = async () => ({ call: ++calls });

    const first = await getOrSetCached("contacts-enrich", { company: "stripe" }, 0.01, loader);
    assert.equal(first.data.call, 1);

    await new Promise((r) => setTimeout(r, 25));

    const second = await getOrSetCached("contacts-enrich", { company: "stripe" }, 0.01, loader);
    assert.equal(second.cached, false);
    assert.equal(second.data.call, 2);
  });
});
