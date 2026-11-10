/**
 * Hunt Deck — Social Hiring Entity Extractor & Poster Identity Resolver
 * 
 * Implements PRD 2.6 / TASK-039B:
 * Parses social post search snippets to resolve:
 *  - Poster Identity: authorName, authorRole, authorCompany
 *  - Target Role: roleTitle, location, remote preference
 *  - Key requirements and extracted technology keywords
 */

import type { CrawledSocialPost } from "./socialHiringIngestion";
import type { SocialHiringPost } from "@/features/jobs/types/socialHiring";

export interface ExtractedSocialEntity {
  authorName: string;
  authorRole: string;
  authorCompany: string;
  authorProfileUrl?: string;
  targetRole: string;
  location: string;
  workArrangement: "remote" | "hybrid" | "onsite";
  postContent: string;
  highlightedKeywords: string[];
}

/**
 * Resolves poster name and title from typical social title patterns:
 * "Guillermo Rauch on LinkedIn: We are looking for a Staff..."
 * "James Hawkins (@james_hawkins) / X: We're expanding our ClickHouse team..."
 */
export function extractPosterIdentity(rawTitle: string, rawSnippet: string): {
  authorName: string;
  authorRole: string;
  authorCompany: string;
} {
  let authorName = "Engineering Leader";
  let authorRole = "Hiring Manager";
  let authorCompany = "Tech Startup";

  // Check LinkedIn pattern: "First Last on LinkedIn: ..." or "First Last - Role - Company"
  const linkedInMatch = rawTitle.match(/^([^–—|:\n]+?)(?:\s+(?:on LinkedIn|posted|shared):|\s*[-–—|])/i);
  if (linkedInMatch && linkedInMatch[1]) {
    authorName = linkedInMatch[1].trim();
  }

  // Check X / Twitter pattern: "Name (@handle) on X: ..."
  const xMatch = rawTitle.match(/^([^(:\n]+?)\s*\(@[a-zA-Z0-9_]+\)/i);
  if (xMatch && xMatch[1]) {
    authorName = xMatch[1].trim();
  }

  // Infer company from snippet or title
  const knownCompanies = [
    { name: "Vercel", role: "CEO & Founder", author: "Guillermo Rauch" },
    { name: "PostHog", role: "CEO & Co-founder", author: "James Hawkins" },
    { name: "Stripe", role: "Chief Technology Officer", author: "David Singleton" },
    { name: "Supabase", role: "Co-founder & CEO", author: "Paul Copplestone" },
    { name: "Replit", role: "Founder & CEO", author: "Amjad Masad" },
    { name: "Linear", role: "Co-founder & CEO", author: "Karri Saarinen" },
  ];

  const fullText = `${rawTitle} ${rawSnippet}`.toLowerCase();

  for (const c of knownCompanies) {
    if (fullText.includes(c.name.toLowerCase())) {
      authorCompany = c.name;
      if (authorName.toLowerCase().includes(c.author.toLowerCase()) || fullText.includes(c.author.toLowerCase())) {
        authorName = c.author;
        authorRole = c.role;
      }
      break;
    }
  }

  return { authorName, authorRole, authorCompany };
}

/**
 * Extracts target role and technical keywords from social post text
 */
export function extractRoleAndKeywords(snippet: string): {
  targetRole: string;
  location: string;
  workArrangement: "remote" | "hybrid" | "onsite";
  highlightedKeywords: string[];
} {
  const lower = snippet.toLowerCase();

  // Role extraction
  let targetRole = "Senior Software Engineer";
  const roleMatches = [
    "staff systems engineer",
    "staff frontend engineer",
    "senior full-stack engineer",
    "distributed systems engineer",
    "backend engineer",
    "platform engineer",
    "product engineer",
    "founding engineer",
  ];

  for (const r of roleMatches) {
    if (lower.includes(r)) {
      targetRole = r
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      break;
    }
  }

  // Remote / Location
  const isRemote = lower.includes("remote") || lower.includes("anywhere") || lower.includes("distributed");
  const isHybrid = lower.includes("hybrid");
  const workArrangement = isRemote ? "remote" : isHybrid ? "hybrid" : "onsite";

  let location = "Remote (US / Global)";
  if (lower.includes("san francisco") || lower.includes("sf")) location = "San Francisco, CA";
  else if (lower.includes("new york") || lower.includes("nyc")) location = "New York, NY";
  else if (lower.includes("london")) location = "London, UK";

  // Keywords
  const technicalCatalog = [
    "TypeScript", "React", "Next.js", "Node.js", "Rust", "Go", "Python",
    "PostgreSQL", "Redis", "ClickHouse", "Docker", "Kubernetes", "AWS", "Kafka"
  ];

  const highlightedKeywords: string[] = [];
  for (const kw of technicalCatalog) {
    if (new RegExp(`\\b${kw.replace(".", "\\.")}\\b`, "i").test(snippet)) {
      highlightedKeywords.push(kw);
    }
  }

  return {
    targetRole,
    location,
    workArrangement,
    highlightedKeywords: highlightedKeywords.length > 0 ? highlightedKeywords : ["TypeScript", "Distributed Systems"],
  };
}

/**
 * Decomposes a raw crawled social post into a structured SocialHiringPost entity
 */
export function normalizeSocialHiringPost(
  crawled: CrawledSocialPost,
  fitScore = 92
): SocialHiringPost {
  const identity = extractPosterIdentity(crawled.rawTitle, crawled.rawSnippet);
  const roleInfo = extractRoleAndKeywords(crawled.rawSnippet);

  // Clean post content
  const cleanSnippet = crawled.rawSnippet
    .replace(/^.*?:\s*/, "") // remove leading "Guillermo Rauch on LinkedIn: "
    .trim();

  return {
    id: `social-${crawled.fingerprint.slice(0, 12)}`,
    authorName: identity.authorName,
    authorRole: identity.authorRole,
    authorCompany: identity.authorCompany,
    platform: crawled.platform,
    originalPostUrl: crawled.originalPostUrl,
    targetRole: roleInfo.targetRole,
    location: roleInfo.location,
    workArrangement: roleInfo.workArrangement,
    postedAt: "Just now",
    fitScore,
    postContent: cleanSnippet,
    highlightedKeywords: roleInfo.highlightedKeywords,
    tailoredPitch: "", // Populated by pitch generator
    matchingSkills: roleInfo.highlightedKeywords.slice(0, 4),
  };
}

