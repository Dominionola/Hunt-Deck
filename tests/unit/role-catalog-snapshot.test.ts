import { it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getRoleCatalog } from "../../src/services/matching/roleCatalog";

it("ships a complete pinned occupation snapshot with verifiable provenance", () => {
  const bytes = readFileSync("src/data/roles/esco-en.json");
  const provenance = JSON.parse(readFileSync("src/data/roles/esco-provenance.json", "utf8"));
  const catalog = getRoleCatalog();
  assert.equal(catalog.snapshot.version, "v1.2.1");
  assert.equal(catalog.occupations.length, 3039);
  assert.equal(provenance.occupationCount, catalog.occupations.length);
  assert.equal(provenance.skillCount, catalog.skillLabels.size);
  assert.equal(provenance.aliasCount, catalog.occupations.reduce((sum, role) => sum + role.aliases.length, 0));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), provenance.sha256);
  for (const role of catalog.occupations) for (const parent of role.broader) assert.ok(catalog.byId.has(parent));
  assert.match(readFileSync("src/data/roles/NOTICE.txt", "utf8"), /This service uses the ESCO classification of the European Commission\./);
});

it("searches across occupational sectors and resolves software title abbreviations", () => {
  const catalog = getRoleCatalog();
  for (const query of ["plumb", "nurse", "agricultur", "teach", "data analyst"]) {
    assert.ok(catalog.search(query, 8).items.length, `No catalog coverage for ${query}`);
  }
  assert.ok(catalog.search("SWE").items.some((role) => /software/.test(role.title)));
  assert.ok(catalog.expandTitles(["SWE"]).includes("software engineer"));
  assert.deepEqual(catalog.expandTitles(["Unlisted synthetic occupation"]), ["Unlisted synthetic occupation"]);
});
