import { db } from "@/lib/db";
import { computeContentHash, generateCloudflareEmbedding, getCloudflareAiConfig } from "@/services/ai/cloudflareEmbeddingService";
import type { RawIngestedJob } from "./adapters/types";

/** Serialize a board's updates and preserve an existing job's identity across title/URL changes. */
export async function persistIngestedJob(job: RawIngestedJob) {
  const text = `${job.title}\n${job.company}\n${job.location ?? ""}\n${job.description}`.replace(/\s+/g, " ").trim().slice(0, 8000);
  const contentHash = computeContentHash(text);
  const config = getCloudflareAiConfig();
  const key = { company: job.company, title: job.title, applicationUrl: job.applicationUrl };
  return db.$transaction(async (tx) => {
    const lockKey = `job-board:${JSON.stringify([job.atsPlatform, job.company])}`;
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
    const select = { id: true, externalJobId: true, atsPlatform: true, contentHash: true, embeddingModel: true, embeddingVersion: true } as const;
    const matches = job.externalJobId ? await tx.jobPosting.findMany({
      where: { company: job.company, atsPlatform: job.atsPlatform, externalJobId: job.externalJobId }, select, take: 2,
    }) : [];
    if (matches.length > 1) throw new Error("Ambiguous source job identity.");
    const keyMatch = await tx.jobPosting.findUnique({ where: { company_title_applicationUrl: key }, select });
    if (keyMatch && ((matches[0] && matches[0].id !== keyMatch.id) ||
      (job.externalJobId && keyMatch.externalJobId && (keyMatch.externalJobId !== job.externalJobId || keyMatch.atsPlatform !== job.atsPlatform)))) {
      throw new Error("Conflicting source job identity.");
    }
    const existing = matches[0] ?? keyMatch;
    const hasVector = existing ? await tx.$queryRaw<{ present: boolean }[]>`SELECT "embedding1024" IS NOT NULL AS present FROM job_postings WHERE id = ${existing.id}` : [];
    const reusable = existing?.contentHash === contentHash && existing.embeddingModel === config.model &&
      existing.embeddingVersion === config.version && hasVector[0]?.present;
    const embedding = reusable ? null : await generateCloudflareEmbedding(text);
    const data = { ...key, description: job.description, location: job.location, salaryMin: job.salaryMin,
      salaryMax: job.salaryMax, remoteType: job.remoteType, atsPlatform: job.atsPlatform, externalJobId: job.externalJobId };
    const saved = existing
      ? await tx.jobPosting.update({ where: { id: existing.id }, data, select: { id: true } })
      : await tx.jobPosting.create({ data: { ...data, postedAt: job.postedAt }, select: { id: true } });
    if (embedding) await tx.$executeRaw`UPDATE job_postings SET "embedding1024" = ${JSON.stringify(embedding.vector)}::vector,
      "embeddingModel" = ${embedding.model}, "embeddingVersion" = ${embedding.version}, "contentHash" = ${embedding.contentHash},
      "embeddedAt" = NOW() WHERE id = ${saved.id}`;
    return { id: saved.id, embedded: Boolean(embedding) };
  }, { timeout: 60000, maxWait: 10000 });
}
