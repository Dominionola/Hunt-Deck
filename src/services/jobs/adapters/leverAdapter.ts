import type { RawIngestedJob } from "./types";

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl: string;
  descriptionPlain?: string;
  categories?: {
    location?: string;
    team?: string;
    commitment?: string;
  };
  workplaceType?: string; // "remote", "onsite", "hybrid"
  createdAt?: number;
}

/**
 * Ingests jobs from a company's public Lever postings endpoint.
 * Zero authentication required — official public Lever postings API.
 * Example sites: 'netflix', 'spotify', 'atlassian'
 */
export async function fetchLeverJobs(site: string): Promise<RawIngestedJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "HuntDeck-Bot/1.0",
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`Lever API responded with ${res.status}`);
    }

    const data = (await res.json()) as LeverPosting[];
    const companyName = site.charAt(0).toUpperCase() + site.slice(1);

    return (data || []).map((job): RawIngestedJob => {
      const workplace = (job.workplaceType || "").toLowerCase();
      const location = job.categories?.location || "";
      const isRemote =
        workplace === "remote" ||
        /remote/i.test(location) ||
        /remote/i.test(job.text);

      return {
        title: job.text,
        company: companyName,
        description: job.descriptionPlain || `${job.text} at ${companyName}`,
        location,
        remoteType: isRemote
          ? "REMOTE_ONLY"
          : workplace === "hybrid"
          ? "HYBRID"
          : "ANY",
        atsPlatform: "LEVER",
        applicationUrl: job.applyUrl || job.hostedUrl,
        externalJobId: job.id,
        postedAt: job.createdAt ? new Date(job.createdAt) : new Date(),
        sourceUrl: url,
      };
    });
  } catch (error) {
    console.warn(`[Lever Adapter] Failed to fetch site: ${site}`, error);
    return [];
  }
}
