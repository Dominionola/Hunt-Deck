import type { RawIngestedJob } from "./types";
import { extractDirectEmailsFromDescription } from "@/services/contacts/contactIntelligenceService";

export interface HnCommentHit {
  objectID: string;
  author: string;
  comment_text?: string;
  created_at: string;
  created_at_i: number;
  parent_id: number;
  story_id: number;
}

export interface HnStoryHit {
  objectID: string;
  title: string;
  created_at: string;
}

export interface HnJobItem extends RawIngestedJob {
  directEmail?: string;
  author: string;
}

/**
 * Decodes HTML entities and normalizes paragraph breaks from Hacker News comment HTML
 */
export function decodeHnHtml(rawHtml: string): string {
  if (!rawHtml) return "";

  return rawHtml
    .replace(/<p>/gi, "\n\n")
    .replace(/<\/p>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>.*?<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/g, "/")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extracts salary numbers from HN compensation strings (e.g. "$120k - $160k", "€90k-€110k", "$140,000 - $180,000")
 */
export function parseSalaryRange(text: string): { salaryMin?: number; salaryMax?: number } {
  const match = text.match(
    /(?:\$|€|£)\s*(\d{2,3}k|\d{1,3}(?:,\d{3})*)\s*(?:-|–|—|to)\s*(?:\$|€|£)?\s*(\d{2,3}k|\d{1,3}(?:,\d{3})*)/i
  );

  if (!match) return {};

  const parseVal = (str: string) => {
    const clean = str.toLowerCase().replace(/,/g, "").trim();
    if (clean.endsWith("k")) {
      return parseInt(clean.slice(0, -1), 10) * 1000;
    }
    return parseInt(clean, 10);
  };

  const min = parseVal(match[1]);
  const max = parseVal(match[2]);

  if (!isNaN(min) && !isNaN(max) && min > 0 && max >= min) {
    return { salaryMin: min, salaryMax: max };
  }

  return {};
}

/**
 * Parses a top-level Hacker News "Who is Hiring" comment into a normalized job posting
 */
export function parseHnJobComment(comment: HnCommentHit): HnJobItem | null {
  if (!comment.comment_text || comment.comment_text.trim().length < 25) {
    return null;
  }

  const plainText = decodeHnHtml(comment.comment_text);
  if (!plainText) return null;

  const paragraphs = plainText.split("\n\n").map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return null;

  // The first paragraph almost always has the header: "Company | Title | Location | ..."
  const header = paragraphs[0];
  const parts = header.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);

  if (parts.length < 2) {
    // If not pipe-separated, check for bullet or dash separation
    const dashParts = header.split(/\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean);
    if (dashParts.length < 2) {
      return null; // Not a structured hiring post
    }
  }

  const company = parts[0]?.replace(/^[*_~]+|[*_~]+$/g, "").trim() || "Startup";
  const title = parts[1]?.replace(/^[*_~]+|[*_~]+$/g, "").trim() || "Software Engineer";

  // Check if this is an automated / meta moderation comment
  if (/who is hiring\?/i.test(company) || /guidelines/i.test(company)) {
    return null;
  }

  // Location / Remote Detection
  const fullText = plainText;

  let remoteType: RawIngestedJob["remoteType"] = "ANY";
  if (/\bremote\s+only\b/i.test(header) || /\b100%\s+remote\b/i.test(header)) {
    remoteType = "REMOTE_ONLY";
  } else if (/\bremote\b/i.test(header) || /\bremote\b/i.test(paragraphs.slice(0, 2).join(" "))) {
    remoteType = "REMOTE_ONLY";
  } else if (/\bhybrid\b/i.test(header)) {
    remoteType = "HYBRID";
  } else if (/\bonsite\b|\bon-site\b/i.test(header)) {
    remoteType = "ONSITE";
  }

  // Extract location snippet
  let location: string | undefined = undefined;
  if (parts.length >= 3) {
    const locCandidate = parts[2];
    if (!/^\$|^€|^£|visa|intern|full[- ]time/i.test(locCandidate)) {
      location = locCandidate;
    }
  }

  // Extract Direct Email
  const directEmails = extractDirectEmailsFromDescription(fullText);
  const directEmail = directEmails[0];

  // Extract Application or Career URL
  const urlMatches = fullText.match(/https?:\/\/[^\s<>"')]+[^\s<>"'),.]/g) ?? [];
  let applicationUrl = "";

  for (const url of urlMatches) {
    // Prioritize direct ATS links or career pages
    if (/greenhouse\.io|lever\.co|ashbyhq\.com|workday\.com|bamboohr\.com|apply|career|jobs/i.test(url)) {
      applicationUrl = url;
      break;
    }
  }

  if (!applicationUrl && urlMatches.length > 0 && urlMatches[0]) {
    applicationUrl = urlMatches[0];
  }

  if (!applicationUrl) {
    if (directEmail) {
      applicationUrl = `mailto:${directEmail}?subject=${encodeURIComponent(`Application for ${title} via HN Who is Hiring`)}`;
    } else {
      applicationUrl = `https://news.ycombinator.com/item?id=${comment.objectID}`;
    }
  }

  // Extract Compensation
  const { salaryMin, salaryMax } = parseSalaryRange(header + " " + (paragraphs[1] || ""));

  return {
    company,
    title,
    description: plainText,
    location,
    salaryMin,
    salaryMax,
    remoteType,
    atsPlatform: "OTHER",
    applicationUrl,
    externalJobId: `hn-${comment.objectID}`,
    sourceUrl: `https://news.ycombinator.com/item?id=${comment.objectID}`,
    postedAt: new Date(comment.created_at_i * 1000),
    directEmail,
    author: comment.author,
  };
}

/**
 * Discovers the story ID of the latest official "Ask HN: Who is hiring?" thread
 */
export async function fetchLatestHnWhoIsHiringThread(
  fetcher: typeof fetch = fetch
): Promise<{ storyId: string; title: string; date: string }> {
  const url = "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&query=Ask%20HN:%20Who%20is%20hiring&hitsPerPage=3";
  const res = await fetcher(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    throw new Error(`Failed to query HN Algolia API: HTTP ${res.status}`);
  }

  const data = (await res.json()) as { hits?: HnStoryHit[] };
  const thread = data.hits?.find((h) => /^Ask HN: Who is hiring\?/i.test(h.title));

  if (!thread) {
    throw new Error("Could not find an active 'Ask HN: Who is hiring?' thread.");
  }

  return {
    storyId: thread.objectID,
    title: thread.title,
    date: thread.created_at,
  };
}

export interface FetchHnHiringOptions {
  storyId?: string;
  page?: number;
  hitsPerPage?: number;
  remoteOnly?: boolean;
  search?: string;
  fetcher?: typeof fetch;
}

/**
 * Fetches and parses direct job postings from the Hacker News "Who is Hiring" thread
 */
export async function fetchHnWhoIsHiringJobs(options: FetchHnHiringOptions = {}): Promise<{
  threadId: string;
  threadTitle: string;
  totalHits: number;
  jobs: HnJobItem[];
}> {
  const fetcher = options.fetcher || fetch;
  let threadId = options.storyId;
  let threadTitle = "Ask HN: Who is hiring?";

  if (!threadId) {
    const latest = await fetchLatestHnWhoIsHiringThread(fetcher);
    threadId = latest.storyId;
    threadTitle = latest.title;
  }

  const page = options.page ?? 0;
  const hitsPerPage = options.hitsPerPage ?? 50;

  let queryUrl = `https://hn.algolia.com/api/v1/search?tags=comment,story_${threadId}&numericFilters=parent_id=${threadId}&page=${page}&hitsPerPage=${hitsPerPage}`;
  if (options.search?.trim()) {
    queryUrl += `&query=${encodeURIComponent(options.search.trim())}`;
  }

  const res = await fetcher(queryUrl, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Failed to fetch HN hiring comments: HTTP ${res.status}`);
  }

  const data = (await res.json()) as { hits?: HnCommentHit[]; nbHits?: number };
  const rawHits = data.hits ?? [];

  const parsedJobs = rawHits
    .map(parseHnJobComment)
    .filter((j): j is HnJobItem => j !== null);

  const filteredJobs = options.remoteOnly
    ? parsedJobs.filter((j) => j.remoteType === "REMOTE_ONLY")
    : parsedJobs;

  return {
    threadId,
    threadTitle,
    totalHits: data.nbHits ?? parsedJobs.length,
    jobs: filteredJobs,
  };
}
