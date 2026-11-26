import { it } from "node:test";
import assert from "node:assert/strict";
import { RoleCatalog } from "../../src/services/matching/catalogIndex";
import { suggestRoles } from "../../src/services/matching/roleSuggestions";
import { roleSearchQuerySchema, roleSuggestionRequestSchema, type RoleCatalogData } from "../../src/lib/validations/roleCatalog";
import { readLimitedJson, RequestBodyLimitError } from "../../src/lib/http/readLimitedJson";
import { reviewedRoleProfile, loadRoleSuggestions, searchRoleCatalog } from "../../src/features/onboarding/roleCatalogClient";
import { resumeParsedDataSchema } from "../../src/lib/validations/resume";

// Small synthetic graph: tests retrieval behavior, not an asserted ESCO record.
const ids = Array.from({ length: 8 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
const data: RoleCatalogData = { source: "ESCO", version: "v1.2.1", language: "en", skills: [
  { id: ids[0], label: "Python (computer programming)" }, { id: ids[1], label: "SQL" }, { id: ids[2], label: "technical writing" },
], occupations: [
  { id: ids[3], title: "software developer", aliases: ["software engineer", "application programmer"], isco: "2512", description: "Computer science development", essential: [ids[0], ids[1]], optional: [], broader: [] },
  { id: ids[4], title: "data analyst", aliases: ["data analytics specialist"], isco: "2521", description: "Data analysis", essential: [ids[1]], optional: [ids[0]], broader: [] },
  { id: ids[5], title: "technical writer", aliases: ["documentation specialist"], isco: "2641", description: "Documentation", essential: [ids[2]], optional: [], broader: [] },
] };
const catalog = new RoleCatalog(data);
const profile = { skills: ["Python", "SQL"], experience: [], education: [], projects: [] };

it("searches canonical titles, aliases and common abbreviations", () => {
  assert.equal(catalog.search("SWE").items[0].title, "software developer");
  assert.equal(catalog.search("application programmer").items[0].matchedAlias, "application programmer");
  assert.equal(catalog.search("ANALYTICS specialist").items[0].title, "data analyst");
  assert.equal(catalog.search("x").items.length, 0); assert.equal(catalog.search("unmatched title").total, 0);
  assert.equal(catalog.search("software", 1).items.length, 1);
});
it("normalizes equivalent selected titles and preserves custom roles", () => {
  assert.equal(catalog.resolve("Senior software engineer")[0].id, ids[3]);
  assert.equal(catalog.resolve("Senior SWE")[0].id, ids[3]);
  assert.ok(catalog.expandTitles(["SWE", "Custom Research Role"]).includes("software engineer"));
  assert.ok(catalog.expandTitles(["Custom Research Role"]).includes("Custom Research Role"));
});
it("retrieves direct and transferable graph roles from multiple reviewed skills", () => {
  const roles = suggestRoles(profile, catalog);
  assert.ok(roles.some((role) => role.title === "data analyst" && role.kind === "transferable"));
  assert.equal(roles.some((role) => role.title === "technical writer"), false);
  assert.deepEqual(suggestRoles({ ...profile, skills: ["Python"] }, catalog), []);
  assert.deepEqual(suggestRoles({ ...profile, skills: ["SQL", "Structured Query Language"] }, catalog), []);
  const direct = suggestRoles({ ...profile, experience: [{ title: "Software Engineer", bullets: [] }] }, catalog);
  assert.equal(direct[0].title, "Software Engineer"); assert.equal(direct.filter((role) => role.occupationId === ids[3]).length, 1);
});
it("rejects unresolved skill relationships instead of silently shrinking coverage", () => {
  assert.throws(() => new RoleCatalog({ ...data, skills: [] }), /unresolved skill/);
});
it("bounds catalog queries and rejects client-selected identity", () => {
  assert.equal(roleSearchQuerySchema.safeParse({ q: "x".repeat(121) }).success, false);
  assert.equal(roleSearchQuerySchema.safeParse({ q: "nurse", limit: 100 }).success, false);
  assert.equal(roleSuggestionRequestSchema.safeParse({ profile, userId: "other" }).success, false);
});
it("sends only reviewed occupational facts to our own server", async (t) => {
  const resume = resumeParsedDataSchema.parse({ fullName: "PRIVATE_NAME_CANARY", email: "private@example.invalid", phone: "PRIVATE_PHONE_CANARY", skills: ["Unconfirmed"],
    experience: [{ title: "Research Assistant", company: "PRIVATE_COMPANY_CANARY", startDate: "2022", bullets: ["Collected measurements."] }] });
  const reviewed = reviewedRoleProfile(resume, ["Python", "SQL"]);
  assert.deepEqual(reviewed.skills, ["Python", "SQL"]);
  assert.ok(!JSON.stringify(reviewed).includes("PRIVATE_"));
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(url), "/api/roles/suggestions"); assert.equal(init?.method, "POST");
    assert.ok(!String(init?.body).includes("PRIVATE_"));
    return Response.json({ success: true, version: "v1.2.1", suggestions: [] });
  });
  assert.deepEqual((await loadRoleSuggestions(reviewed)).suggestions, []);
});
it("reports safe search/provider-boundary failures without leaking response text", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: "PRIVATE_RESPONSE_CANARY" }, { status: 503 }));
  await assert.rejects(searchRoleCatalog("data"), /Role search could not be loaded/);
  await assert.rejects(loadRoleSuggestions(profile), /Role suggestions could not be loaded/);
});
it("bounds JSON body bytes and rejects malformed JSON", async () => {
  await assert.rejects(readLimitedJson(new Request("http://localhost/", { method: "POST", body: "x".repeat(11) }), 10), RequestBodyLimitError);
  await assert.rejects(readLimitedJson(new Request("http://localhost/", { method: "POST", body: "{" })), SyntaxError);
});
