import { createHash } from "node:crypto";
import { z } from "zod";
import { BoardRequestError, plainJobText, readBoundedJson, safeHttpsUrl } from "./publicBoard";
import type { RawIngestedJob } from "./types";
import { extractTechStack } from "../techStackExtractor";
import { resolveDisplayCompanyName } from "@/services/contacts/contactIntelligenceService";

const HIMALAYAS_API_BASE = "https://himalayas.app/jobs/api";

const himalayasJobItemSchema = z
  .object({
    title: z.string().min(1).max(300),
    excerpt: z.string().max(10000).nullish(),
    companyName: z.string().min(1).max(200),
    companySlug: z.string().max(200).nullish(),
    companyLogo: z.string().nullish(),
    employmentType: z.string().max(100).nullish(),
    minSalary: z.number().nullish(),
    maxSalary: z.number().nullish(),
    salaryPeriod: z.string().max(50).nullish(),
    seniority: z.array(z.string()).nullish(),
    currency: z.string().max(20).nullish(),
    locationRestrictions: z.array(z.string()).nullish(),
    timezoneRestrictions: z.array(z.number()).nullish(),
    categories: z.array(z.string()).nullish(),
    parentCategories: z.array(z.string()).nullish(),
    description: z.string().max(250000).nullish(),
    pubDate: z.number().nullish(),
    expiryDate: z.number().nullish(),
    applicationLink: z.string().min(1),
    guid: z.string().nullish(),
  })
  .passthrough();

const himalayasResponseSchema = z.object({
  totalCount: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  nextCursor: z.string().nullish(),
  jobs: z.array(z.unknown()).max(100),
});

export type HimalayasNormalizedJob = RawIngestedJob & {
  provider: "himalayas";
  companySlug?: string;
  companyLogo?: string | null;
  employmentType?: string | null;
  seniority: string[];
  timezoneRestrictions: number[];
  techStack: string[];
};

function inferAtsPlatformFromUrl(url: string): RawIngestedJob["atsPlatform"] {
  const lower = url.toLowerCase();
  if (lower.includes("greenhouse.io")) return "GREENHOUSE";
  if (lower.includes("lever.co")) return "LEVER";
  if (lower.includes("ashbyhq.com")) return "ASHBY";
  if (lower.includes("myworkdayjobs.com")) return "WORKDAY";
  return "OTHER";
}

function buildExternalId(guid: string | null | undefined, applicationLink: string): string {
  const raw = (guid ?? applicationLink).trim();
  const digest = createHash("sha256").update(raw).digest("hex").slice(0, 20);
  return `himalayas:${digest}`;
}

export function normalizeHimalayasItem(entry: unknown): HimalayasNormalizedJob | null {
  const parsed = himalayasJobItemSchema.safeParse(entry);
  if (!parsed.success) return null;
  const item = parsed.data;

  // Per Himalayas API terms, use their provided applicationLink.
  const applicationUrl = safeHttpsUrl(item.applicationLink);
  if (!applicationUrl) return null;

  const description = plainJobText(item.description ?? item.excerpt ?? "");
  if (description.length < 20) return null;

  const title = plainJobText(item.title).slice(0, 300);
  if (!title) return null;

  const company = resolveDisplayCompanyName(item.companyName.trim(), description).slice(0, 200);
  const locations = (item.locationRestrictions ?? []).map((v) => v.trim()).filter(Boolean);
  const location = locations.length > 0 ? locations.join(", ").slice(0, 500) : "Remote (Worldwide)";

  const currency = (item.currency ?? "USD").toUpperCase();
  const isAnnual = !item.salaryPeriod || item.salaryPeriod.toLowerCase() === "annual";
  const salaryMin =
    currency === "USD" &&
    isAnnual &&
    typeof item.minSalary === "number" &&
    Number.isFinite(item.minSalary) &&
    item.minSalary >= 10000
      ? Math.round(item.minSalary)
      : undefined;
  const salaryMax =
    currency === "USD" &&
    isAnnual &&
    typeof item.maxSalary === "number" &&
    Number.isFinite(item.maxSalary) &&
    item.maxSalary >= 10000
      ? Math.round(item.maxSalary)
      : undefined;

  const postedAt =
    typeof item.pubDate === "number" && Number.isFinite(item.pubDate) && item.pubDate > 0
      ? new Date(item.pubDate * 1000)
      : undefined;

  const extractedStack = extractTechStack(title, description);
  const fallbackCats = (item.categories ?? [])
    .map((c) => c.replace(/-/g, " ").trim())
    .filter(Boolean)
    .slice(0, 5);
  const techStack = extractedStack.length > 0 ? extractedStack : fallbackCats;

  return {
    provider: "himalayas",
    companySlug: item.companySlug ?? undefined,
    companyLogo: safeHttpsUrl(item.companyLogo),
    employmentType: item.employmentType ?? null,
    seniority: (item.seniority ?? []).slice(0, 4),
    timezoneRestrictions: (item.timezoneRestrictions ?? []).slice(0, 6),
    title,
    company,
    description,
    location,
    salaryMin,
    salaryMax,
    remoteType: "REMOTE_ONLY",
    atsPlatform: inferAtsPlatformFromUrl(applicationUrl),
    applicationUrl,
    sourceUrl: safeHttpsUrl(item.guid) ?? applicationUrl,
    externalJobId: buildExternalId(item.guid, applicationUrl),
    postedAt,
    techStack,
  };
}

export async function fetchHimalayasJobs(
  options: {
    query?: string;
    cursor?: string;
    limit?: number;
  } = {},
  fetcher: typeof fetch = fetch
) {
  const limit = Math.min(20, Math.max(1, options.limit ?? 20));
  const query = options.query?.trim();
  const endpoint = query ? `${HIMALAYAS_API_BASE}/search` : HIMALAYAS_API_BASE;

  const params = new URLSearchParams({ limit: String(limit) });
  if (query) params.set("q", query);
  if (options.cursor?.trim()) params.set("cursor", options.cursor.trim());

  const apiKey = process.env.HIMALAYAS_API_KEY?.trim();
  const requestHeaders: Record<string, string> = { Accept: "application/json" };
  if (apiKey) requestHeaders.Authorization = `Bearer ${apiKey}`;

  let response: Response;
  try {
    response = await fetcher(`${endpoint}?${params}`, {
      headers: requestHeaders,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new BoardRequestError(true);
  }

  const raw = await readBoundedJson(response);
  const envelope = himalayasResponseSchema.safeParse(raw);
  if (!envelope.success) {
    throw new BoardRequestError(false);
  }

  const jobs: HimalayasNormalizedJob[] = [];
  let invalid = 0;
  const seenIds = new Set<string>();

  for (const entry of envelope.data.jobs) {
    const normalized = normalizeHimalayasItem(entry);
    if (!normalized) {
      invalid++;
      continue;
    }
    if (normalized.externalJobId && seenIds.has(normalized.externalJobId)) continue;
    if (normalized.externalJobId) seenIds.add(normalized.externalJobId);
    jobs.push(normalized);
  }

  return {
    provider: "himalayas" as const,
    fetched: envelope.data.jobs.length,
    selected: jobs.length,
    invalid,
    totalAvailable: envelope.data.totalCount ?? jobs.length,
    nextCursor: envelope.data.nextCursor ?? null,
    jobs,
  };
}
