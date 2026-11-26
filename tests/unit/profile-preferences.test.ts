import assert from "node:assert/strict";
import test from "node:test";
import { profilePreferencesSchema } from "../../src/lib/validations/profile";

test("profilePreferencesSchema accepts valid preferences and deduplicates tags", () => {
  const result = profilePreferencesSchema.safeParse({
    remotePreference: "REMOTE_ONLY",
    preferredLocations: [" Remote ", "London", "Remote"],
    targetTitles: ["Frontend Engineer", " Backend Engineer ", "Frontend Engineer"],
    minSalary: 60000,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data.preferredLocations, ["Remote", "London"]);
    assert.deepEqual(result.data.targetTitles, ["Frontend Engineer", "Backend Engineer"]);
    assert.equal(result.data.minSalary, 60000);
  }
});

test("profilePreferencesSchema allows empty locations and null minSalary", () => {
  const result = profilePreferencesSchema.safeParse({
    remotePreference: "ANY",
    preferredLocations: [],
    targetTitles: [],
    minSalary: null,
  });
  assert.equal(result.success, true);
});

test("profilePreferencesSchema rejects unknown fields, negative salary, and oversized arrays", () => {
  assert.equal(
    profilePreferencesSchema.safeParse({
      remotePreference: "ANY",
      preferredLocations: [],
      targetTitles: [],
      minSalary: -10,
    }).success,
    false
  );

  assert.equal(
    profilePreferencesSchema.safeParse({
      remotePreference: "ANY",
      preferredLocations: [],
      targetTitles: [],
      minSalary: null,
      userId: "attacker",
    }).success,
    false
  );
});
