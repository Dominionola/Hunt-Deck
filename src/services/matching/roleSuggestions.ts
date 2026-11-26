import type { RoleCatalog } from "./roleCatalog";
import type { RoleProfile, RoleSuggestion } from "@/lib/validations/roleCatalog";
import { normalizeCatalogText, normalizeRoleTitle } from "./roleText";
export { normalizeRoleTitle, parseRoleChoices } from "./roleText";
export type { RoleSuggestion } from "@/lib/validations/roleCatalog";

const filler = new Set(["a", "an", "the", "and", "of", "in", "for", "to", "with", "use", "using", "perform", "conduct", "apply", "develop", "activities", "techniques", "advanced", "basic", "intermediate"]);
const broad = new Set(["research", "data", "analysis", "communication", "management", "manage", "teamwork", "planning", "leadership", "writing", "write", "editing", "software", "computer"]);
const synonyms: Record<string, string> = { writing: "write", written: "write", statistical: "statistics", analytical: "analysis", spreadsheets: "spreadsheet", management: "manage", programming: "program" };
// App-side aliases and broader tool capabilities supplement ESCO's activity labels.
// These links expand upward only: SQL does not imply SPARQL or every database tool.
const skillTerms: Record<string, string[]> = {
  sql: ["SQL", "query languages", "use databases"],
  "structured query language": ["SQL", "query languages", "use databases"],
  excel: ["Microsoft Excel", "use spreadsheets software"], "microsoft excel": ["Microsoft Excel", "use spreadsheets software"],
  python: ["Python (computer programming)", "computer programming"],
  "c++": ["C++", "computer programming"], "c#": ["C#", "computer programming"], java: ["Java", "computer programming"],
  r: ["R (computer programming)"], spss: ["SPSS"],
  "power bi": ["Microsoft Power BI", "data visualisation software"], tableau: ["Tableau", "data visualisation software"],
  "literature review": ["conduct literature research"],
};
const words = (text: string) => normalizeCatalogText(text).split(" ").filter((word) => !filler.has(word)).map((word) => synonyms[word] ?? word);
const phrase = (text: string, term: string) => (` ${normalizeCatalogText(text)} `).includes(` ${normalizeCatalogText(term)} `);

/** Pure local retrieval/ranking over a versioned occupation/skill graph. Never reads contact fields. */
export function suggestRoles(profile?: RoleProfile, catalog?: RoleCatalog): RoleSuggestion[] {
  if (!profile) return [];
  const result = new Map<string, RoleSuggestion>(); const seenOccupations = new Set<string>(); const families = new Set<string>();
  for (const experience of profile.experience.slice(0, 30)) {
    const title = experience.title.trim().replace(/\s+/g, " ");
    if (title.length < 2 || title.length > 120 || /^(student|intern|volunteer|work experience|experience|n\/?a)$/i.test(title)) continue;
    const resolved = catalog?.resolve(title) ?? [];
    const occupation = resolved.length === 1 ? resolved[0] : undefined;
    if (occupation) { families.add(occupation.isco.slice(0, 2)); seenOccupations.add(occupation.id); }
    const key = normalizeRoleTitle(title);
    if (!result.has(key)) result.set(key, { title, kind: "aligned", reason: "You listed this role in your reviewed work experience.", ...(occupation ? { occupationId: occupation.id } : {}) });
  }
  if (!catalog) return [...result.values()].slice(0, 20);
  const sameSkill: Record<string, string> = { "microsoft excel": "excel", "ms excel": "excel", "structured query language": "sql", "python computer programming": "python" };
  const reviewed = [...new Map(profile.skills.map((label) => { const key = normalizeCatalogText(label); return [sameSkill[key] ?? key, label]; })).values()];
  const matched = new Map<string, Set<string>>();
  for (const label of reviewed) {
    const variants = [label, ...skillTerms[normalizeCatalogText(label)] ?? []];
    const candidates = variants.map(words).filter((items) => items.length > 0);
    const pool = new Set(candidates.flatMap((tokens) => tokens.flatMap((word) => [...catalog.skillWords.get(word) ?? []])));
    // Match technical names inside ESCO labels (e.g. Python (computer programming))
    // and multiword activities; short tokens only match complete tokens, never substrings.
    for (const skillId of pool) {
      const target = words(catalog.skillLabels.get(skillId)!);
      const matches = candidates.some((candidate, index) => {
        const overlap = candidate.filter((word) => target.includes(word));
        const exact = normalizeCatalogText(variants[index]) === normalizeCatalogText(catalog.skillLabels.get(skillId)!);
        const singleSpecific = candidate.length === 1 && !broad.has(candidate[0]) && target.includes(candidate[0]);
        const multiword = candidate.length >= 2 && overlap.length === candidate.length && overlap.length / target.length >= 0.6;
        return exact || singleSpecific || multiword;
      });
      if (!matches) continue;
      if (!matched.has(skillId)) matched.set(skillId, new Set()); matched.get(skillId)!.add(label);
    }
  }
  const context = [...profile.experience.map((row) => row.title), ...profile.projects.map((row) => row.name + " " + row.description)].join(" ");
  const contextWords = new Set(profile.experience.flatMap((row) => words(row.title)).filter((word) => word.length >= 4));
  const leadership = /\b(manager|director|head|chief|supervisor|lead)\b/i;
  const hasLeadershipExperience = profile.experience.some((row) => leadership.test(row.title));
  const fields = profile.education.map((row) => row.fieldOfStudy?.trim()).filter((field): field is string => Boolean(field && field.length >= 4));
  const inferred: { suggestion: RoleSuggestion; score: number }[] = [];
  for (const occupation of catalog.occupations) {
    if (seenOccupations.has(occupation.id) || occupation.title.length > 120 || (leadership.test(occupation.title) && !hasLeadershipExperience)) continue;
    const hits = [...new Set([...occupation.essential, ...occupation.optional])].filter((id) => matched.has(id));
    const evidence = [...new Set(hits.flatMap((id) => [...matched.get(id)!]))];
    const specific = evidence.filter((label) => words(label).some((word) => !broad.has(word)));
    if (specific.length < 2 || hits.length < 2) continue;
    const essentialHits = hits.filter((id) => occupation.essential.includes(id));
    const titleEvidence = [occupation.title, ...occupation.aliases].some((label) => label.length >= 5 && phrase(context, label));
    const sameFamily = families.has(occupation.isco.slice(0, 2));
    const educationEvidence = fields.some((field) => phrase(occupation.title + " " + occupation.description, field));
    const kind = titleEvidence || ((sameFamily || educationEvidence) && essentialHits.length >= 2) ? "aligned" : "transferable";
    const rarity = (id: string) => Math.log(1 + catalog.occupations.length / (1 + (catalog.skillFrequency.get(id) ?? 0)));
    const contextOverlap = new Set(words(occupation.title).filter((word) => contextWords.has(word))).size;
    const score = hits.reduce((sum, id) => sum + rarity(id) * (occupation.essential.includes(id) ? 1.5 : 0.6), 0)
      / Math.sqrt(Math.max(5, occupation.essential.length)) + (titleEvidence ? 4 : sameFamily || educationEvidence ? 1 : 0) + Math.min(2, contextOverlap) * 2;
    const missingSkills = occupation.essential.filter((id) => !matched.has(id)).sort((a, b) => rarity(b) - rarity(a)).slice(0, 3).map((id) => catalog.skillLabels.get(id)!);
    inferred.push({ score, suggestion: { title: occupation.title, occupationId: occupation.id, kind,
      reason: `${kind === "aligned" ? "Connects with" : "Explore how to transfer"} your reviewed ${specific.slice(0, 3).join(", ")} skills to this occupation.`, missingSkills } });
  }
  inferred.sort((a, b) => b.score - a.score || a.suggestion.title.localeCompare(b.suggestion.title));
  for (const { suggestion } of inferred) if (!result.has(normalizeRoleTitle(suggestion.title))) result.set(normalizeRoleTitle(suggestion.title), suggestion);
  return (["aligned", "transferable"] as const).flatMap((kind) => [...result.values()].filter((row) => row.kind === kind).slice(0, 20));
}
