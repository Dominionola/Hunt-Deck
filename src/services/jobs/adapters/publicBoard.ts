import { z } from "zod";
import { ingestionSourceSchema, type IngestionSource } from "@/lib/validations/jobIngestion";
import type { RawIngestedJob } from "./types";

const httpsUrl = z.string().url().refine((url) => new URL(url).protocol === "https:");
const greenhouse = z.object({ id: z.number().int(), title: z.string().min(1).max(300), absolute_url: httpsUrl,
  content: z.string().min(1).max(200000), location: z.object({ name: z.string().max(500) }).nullish(), updated_at: z.string().datetime({ offset: true }).optional() });
const lever = z.object({ id: z.string().min(1).max(150), text: z.string().min(1).max(300), hostedUrl: httpsUrl,
  applyUrl: httpsUrl.optional(), descriptionPlain: z.string().max(200000).optional(),
  lists: z.array(z.object({ text: z.string(), content: z.string() })).max(100).optional(),
  categories: z.object({ location: z.string().max(500).nullish(), allLocations: z.array(z.string().max(500)).max(100).nullish() }).nullish(), workplaceType: z.string().optional(),
  createdAt: z.number().int().positive().optional() });
const ashby = z.object({ id: z.string().min(1).max(150), title: z.string().min(1).max(300), jobUrl: httpsUrl,
  applyUrl: httpsUrl.optional(), descriptionPlain: z.string().max(200000).optional(), descriptionHtml: z.string().max(200000).optional(),
  location: z.string().max(500).nullish(), isRemote: z.boolean().optional(), workplaceType: z.string().optional(),
  publishedAt: z.string().datetime({ offset: true }).optional(), isListed: z.boolean().optional() });
export class BoardRequestError extends Error {
  constructor(public readonly transient: boolean) { super("Public job source unavailable."); }
}
export function plainJobText(text: string) {
  // Decode common board escapes before stripping markup; content is rendered only as text.
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim().slice(0, 50000);
}

/** Each bounded batch exposes its next offset; callers must not treat offsets as a stable snapshot. */
export async function fetchPublicBoard(input: IngestionSource, fetcher = fetch, startOffset = 0) {
  const source = ingestionSourceSchema.parse(input);
  if (!Number.isSafeInteger(startOffset) || startOffset < 0 || startOffset > 10000 || startOffset % 200 !== 0) {
    throw new BoardRequestError(false);
  }
  const readPage = async (offset: number) => {
  const url = source.platform === "GREENHOUSE"
    ? `https://boards-api.greenhouse.io/v1/boards/${source.board}/jobs?content=true`
    : source.platform === "ASHBY"
      ? `https://api.ashbyhq.com/posting-api/job-board/${source.board}?includeCompensation=true`
      : `https://api.lever.co/v0/postings/${source.board}?mode=json&limit=50&skip=${offset}`;
  let response: Response;
  try { response = await fetcher(url, { headers: { Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(15000) }); }
  catch { throw new BoardRequestError(true); }
  if (!response.ok) throw new BoardRequestError(response.status === 429 || response.status >= 500);
  const reader = response.body?.getReader();
  if (!reader) throw new BoardRequestError(false);
  const decoder = new TextDecoder(); let body = ""; let bytes = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break;
      bytes += value.byteLength; if (bytes > 4 * 1024 * 1024) { await reader.cancel(); throw new BoardRequestError(false); }
      body += decoder.decode(value, { stream: true }); }
    body += decoder.decode();
  } catch (error) { throw error instanceof BoardRequestError ? error : new BoardRequestError(true); }
  let raw: unknown;
  try { raw = JSON.parse(body); } catch { throw new BoardRequestError(false); }
  const list = source.platform === "GREENHOUSE" || source.platform === "ASHBY"
    ? z.object({ jobs: z.array(z.unknown()).max(10000) }).safeParse(raw)
    : z.array(z.unknown()).max(50).safeParse(raw);
  if (!list.success) throw new BoardRequestError(false);
  return Array.isArray(list.data) ? list.data : list.data.jobs;
  };
  const entries: unknown[] = [];
  let incomplete = false;
  if (source.platform === "GREENHOUSE" || source.platform === "ASHBY") {
    const all = await readPage(0);
    entries.push(...all.slice(startOffset, startOffset + 200));
    incomplete = all.length > startOffset + 200;
  } else {
    for (let offset = startOffset; offset <= startOffset + 200; offset += 50) {
      const page = await readPage(offset);
      if (offset === startOffset + 200) { incomplete = page.length > 0; break; }
      entries.push(...page);
      if (page.length < 50) break;
    }
  }
  const jobs: RawIngestedJob[] = []; let invalid = 0;
  const seenIds = new Set<string>();
  for (const entry of entries.slice(0, 200)) {
    if (source.platform === "GREENHOUSE") {
      const parsed = greenhouse.safeParse(entry); if (!parsed.success) { invalid++; continue; }
      const job = parsed.data; const description = plainJobText(job.content);
      if (seenIds.has(String(job.id))) throw new BoardRequestError(true);
      seenIds.add(String(job.id));
      if (description.length < 20) { invalid++; continue; }
      const location = job.location?.name;
      jobs.push({ title: job.title, company: source.board, description, location,
        remoteType: /remote/i.test(location ?? "") ? "REMOTE_ONLY" : "ANY", atsPlatform: "GREENHOUSE",
        applicationUrl: job.absolute_url, externalJobId: String(job.id), postedAt: job.updated_at ? new Date(job.updated_at) : undefined });
    } else if (source.platform === "ASHBY") {
      const parsed = ashby.safeParse(entry); if (!parsed.success) { invalid++; continue; }
      const job = parsed.data;
      if (job.isListed === false) continue;
      if (seenIds.has(job.id)) throw new BoardRequestError(true);
      seenIds.add(job.id);
      const description = plainJobText(job.descriptionPlain ?? job.descriptionHtml ?? "");
      if (description.length < 20) { invalid++; continue; }
      const wt = (job.workplaceType ?? "").toLowerCase();
      const remoteType = wt === "remote" || job.isRemote ? "REMOTE_ONLY" : wt === "hybrid" ? "HYBRID" : wt === "onsite" || wt === "on-site" ? "ONSITE" : /remote/i.test(job.location ?? "") ? "REMOTE_ONLY" : "ANY";
      jobs.push({ title: job.title, company: source.board, description, location: job.location ?? undefined,
        remoteType, atsPlatform: "ASHBY", applicationUrl: job.applyUrl ?? job.jobUrl, externalJobId: job.id,
        postedAt: job.publishedAt ? new Date(job.publishedAt) : undefined });
    } else {
      const parsed = lever.safeParse(entry); if (!parsed.success) { invalid++; continue; }
      const job = parsed.data; const description = plainJobText([job.descriptionPlain, ...job.lists?.map((item) => `${item.text} ${item.content}`) ?? []].filter(Boolean).join(" "));
      if (seenIds.has(job.id)) throw new BoardRequestError(true);
      seenIds.add(job.id);
      if (description.length < 20) { invalid++; continue; }
      const locations = [...new Set([job.categories?.location, ...job.categories?.allLocations ?? []].filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
      jobs.push({ title: job.text, company: source.board, description, location: locations.length ? locations.join(" / ") : undefined,
        remoteType: job.workplaceType === "remote" ? "REMOTE_ONLY" : job.workplaceType === "hybrid" ? "HYBRID" : job.workplaceType === "on-site" || job.workplaceType === "onsite" ? "ONSITE" : "ANY",
        atsPlatform: "LEVER", applicationUrl: job.applyUrl ?? job.hostedUrl, externalJobId: job.id,
        postedAt: job.createdAt ? new Date(job.createdAt) : undefined });
    }
  }
  return { fetched: entries.length, selected: entries.length, invalid, jobs, incomplete,
    nextOffset: incomplete && startOffset < 10000 ? startOffset + 200 : null };
}
