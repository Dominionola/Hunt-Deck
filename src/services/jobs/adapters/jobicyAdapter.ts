import { z } from "zod";
import { BoardRequestError, plainJobText, readBoundedJson, safeHttpsUrl } from "./publicBoard";
import type { RawIngestedJob } from "./types";
import { extractTechStack } from "../techStackExtractor";
import { resolveDisplayCompanyName } from "@/services/contacts/contactIntelligenceService";

const JOBICY_API_ENDPOINT = "https://jobicy.com/api/jobs";

const jobicyJobItemSchema = z
  .object({
    id: z.union([z.number().int(), z.string().min(1)]),
    url: z.string().min(1),
    jobSlug: z.string().max(300).nullish(),
    jobTitle: z.string().min(1).max(300),
    companyName: z.string().min(1).max(200),
    companyLogo: z.string().nullish(),
    jobIndustry: z.array(z.string()).nullish(),
    jobType: z.array(z.string()).nullish(),
    jobGeo: z.string().max(200).nullish(),
    jobLevel: z.string().max(200).nullish(),
    jobExcerpt: z.string().max(10000).nullish(),
    jobDescription: z.string().max(250000).nullish(),
    pubDate: z.string().nullish(),
  })
  .passthrough();

const jobicyResponseSchema = z.object({
  jobCount: z.number().int().nonnegative().optional(),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean().optional(),
  jobs: z.array(z.unknown()).max(200),
});

export type JobicyNormalizedJob = RawIngestedJob & {
  provider: "jobicy";
  companyLogo?: string | null;
  employmentType?: string | null;
  seniority: string[];
  techStack: string[];
};

export function normalizeJobicyItem(entry: unknown): JobicyNormalizedJob | null {
  const parsed = jobicyJobItemSchema.safeParse(entry);
  if (!parsed.success) return null;
  const item = parsed.data;

  // Per Jobicy attribution terms, application links must point to the original Jobicy job URL.
  const applicationUrl = safeHttpsUrl(item.url);
  if (!applicationUrl) return null;

  const description = plainJobText(item.jobDescription ?? item.jobExcerpt ?? "");
  if (description.length < 20) return null;

  const title = plainJobText(item.jobTitle).slice(0, 300);
  if (!title) return null;

  const company = resolveDisplayCompanyName(plainJobText(item.companyName), description).slice(0, 200);
  const location = item.jobGeo?.trim() || "Remote (Worldwide)";

  const parsedDate = item.pubDate ? new Date(item.pubDate) : undefined;
  const postedAt = parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate : undefined;

  const extractedStack = extractTechStack(title, description);
  const industries = (item.jobIndustry ?? [])
    .map((ind) => plainJobText(ind))
    .filter(Boolean)
    .slice(0, 4);
  const techStack = extractedStack.length > 0 ? extractedStack : industries;

  const seniority = (item.jobLevel ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s.toLowerCase() !== "any")
    .slice(0, 3);

  return {
    provider: "jobicy",
    companyLogo: safeHttpsUrl(item.companyLogo),
    employmentType: item.jobType?.[0] ?? null,
    seniority,
    title,
    company,
    description,
    location,
    remoteType: "REMOTE_ONLY",
    atsPlatform: "OTHER",
    applicationUrl,
    sourceUrl: applicationUrl,
    externalJobId: `jobicy:${String(item.id)}`,
    postedAt,
    techStack,
  };
}

export async function fetchJobicyJobs(
  options: {
    query?: string;
    geo?: string;
    cursor?: string;
    limit?: number;
  } = {},
  fetcher: typeof fetch = fetch
) {
  const count = Math.min(100, Math.max(1, options.limit ?? 25));
  const params = new URLSearchParams({ count: String(count) });
  if (options.query?.trim()) params.set("tag", options.query.trim());
  if (options.geo?.trim()) params.set("geo", options.geo.trim());
  if (options.cursor?.trim()) params.set("cursor", options.cursor.trim());

  let response: Response;
  try {
    response = await fetcher(`${JOBICY_API_ENDPOINT}?${params}`, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new BoardRequestError(true);
  }

  const raw = await readBoundedJson(response);
  const envelope = jobicyResponseSchema.safeParse(raw);
  if (!envelope.success) {
    throw new BoardRequestError(false);
  }

  const jobs: JobicyNormalizedJob[] = [];
  let invalid = 0;
  const seenIds = new Set<string>();

  for (const entry of envelope.data.jobs) {
    const normalized = normalizeJobicyItem(entry);
    if (!normalized) {
      invalid++;
      continue;
    }
    if (normalized.externalJobId && seenIds.has(normalized.externalJobId)) continue;
    if (normalized.externalJobId) seenIds.add(normalized.externalJobId);
    jobs.push(normalized);
  }

  return {
    provider: "jobicy" as const,
    fetched: envelope.data.jobs.length,
    selected: jobs.length,
    invalid,
    totalAvailable: envelope.data.jobCount ?? jobs.length,
    nextCursor: envelope.data.nextCursor ?? null,
    jobs,
  };
}
