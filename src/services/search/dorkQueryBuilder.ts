/**
 * Hunt Deck — Google Dork Query Builder Service
 * 
 * Implements PRD Module 9.2 & 9.3.1 Dork Query Generation Engine:
 * Generates structured, high-precision search operator queries to bypass job board
 * syndication noise and surface direct company career pages and hiring contacts:
 *  - ATS Portals (Greenhouse, Lever, Ashby, Workday, BambooHR)
 *  - Company direct domains (inurl:careers / inurl:jobs)
 *  - Startup ecosystems (Notion public hubs, YC Work at a Startup)
 *  - LinkedIn Hiring Manager & Team Lead Discovery
 *  - Social Hiring Post queries
 */

export interface DorkQueryOptions {
  roleTitle: string;
  companyName?: string;
  companyDomain?: string;
  location?: string;
  remoteOnly?: boolean;
  requiredSkills?: string[];
  seniority?: "staff" | "senior" | "lead" | "manager" | "director" | "any";
}

export interface DorkContactQuery {
  roleType: "hiring_manager" | "team_lead" | "executive" | "peer";
  targetTitle: string;
  query: string;
  purpose: string;
}

export interface DorkQuerySet {
  targetRole: string;
  targetCompany?: string;
  atsQueries: Array<{ platform: string; query: string; purpose: string }>;
  directDomainQueries: Array<{ query: string; purpose: string }>;
  contactDorks: DorkContactQuery[];
  socialHiringDorks: Array<{ platform: "linkedin" | "x"; query: string }>;
  allQueries: string[];
}

/**
 * Sanitizes input tokens for Google Search operator safety
 */
function cleanSearchTerm(term: string): string {
  return term.replace(/["\r\n\t]/g, "").trim();
}

/**
 * Builds a multi-platform set of Google Dork queries for a target role or company
 */
export function buildDorkQuerySet(options: DorkQueryOptions): DorkQuerySet {
  const cleanRole = cleanSearchTerm(options.roleTitle);
  const cleanCompany = options.companyName ? cleanSearchTerm(options.companyName) : "";
  const cleanDomain = options.companyDomain ? options.companyDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : "";
  const locationClause = options.remoteOnly ? '"remote"' : options.location ? `"${cleanSearchTerm(options.location)}"` : "";
  const skillsClause = options.requiredSkills && options.requiredSkills.length > 0
    ? `"${options.requiredSkills.slice(0, 2).map(cleanSearchTerm).join('" "')}"`
    : "";

  const companyScope = cleanCompany ? `"${cleanCompany}"` : "";

  // 1. Direct ATS Platform Dorks
  const atsQueries = [
    {
      platform: "Greenhouse",
      query: `site:boards.greenhouse.io ${companyScope} "${cleanRole}" ${locationClause} ${skillsClause}`.trim(),
      purpose: "Target authoritative Greenhouse hosted career portals",
    },
    {
      platform: "Lever",
      query: `site:jobs.lever.co ${companyScope} "${cleanRole}" ${locationClause}`.trim(),
      purpose: "Target native Lever job listings",
    },
    {
      platform: "Ashby",
      query: `site:jobs.ashbyhq.com ${companyScope} "${cleanRole}" ${locationClause}`.trim(),
      purpose: "Surface hyper-growth startup roles on Ashby",
    },
    {
      platform: "Workday",
      query: `site:myworkdayjobs.com ${companyScope} "${cleanRole}" ${locationClause}`.trim(),
      purpose: "Target enterprise career portals on Workday",
    },
    {
      platform: "BambooHR",
      query: `site:bamboohr.com/careers ${companyScope} "${cleanRole}"`.trim(),
      purpose: "Surface mid-market and private company roles",
    },
  ];

  // 2. Direct Company Domain Dorks
  const directDomainQueries: Array<{ query: string; purpose: string }> = [];
  if (cleanDomain) {
    directDomainQueries.push({
      query: `site:${cleanDomain} (inurl:careers OR inurl:jobs OR inurl:work-with-us) "${cleanRole}"`,
      purpose: `Search company's primary domain (${cleanDomain}) directly`,
    });
  } else if (cleanCompany) {
    directDomainQueries.push({
      query: `"${cleanCompany}" (inurl:careers OR inurl:jobs) "${cleanRole}" ${locationClause}`.trim(),
      purpose: `Identify unindexed career subpages for ${cleanCompany}`,
    });
  }

  // 3. Notion & Startup Ecosystem Dorks
  directDomainQueries.push({
    query: `site:notion.site intitle:"careers" ${companyScope} "${cleanRole}"`.trim(),
    purpose: "Surface unadvertised startup jobs hosted on Notion",
  });
  directDomainQueries.push({
    query: `site:ycombinator.com/companies "we're hiring" ${companyScope} "${cleanRole}"`.trim(),
    purpose: "Capture YC-backed founder postings",
  });

  // 4. Contact Intelligence & Hiring Manager Dorks (PRD 9.3.3)
  const contactDorks: DorkContactQuery[] = [];
  if (cleanCompany) {
    // Engineering / Product Leadership
    contactDorks.push({
      roleType: "hiring_manager",
      targetTitle: "Engineering Manager / Director",
      query: `site:linkedin.com/in "${cleanCompany}" ("Engineering Manager" OR "Director of Engineering" OR "VP of Engineering")`,
      purpose: "Find exact engineering leaders overseeing this technical team",
    });

    contactDorks.push({
      roleType: "team_lead",
      targetTitle: "Staff Engineer / Tech Lead",
      query: `site:linkedin.com/in "${cleanCompany}" ("Staff Engineer" OR "Tech Lead" OR "Principal Engineer")`,
      purpose: "Find direct peer senior engineers who can provide warm referrals",
    });

    contactDorks.push({
      roleType: "executive",
      targetTitle: "CTO / Head of Technology",
      query: `site:linkedin.com/in "${cleanCompany}" ("CTO" OR "Chief Technology Officer" OR "Head of Engineering")`,
      purpose: "Identify top-level technical executive sponsor",
    });

    contactDorks.push({
      roleType: "peer",
      targetTitle: "Senior Recruiter / Talent Lead",
      query: `site:linkedin.com/in "${cleanCompany}" ("Technical Recruiter" OR "Head of Talent" OR "Talent Partner")`,
      purpose: "Identify internal recruiters running the interview pipeline",
    });
  }

  // 5. Social Hiring Post Dorks (PRD 2.6 / 4.5 Mellow Architecture)
  const socialHiringDorks = [
    {
      platform: "linkedin" as const,
      query: `site:linkedin.com/posts ${companyScope} ("we're hiring" OR "excited to announce we are looking for a" OR "join my team") "${cleanRole}"`.trim(),
    },
    {
      platform: "x" as const,
      query: `site:x.com/*/status ${companyScope} ("we're hiring" OR "looking to hire") "${cleanRole}"`.trim(),
    },
  ];

  const allQueries = [
    ...atsQueries.map((q) => q.query),
    ...directDomainQueries.map((q) => q.query),
    ...contactDorks.map((q) => q.query),
    ...socialHiringDorks.map((q) => q.query),
  ];

  return {
    targetRole: cleanRole,
    targetCompany: cleanCompany || undefined,
    atsQueries,
    directDomainQueries,
    contactDorks,
    socialHiringDorks,
    allQueries,
  };
}

