import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";

const version = "v1.2.1";
const batchSize = 10;
const target = "src/data/roles/esco-en.json";
const provenance = "src/data/roles/esco-provenance.json";
const uri = (kind) => z.string().regex(new RegExp(`^http://data.europa.eu/esco/${kind}/[a-f0-9-]{36}$`));
const link = z.object({ uri: z.string(), title: z.string().min(1) });
const sourceRow = z.object({ uri: uri("occupation"), preferredLabel: z.object({ en: z.string().min(1).max(500) }),
  alternativeLabel: z.object({ en: z.array(z.string()).optional() }).optional(),
  code: z.string().min(1), status: z.string(), description: z.object({ en: z.object({ literal: z.string() }).optional() }).optional(),
  _links: z.object({ hasEssentialSkill: z.array(link).optional(), hasOptionalSkill: z.array(link).optional(), broaderOccupation: z.array(link).optional() }),
});
const pageSchema = z.object({ total: z.number().int().positive().max(10000), offset: z.number().int(),
  limit: z.number().int(), _embedded: z.object({ results: z.array(sourceRow) }) });
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const id = (value) => value.slice(value.lastIndexOf("/") + 1);

if (process.argv.slice(2).some((arg) => arg !== "--check")) throw new Error("Usage: node scripts/refresh-role-catalog.mjs [--check]");
if (process.argv.includes("--check")) {
  const bytes = await readFile(target); const meta = JSON.parse(await readFile(provenance, "utf8"));
  if (sha(bytes) !== meta.sha256) throw new Error("Role catalog checksum mismatch.");
  const data = JSON.parse(bytes);
  if (data.occupations.length !== meta.occupationCount || data.skills.length !== meta.skillCount || data.version !== version) throw new Error("Role catalog provenance mismatch.");
  console.log(`Catalog verified: ${meta.occupationCount} occupations, ${meta.skillCount} linked skills, ${version}.`);
} else {
  const rows = new Map(); const skills = new Map(); const pageHashes = []; let total = 0;
  for (let page = 0; page === 0 || rows.size < total; page++) {
    if (page > 1000) throw new Error("Unexpected ESCO pagination.");
    const url = new URL("https://ec.europa.eu/esco/api/search");
    Object.entries({ type: "occupation", language: "en", limit: String(batchSize), offset: String(page), full: "true", viewObsolete: "false", selectedVersion: version }).forEach(([key, value]) => url.searchParams.set(key, value));
    let body;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Official ESCO catalog request failed.");
        const text = await response.text();
        if (Buffer.byteLength(text) > 12 * 1024 * 1024) throw new Error("ESCO page exceeds size limit.");
        body = pageSchema.parse(JSON.parse(text)); pageHashes.push(sha(text)); break;
      } catch (error) {
        console.warn(`ESCO page ${page} attempt ${attempt + 1}: ${error instanceof z.ZodError ? error.issues.slice(0, 3).map((issue) => issue.path.join(".")).join(", ") : error.name}`);
        if (attempt === 2) throw new Error(`Could not retrieve valid ESCO page ${page}.`); await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    if (page === 0) total = body.total;
    if (body.total !== total || body.offset !== page || body.limit !== batchSize || body._embedded.results.length === 0) throw new Error("Inconsistent ESCO page.");
    const before = rows.size;
    for (const row of body._embedded.results) {
      if (row.status !== "released") throw new Error("Unexpected occupation status.");
      const skillIds = (links = []) => links.map((item) => {
        uri("skill").parse(item.uri); const key = id(item.uri);
        const label = item.title.trim(); if (skills.has(key) && skills.get(key) !== label) throw new Error("Conflicting skill labels.");
        skills.set(key, label); return key;
      });
      const occupation = { id: id(row.uri), title: row.preferredLabel.en.trim(),
        aliases: [...new Set(row.alternativeLabel?.en?.map((value) => value.trim()).filter(Boolean) ?? [])].sort(),
        isco: row.code, description: row.description?.en?.literal ?? "",
        essential: [...new Set(skillIds(row._links.hasEssentialSkill))].sort(),
        optional: [...new Set(skillIds(row._links.hasOptionalSkill))].sort(),
        broader: (row._links.broaderOccupation ?? []).filter((item) => item.uri.startsWith("http://data.europa.eu/esco/occupation/")).map((item) => id(item.uri)).sort() };
      if (rows.has(occupation.id)) throw new Error("Duplicate occupation across ESCO pages.");
      rows.set(occupation.id, occupation);
    }
    if (rows.size <= before) throw new Error("ESCO pagination stopped progressing.");
    if (page % 25 === 0 || rows.size === total) console.log(`Imported ${rows.size}/${total} public occupations.`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (rows.size !== total || total < 3000) throw new Error("Incomplete occupation catalog.");
  const data = { source: "ESCO", version, language: "en", occupations: [...rows.values()].sort((a, b) => a.id.localeCompare(b.id)),
    skills: [...skills.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, label]) => ({ id, label })) };
  const bytes = JSON.stringify(data) + "\n";
  await mkdir("src/data/roles", { recursive: true });
  await writeFile(target, bytes);
  await writeFile(provenance, JSON.stringify({ source: "European Commission ESCO", version, language: "en",
    sourceUrl: "https://ec.europa.eu/esco/api/search", selectedVersion: version, retrievedAt: new Date().toISOString(),
    occupationCount: total, skillCount: skills.size, aliasCount: data.occupations.reduce((sum, item) => sum + item.aliases.length, 0),
    sha256: sha(bytes), pageSha256: pageHashes,
    noticeUrl: "https://esco.ec.europa.eu/en/use-esco/download/privacy-statement",
    copyrightUrl: "https://commission.europa.eu/legal-notice_en",
    changes: "English fields extracted, occupation and skill URI suffixes stored as IDs, relationships compacted and sorted. No occupation or skill labels rewritten." }, null, 2) + "\n");
  console.log(`Saved versioned local catalog: ${Buffer.byteLength(bytes)} bytes. No personal data used.`);
}
