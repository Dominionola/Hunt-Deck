import { z } from "zod";
import { plainJobText, BoardRequestError } from "./publicBoard";
import type { RawIngestedJob } from "./types";
import { extractTechStack } from "../techStackExtractor";
import { resolveDisplayCompanyName } from "@/services/contacts/contactIntelligenceService";
import type {
  FreehireSourceFilter,
  FreehireWorkMode,
} from "@/lib/validations/freehire";

const FREEHIRE_API_BASE = "https://freehire.me/api/v1";

const freehireJobItemSchema = z
  .object({
    public_slug: z.string().min(1).max(240),
    title: z.string().min(1).max(300),
    company: z.string().min(1).max(200),
    company_slug: z.string().max(200).nullish(),
    source: z.string().max(100).nullish(),
    external_id: z.string().max(200).nullish(),
    url: z.string().nullish(),
    apply_url: z.string().nullish(),
    location: z.string().max(500).nullish(),
    description: z.string().max(250000).nullish(),
    countries: z.array(z.string()).nullish(),
    regions: z.array(z.string()).nullish(),
    work_mode: z.string().nullish(),
    skills: z.array(z.string()).nullish(),
    posted_at: z.string().nullish(),
    created_at: z.string().nullish(),
    salary: z
      .object({
        min: z.number().nullish(),
        max: z.number().nullish(),
        currency: z.string().nullish(),
      })
      .nullish(),
    enrichment: z
      .object({
        salary_min: z.number().nullish(),
        salary_max: z.number().nullish(),
        salary_currency: z.string().nullish(),
      })
      .nullish(),
  })
  .passthrough();

const freehireSearchResponseSchema = z.object({
  data: z.array(z.unknown()).max(100),
  meta: z
    .object({
      total: z.number().int().nonnegative().optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

const freehireSingleResponseSchema = z.object({
  data: z.unknown(),
});

const freehireCompanySchema = z.object({
  slug: z.string(),
  name: z.string(),
  open_jobs_count: z.number().int().nonnegative().optional(),
  website: z.string().nullish(),
});

export type FreehireNormalizedJob = RawIngestedJob & {
  publicSlug: string;
  sourceName: string;
  techStack: string[];
};

function safeHttpsUrl(candidate: string | null | undefined): string | null {
  if (!candidate || typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function mapFreehireAtsPlatform(source: string | null | undefined): RawIngestedJob["atsPlatform"] {
  const s = (source ?? "").trim().toLowerCase();
  if (s === "greenhouse") return "GREENHOUSE";
  if (s === "lever") return "LEVER";
  if (s === "ashby") return "ASHBY";
  if (s === "workday") return "WORKDAY";
  return "OTHER";
}

export function mapFreehireRemoteType(
  workMode: string | null | undefined,
  location?: string | null
): RawIngestedJob["remoteType"] {
  const wm = (workMode ?? "").trim().toLowerCase();
  if (wm === "remote") return "REMOTE_ONLY";
  if (wm === "hybrid") return "HYBRID";
  if (wm === "onsite" || wm === "on-site" || wm === "on_site") return "ONSITE";
  if (location && /\bremote\b/i.test(location)) return "REMOTE_ONLY";
  return "ANY";
}

function buildSourceQueryParam(filter: FreehireSourceFilter): string | null {
  switch (filter) {
    case "ATS_ONLY":
      return "ashby,greenhouse,lever,workday";
    case "ASHBY":
      return "ashby";
    case "GREENHOUSE":
      return "greenhouse";
    case "LEVER":
      return "lever";
    case "WORKDAY":
      return "workday";
    default:
      return null;
  }
}

async function readBoundedJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new BoardRequestError(response.status === 429 || response.status >= 500);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new BoardRequestError(false);

  const decoder = new TextDecoder();
  let body = "";
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4 * 1024 * 1024) {
        await reader.cancel();
        throw new BoardRequestError(false);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch (error) {
    throw error instanceof BoardRequestError ? error : new BoardRequestError(true);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new BoardRequestError(false);
  }
}

function normalizeFreehireItem(entry: unknown): FreehireNormalizedJob | null {
  const parsed = freehireJobItemSchema.safeParse(entry);
  if (!parsed.success) return null;
  const item = parsed.data;

  const description = plainJobText(item.description ?? "");
  if (description.length < 20) return null;

  const locationParts = [
    item.location?.trim(),
    ...(item.location ? [] : item.countries ?? []),
  ].filter((v): v is string => Boolean(v));
  const location = locationParts.length > 0 ? locationParts.join(", ").slice(0, 500) : undefined;

  const directUrl = safeHttpsUrl(item.apply_url) ?? safeHttpsUrl(item.url);
  const applicationUrl = directUrl ?? `https://freehire.me/jobs/${encodeURIComponent(item.public_slug)}`;

  const salaryMinRaw = item.salary?.min ?? item.enrichment?.salary_min;
  const salaryMaxRaw = item.salary?.max ?? item.enrichment?.salary_max;
  const currency = (item.salary?.currency ?? item.enrichment?.salary_currency ?? "USD").toUpperCase();
  const salaryMin =
    currency === "USD" && typeof salaryMinRaw === "number" && Number.isFinite(salaryMinRaw) && salaryMinRaw > 0
      ? Math.round(salaryMinRaw)
      : undefined;
  const salaryMax =
    currency === "USD" && typeof salaryMaxRaw === "number" && Number.isFinite(salaryMaxRaw) && salaryMaxRaw > 0
      ? Math.round(salaryMaxRaw)
      : undefined;

  const dateStr = item.posted_at ?? item.created_at;
  const parsedDate = dateStr ? new Date(dateStr) : undefined;
  const postedAt = parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate : undefined;

  const extractedStack = extractTechStack(item.title, description);
  const techStack = extractedStack.length > 0
    ? extractedStack
    : (item.skills ?? []).slice(0, 6);

  return {
    publicSlug: item.public_slug,
    sourceName: item.source ?? "freehire",
    title: item.title.trim().slice(0, 300),
    company: resolveDisplayCompanyName(item.company.trim(), description).slice(0, 200),
    description,
    location,
    salaryMin,
    salaryMax,
    remoteType: mapFreehireRemoteType(item.work_mode, location),
    atsPlatform: mapFreehireAtsPlatform(item.source),
    applicationUrl,
    externalJobId: `freehire:${item.public_slug}`,
    postedAt,
    techStack,
  };
}

export async function fetchFreehireJobs(
  options: {
    query: string;
    workMode?: FreehireWorkMode;
    sourceFilter?: FreehireSourceFilter;
    limit?: number;
    offset?: number;
  },
  fetcher: typeof fetch = fetch
) {
  const apiKey = process.env.FREEHIRE_API_KEY?.trim();
  const endpointPath = apiKey ? "/data/jobs/search" : "/agent/jobs/search";
  const params = new URLSearchParams({
    q: options.query,
    limit: String(Math.min(100, Math.max(1, options.limit ?? 25))),
    offset: String(Math.max(0, options.offset ?? 0)),
    sort: "posted_at",
    order: "desc",
    description_format: "text",
  });

  if (options.workMode === "REMOTE_ONLY") params.set("work_mode", "remote");
  else if (options.workMode === "HYBRID") params.set("work_mode", "hybrid");
  else if (options.workMode === "ONSITE") params.set("work_mode", "onsite");

  const sourceParam = options.sourceFilter ? buildSourceQueryParam(options.sourceFilter) : null;
  if (sourceParam) params.set("source", sourceParam);

  const requestHeaders: Record<string, string> = { Accept: "application/json" };
  if (apiKey) requestHeaders.Authorization = `Bearer ${apiKey}`;

  let response: Response;
  try {
    response = await fetcher(`${FREEHIRE_API_BASE}${endpointPath}?${params}`, {
      headers: requestHeaders,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new BoardRequestError(true);
  }

  const raw = await readBoundedJson(response);
  const envelope = freehireSearchResponseSchema.safeParse(raw);
  if (!envelope.success) {
    throw new BoardRequestError(false);
  }

  const jobs: FreehireNormalizedJob[] = [];
  let invalid = 0;
  const seenSlugs = new Set<string>();

  for (const entry of envelope.data.data) {
    const normalized = normalizeFreehireItem(entry);
    if (!normalized) {
      invalid++;
      continue;
    }
    if (seenSlugs.has(normalized.publicSlug)) continue;
    seenSlugs.add(normalized.publicSlug);
    jobs.push(normalized);
  }

  return {
    fetched: envelope.data.data.length,
    selected: jobs.length,
    invalid,
    totalAvailable: envelope.data.meta?.total ?? jobs.length,
    jobs,
  };
}

export async function fetchFreehireJobBySlug(
  publicSlug: string,
  fetcher: typeof fetch = fetch
): Promise<FreehireNormalizedJob | null> {
  const apiKey = process.env.FREEHIRE_API_KEY?.trim();
  const endpointPath = apiKey ? `/data/jobs/${encodeURIComponent(publicSlug)}` : `/jobs/${encodeURIComponent(publicSlug)}`;
  const requestHeaders: Record<string, string> = { Accept: "application/json" };
  if (apiKey) requestHeaders.Authorization = `Bearer ${apiKey}`;

  let response: Response;
  try {
    response = await fetcher(`${FREEHIRE_API_BASE}${endpointPath}`, {
      headers: requestHeaders,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new BoardRequestError(true);
  }

  if (response.status === 404) return null;
  const raw = await readBoundedJson(response);
  const envelope = freehireSingleResponseSchema.safeParse(raw);
  if (!envelope.success) throw new BoardRequestError(false);
  return normalizeFreehireItem(envelope.data.data);
}

export async function searchFreehireCompanies(
  query: string,
  limit = 10,
  fetcher: typeof fetch = fetch
) {
  const params = new URLSearchParams({
    q: query,
    limit: String(Math.min(50, Math.max(1, limit))),
  });
  let response: Response;
  try {
    response = await fetcher(`${FREEHIRE_API_BASE}/companies?${params}`, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new BoardRequestError(true);
  }
  const raw = await readBoundedJson(response);
  const parsed = z.object({ data: z.array(freehireCompanySchema).max(50) }).safeParse(raw);
  if (!parsed.success) throw new BoardRequestError(false);
  return parsed.data.data;
}
