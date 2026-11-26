import { it } from "node:test";
import assert from "node:assert/strict";
import { verifySourceSnapshots, type SourceSnapshot } from "../../src/services/jobs/verifySourceSnapshot";

const snapshot = (): SourceSnapshot => ({ sourceKey: "LEVER:synthetic", generation: 1, complete: true, invalidCount: 0, ids: ["a", "b"] });
it("requires two complete matching observations for the same source and generation", () => {
  assert.equal(verifySourceSnapshots(snapshot(), { ...snapshot(), ids: ["b", "a"] }), true);
  assert.equal(verifySourceSnapshots({ ...snapshot(), ids: [] }, { ...snapshot(), ids: [] }), false);
  for (const change of [{ complete: false }, { invalidCount: 1 }, { sourceKey: "GREENHOUSE:synthetic" }, { generation: 2 },
    { ids: ["a", "c"] }, { ids: ["a", "a"] }, { ids: ["", "b"] }]) {
    assert.equal(verifySourceSnapshots(snapshot(), { ...snapshot(), ...change }), false);
  }
});
