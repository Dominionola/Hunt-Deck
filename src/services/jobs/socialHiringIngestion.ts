/**
 * Hunt Deck — Social Hiring Post Ingestion Service (The Mellow Model)
 * 
 * Implements PRD 2.6 / Phase 4.5:
 *  - Ingests founder & recruiter social hiring posts via Google Dorks & SerpAPI
 *  - Harvests search engine cache snippets without direct scraping, preventing account bans
 *  - Deduplicates posts via SHA-256 content hashes
 *  - Normalizes LinkedIn and X/Twitter hiring status updates
 */

import { createHash } from "node:crypto";
import { executeDorkSearch } from "../search/serpApiClient";

export interface CrawledSocialPost {
  fingerprint: string;
  platform: "linkedin" | "x" | "threads";
  rawTitle: string;
  rawSnippet: string;
  originalPostUrl: string;
  sourceDomain: string;
}

/**
 * Generates a deterministic SHA-256 fingerprint for deduplication
 */
export function generateSocialPostFingerprint(originalPostUrl: string, content: string): string {
  const normalized = `${originalPostUrl.toLowerCase().trim()}|${content.toLowerCase().replace(/\s+/g, " ").trim()}`;
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Checks if a search result URL is a canonical social hiring post
 */
export function isSocialHiringUrl(url: string): { isSocial: boolean; platform: "linkedin" | "x" | "threads" } {
  const lower = url.toLowerCase();

  if (lower.includes("linkedin.com/posts/") || lower.includes("linkedin.com/feed/update/")) {
    return { isSocial: true, platform: "linkedin" };
  }
  if (lower.includes("x.com/") && lower.includes("/status/")) {
    return { isSocial: true, platform: "x" };
  }
  if (lower.includes("twitter.com/") && lower.includes("/status/")) {
    return { isSocial: true, platform: "x" };
  }
  if (lower.includes("threads.net/@") && lower.includes("/post/")) {
    return { isSocial: true, platform: "threads" };
  }

  return { isSocial: false, platform: "linkedin" };
}

/**
 * Filters out noise to ensure post represents an actual hiring intent
 */
export function hasHiringIntent(snippet: string): boolean {
  const lower = snippet.toLowerCase();
  const hiringKeywords = [
    "hiring",
    "looking for a",
    "looking to hire",
    "join my team",
    "join our team",
    "we're expanding",
    "dm me if interested",
    "open role",
    "engineering opening",
    "staff engineer",
    "senior engineer",
  ];

  return hiringKeywords.some((kw) => lower.includes(kw));
}

/**
 * Executes social hiring dork queries and returns unique deduplicated candidate posts
 */
export async function harvestSocialHiringPosts(
  targetRole: string,
  targetCompany?: string
): Promise<CrawledSocialPost[]> {
  const companyScope = targetCompany ? `"${targetCompany}"` : "";

  const queries = [
    `site:linkedin.com/posts ${companyScope} ("we're hiring" OR "looking to hire" OR "join my team") "${targetRole}"`,
    `site:x.com/*/status ${companyScope} ("we're hiring" OR "looking to hire") "${targetRole}"`,
  ];

  const harvested: CrawledSocialPost[] = [];
  const seenFingerprints = new Set<string>();

  for (const q of queries) {
    const response = await executeDorkSearch(q);

    for (const item of response.results) {
      const { isSocial, platform } = isSocialHiringUrl(item.link);
      if (!isSocial) continue;
      if (!hasHiringIntent(item.snippet + " " + item.title)) continue;

      const fingerprint = generateSocialPostFingerprint(item.link, item.snippet);
      if (seenFingerprints.has(fingerprint)) continue;

      seenFingerprints.add(fingerprint);
      harvested.push({
        fingerprint,
        platform,
        rawTitle: item.title,
        rawSnippet: item.snippet,
        originalPostUrl: item.link,
        sourceDomain: item.sourceDomain,
      });
    }
  }

  return harvested;
}
