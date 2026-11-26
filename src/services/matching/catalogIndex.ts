import type { RoleCatalogData, RoleOccupation, RoleSearchItem } from "@/lib/validations/roleCatalog";
import { normalizeCatalogText } from "./roleText";

const abbreviations: Record<string, string[]> = {
  swe: ["software developer"], qa: ["quality assurance"], ux: ["user experience"], ui: ["user interface"],
  hr: ["human resources"], cto: ["chief technology officer"], cfo: ["chief financial officer"], ceo: ["chief executive officer"],
  pm: ["project manager", "product manager"], sysadmin: ["system administrator"], devops: ["devops engineer"],
};
export class RoleCatalog {
  readonly occupations: RoleOccupation[];
  readonly byId = new Map<string, RoleOccupation>();
  readonly skillLabels = new Map<string, string>();
  readonly skillWords = new Map<string, Set<string>>();
  readonly skillFrequency = new Map<string, number>();
  readonly titleIndex = new Map<string, RoleOccupation[]>();
  readonly searchRows: { occupation: RoleOccupation; title: string; aliases: string[] }[];
  constructor(readonly snapshot: RoleCatalogData) {
    this.occupations = snapshot.occupations;
    for (const skill of snapshot.skills) {
      this.skillLabels.set(skill.id, skill.label);
      for (const word of normalizeCatalogText(skill.label).split(" ")) {
        if (!this.skillWords.has(word)) this.skillWords.set(word, new Set());
        this.skillWords.get(word)!.add(skill.id);
      }
    }
    this.searchRows = snapshot.occupations.map((occupation) => {
      this.byId.set(occupation.id, occupation);
      for (const label of [occupation.title, ...occupation.aliases]) {
        const key = normalizeCatalogText(label); const list = this.titleIndex.get(key) ?? [];
        list.push(occupation); this.titleIndex.set(key, list);
      }
      for (const skillId of new Set([...occupation.essential, ...occupation.optional])) {
        if (!this.skillLabels.has(skillId)) throw new Error("Catalog has an unresolved skill reference.");
        this.skillFrequency.set(skillId, (this.skillFrequency.get(skillId) ?? 0) + 1);
      }
      return { occupation, title: normalizeCatalogText(occupation.title), aliases: occupation.aliases.map(normalizeCatalogText) };
    });
    if (this.byId.size !== this.occupations.length) throw new Error("Catalog contains duplicate occupations.");
  }
  resolve(title: string): RoleOccupation[] {
    const key = normalizeCatalogText(title);
    const direct = this.titleIndex.get(key);
    if (direct) { const canonical = direct.filter((role) => normalizeCatalogText(role.title) === key); return canonical.length ? canonical : direct; }
    const base = key.replace(/^(senior|junior|lead|principal|staff)\s+/, "");
    const aliases = abbreviations[key] ?? abbreviations[base] ?? [base];
    return [...new Map(aliases.flatMap((alias) => this.titleIndex.get(alias) ?? []).map((role) => [role.id, role])).values()];
  }
  search(text: string, limit = 8): { items: RoleSearchItem[]; total: number } {
    const query = normalizeCatalogText(text);
    if (query.length < 2) return { items: [], total: 0 };
    const queries = abbreviations[query] ?? [query];
    const found = this.searchRows.map((row) => {
      let score = 0; let matchedAlias: string | undefined;
      for (const q of queries) {
        const words = q.split(" ");
        const grade = (label: string) => label === q ? 1000 : label.startsWith(q) ? 800 : words.every((word) => label.split(" ").some((part) => part.startsWith(word))) ? 600 : label.includes(q) ? 400 : 0;
        const titleScore = grade(row.title) + (grade(row.title) ? 10 : 0);
        if (titleScore > score) { score = titleScore; matchedAlias = undefined; }
        for (const [index, alias] of row.aliases.entries()) if (grade(alias) > score) { score = grade(alias); matchedAlias = row.occupation.aliases[index]; }
      }
      return { row, score, matchedAlias };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.row.occupation.title.localeCompare(b.row.occupation.title));
    return { total: found.length, items: found.slice(0, Math.min(12, Math.max(1, limit))).map(({ row, matchedAlias }) => ({
      id: row.occupation.id, title: row.occupation.title, isco: row.occupation.isco, ...(matchedAlias ? { matchedAlias } : {}) })) };
  }
  expandTitles(titles: string[]): string[] {
    const labels = titles.slice(0, 20).flatMap((title) => {
      const resolved = this.resolve(title);
      return resolved.length === 1 ? [title, resolved[0].title, ...resolved[0].aliases.slice(0, 20)] : [title];
    });
    return [...new Map(labels.filter((label) => label.trim().length > 1 && label.length <= 120).map((label) => [normalizeCatalogText(label), label])).values()].slice(0, 100);
  }
}
