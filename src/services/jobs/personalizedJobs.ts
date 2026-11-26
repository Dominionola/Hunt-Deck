import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { JobQueryInput } from "@/lib/validations/job";
import { CLOUDFLARE_BGE_M3_MODEL, CLOUDFLARE_BGE_M3_VERSION } from "@/services/ai/cloudflareEmbeddingService";
import { getRoleCatalog } from "@/services/matching/roleCatalog";
import { visibleSourcePredicate } from "./sourceVisibility";
import { buildRegionSqlClause } from "./regionFilter";
import { extractTechStack, resolveStackSearchTerms } from "./techStackExtractor";

export async function getPersonalizedJobs(userId: string, query: JobQueryInput) {
  const model = process.env.CLOUDFLARE_EMBEDDING_MODEL || CLOUDFLARE_BGE_M3_MODEL;
  const version = process.env.CLOUDFLARE_EMBEDDING_VERSION || CLOUDFLARE_BGE_M3_VERSION;
  const resume = await db.resume.findFirst({ where: { userId, isPrimary: true },
    select: { id: true, embeddingModel: true, embeddingVersion: true } });
  const empty = { items: [], pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
  if (!resume) return { ...empty, personalization: "no_resume" as const };
  if (resume.embeddingModel !== model || resume.embeddingVersion !== version) return { ...empty, personalization: "incompatible_resume" as const };
  const vector = await db.$queryRaw<{ present: boolean }[]>`SELECT "embedding1024" IS NOT NULL AS present FROM resumes WHERE id = ${resume.id} AND "userId" = ${userId}`;
  if (!vector[0]?.present) return { ...empty, personalization: "incompatible_resume" as const };
  const profile = await db.profile.findUnique({ where: { userId }, select: {
    targetTitles: true, preferredLocations: true, remotePreference: true, minSalary: true,
  } });
  const clauses = [Prisma.sql`r.id = ${resume.id} AND r."userId" = ${userId} AND r."isPrimary" = true`,
    Prisma.sql`r."embedding1024" IS NOT NULL AND j."embedding1024" IS NOT NULL`,
    Prisma.sql`r."embeddingModel" = ${model} AND r."embeddingVersion" = ${version}`,
    Prisma.sql`j."embeddingModel" = r."embeddingModel" AND j."embeddingVersion" = r."embeddingVersion"`];
  if (process.env.JOB_SOURCE_CLOSURE_ENABLED === "1") clauses.push(visibleSourcePredicate);
  const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");
  if (query.search) clauses.push(Prisma.sql`(j.title ILIKE ${`%${escapeLike(query.search)}%`} OR j.company ILIKE ${`%${escapeLike(query.search)}%`})`);
  if (query.titles?.length) {
    const selectedExpanded = [...new Set([...query.titles, ...getRoleCatalog().expandTitles(query.titles)])];
    clauses.push(Prisma.sql`(${Prisma.join(selectedExpanded.map((t) => Prisma.sql`j.title ILIKE ${`%${escapeLike(t)}%`}`), " OR ")})`);
  }
  const regionClause = buildRegionSqlClause(query.regionScope);
  if (regionClause) clauses.push(regionClause);
  if (query.stack?.length) {
    const terms = resolveStackSearchTerms(query.stack);
    clauses.push(Prisma.sql`(${Prisma.join(terms.map((term) => Prisma.sql`(j.title ILIKE ${`%${escapeLike(term)}%`} OR j.description ILIKE ${`%${escapeLike(term)}%`})`), " OR ")})`);
  }
  // Preferred titles guide ranking, leaving room for adjacent, semantically relevant roles.
  const titles = getRoleCatalog().expandTitles(profile?.targetTitles ?? []);
  const targetMatch = titles.length ? Prisma.sql`(${Prisma.join(titles.map((title) => Prisma.sql`j.title ILIKE ${`%${escapeLike(title)}%`}`), " OR ")})` : Prisma.sql`false`;
  const arrangement = query.remoteType ?? profile?.remotePreference;
  if (arrangement && arrangement !== "ANY") clauses.push(Prisma.sql`j."remoteType" = ${arrangement}::"RemotePreference"`);
  if (query.platform) clauses.push(Prisma.sql`j."atsPlatform" = ${query.platform}::"AtsPlatform"`);
  const minSalary = query.minSalary ?? profile?.minSalary;
  if (minSalary) clauses.push(Prisma.sql`j."salaryMin" >= ${minSalary}`);
  if (query.location) clauses.push(Prisma.sql`j.location ILIKE ${`%${escapeLike(query.location)}%`}`);
  else if (profile?.preferredLocations.length) clauses.push(Prisma.sql`(${Prisma.join(profile.preferredLocations.map((location) => Prisma.sql`j.location ILIKE ${`%${escapeLike(location)}%`}`), " OR ")})`);
  const candidates = Prisma.sql`SELECT j.id, j.title, j.company, j.description, j.location, j."remoteType", j."atsPlatform", j."applicationUrl", j."postedAt", j."salaryMin", j."salaryMax",
    ${targetMatch} AS "matchesTargetRole",
    CASE WHEN j."embeddingModel" = r."embeddingModel" AND j."embeddingVersion" = r."embeddingVersion"
      AND r."embeddingModel" = ${model} AND r."embeddingVersion" = ${version}
      THEN (1 - (j."embedding1024" <=> r."embedding1024")) * 100 ELSE NULL END AS "semanticSimilarity"
    FROM job_postings j CROSS JOIN resumes r WHERE ${Prisma.join(clauses, " AND ")}`;
  // Excludes undefined cosine distance (zero vectors), NaN, or numerical junk.
  const ranked = Prisma.sql`WITH ranked AS (${candidates}) SELECT * FROM ranked WHERE "semanticSimilarity" BETWEEN ${query.minSimilarity ?? -100} AND 100`;
  const [items, counts] = await Promise.all([
    db.$queryRaw<Array<{ id: string; title: string; company: string; description: string; location: string | null; remoteType: string; atsPlatform: string;
      applicationUrl: string; postedAt: Date; salaryMin: number | null; salaryMax: number | null; semanticSimilarity: number; matchesTargetRole: boolean }>>`
      ${ranked} ORDER BY ("semanticSimilarity" + CASE WHEN "matchesTargetRole" THEN 5 ELSE 0 END) DESC,
        "semanticSimilarity" DESC, "postedAt" DESC, id ASC LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`,
    db.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM (${ranked}) result`,
  ]);
  const total = counts[0]?.count ?? 0;
  return { personalization: "ready" as const, items: items.map(({ description, ...job }) => ({
      ...job,
      semanticSimilarity: Math.round(job.semanticSimilarity * 10) / 10,
      techStack: extractTechStack(job.title, description),
    })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}
