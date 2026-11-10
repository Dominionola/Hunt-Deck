/**
 * Hunt Deck — Hiring Manager & Team Lead LinkedIn Profile Discovery
 * 
 * Implements PRD Module 9.3.3 Item 2:
 * Parses public LinkedIn profile metadata surfaced via Google Dorks
 * without direct scraping, preventing account bans and Terms of Service violations:
 *  - Categorizes into: hiring_manager, team_lead, executive, potential_referral
 *  - Extracts clean fullName, sanitized current title, and canonical LinkedIn URL
 */

import { buildDorkQuerySet } from "../search/dorkQueryBuilder";
import { executeDorkSearch, type SearchResultItem } from "../search/serpApiClient";

export type ContactRoleType =
  | "hiring_manager"
  | "team_lead"
  | "executive"
  | "potential_referral"
  | "recruiter";

export interface DiscoveredContact {
  fullName: string;
  title: string;
  companyName: string;
  linkedinUrl: string;
  roleType: ContactRoleType;
  department: string;
  summarySnippet: string;
}

/**
 * Parses full name and title from standard LinkedIn search snippet format:
 * "First Last - Job Title - Company Name | LinkedIn"
 */
export function parseLinkedInSnippet(
  item: SearchResultItem,
  companyName: string
): DiscoveredContact | null {
  if (!item.isLinkedInProfile) return null;

  // Typical title: "David Singleton - Chief Technology Officer - Stripe | LinkedIn"
  const titleClean = item.title.replace(/\s*\|\s*LinkedIn$/i, "").trim();
  const parts = titleClean.split(/\s*[-–—|]\s*/);

  let fullName = parts[0]?.trim() || "Engineering Leader";
  const title = parts[1]?.trim() || "Technical Lead";

  // Sanitize name if title prefix leaked
  fullName = fullName.replace(/^(?:Dr\.|Mr\.|Ms\.|Mrs\.)\s+/i, "");

  // Infer role category
  const titleLower = title.toLowerCase();
  let roleType: ContactRoleType = "potential_referral";

  if (titleLower.includes("manager") || titleLower.includes("director") || titleLower.includes("head of")) {
    roleType = "hiring_manager";
  } else if (titleLower.includes("cto") || titleLower.includes("vp") || titleLower.includes("chief")) {
    roleType = "executive";
  } else if (titleLower.includes("lead") || titleLower.includes("staff") || titleLower.includes("principal")) {
    roleType = "team_lead";
  } else if (titleLower.includes("recruiter") || titleLower.includes("talent")) {
    roleType = "recruiter";
  }

  // Infer department
  let department = "Engineering";
  if (titleLower.includes("engineer") || titleLower.includes("systems") || titleLower.includes("infrastructure")) {
    department = "Engineering";
  } else if (titleLower.includes("product") && !titleLower.includes("engineering")) {
    department = "Product";
  } else if (titleLower.includes("design")) {
    department = "Design";
  } else if (titleLower.includes("data") || titleLower.includes("ml") || titleLower.includes("ai")) {
    department = "Data & AI";
  } else if (titleLower.includes("talent") || titleLower.includes("recruiting")) {
    department = "Talent";
  }

  return {
    fullName,
    title,
    companyName,
    linkedinUrl: item.link,
    roleType,
    department,
    summarySnippet: item.snippet,
  };
}

/**
 * Discovers likely hiring managers and referral contacts for a target company and role
 */
export async function discoverKeyContacts(
  companyName: string,
  roleTitle: string
): Promise<DiscoveredContact[]> {
  const querySet = buildDorkQuerySet({
    companyName,
    roleTitle,
  });

  const discoveredContacts: DiscoveredContact[] = [];
  const seenUrls = new Set<string>();

  for (const contactDork of querySet.contactDorks) {
    const searchResponse = await executeDorkSearch(contactDork.query);

    for (const item of searchResponse.results) {
      if (seenUrls.has(item.link)) continue;

      const contact = parseLinkedInSnippet(item, companyName);
      if (contact) {
        seenUrls.add(item.link);
        // Override roleType if specifically targeted by the dork
        if (contactDork.roleType === "hiring_manager" && contact.roleType === "potential_referral") {
          contact.roleType = "hiring_manager";
        }
        discoveredContacts.push(contact);
      }
    }
  }

  return discoveredContacts;
}
