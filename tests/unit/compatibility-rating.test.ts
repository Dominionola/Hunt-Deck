import assert from "node:assert/strict";
import test from "node:test";
import {
  clampCompatibilityScore,
  getCompatibilityTier,
} from "../../src/components/application/compatibility-rating/rating-utils";

test("getCompatibilityTier maps strong, moderate, and low score thresholds", () => {
  assert.deepEqual(getCompatibilityTier(92), {
    tone: "success",
    chipColor: "lime",
    bandLabel: "Strong match",
  });
  assert.deepEqual(getCompatibilityTier(80), {
    tone: "success",
    chipColor: "lime",
    bandLabel: "Strong match",
  });
  assert.deepEqual(getCompatibilityTier(79), {
    tone: "accent",
    chipColor: "blue",
    bandLabel: "Moderate match",
  });
  assert.deepEqual(getCompatibilityTier(60), {
    tone: "accent",
    chipColor: "blue",
    bandLabel: "Moderate match",
  });
  assert.deepEqual(getCompatibilityTier(59), {
    tone: "warning",
    chipColor: "yellow",
    bandLabel: "Low match",
  });
});

test("clampCompatibilityScore bounds and rounds out-of-range or non-finite values", () => {
  assert.equal(clampCompatibilityScore(87.6), 88);
  assert.equal(clampCompatibilityScore(-12), 0);
  assert.equal(clampCompatibilityScore(142), 100);
  assert.equal(clampCompatibilityScore(Number.NaN), 0);
  assert.equal(clampCompatibilityScore(Number.POSITIVE_INFINITY), 0);
});
