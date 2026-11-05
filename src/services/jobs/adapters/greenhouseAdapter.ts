import type { RawIngestedJob } from "./types";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name: string };
  updated_at?: string;
  content?: string;
  departments?: Array<{ id: number; name: string }>;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

/**
 * Ingests jobs from a company's public Greenhouse board endpoint.
 * Zero authentication required — official public Greenhouse job board API.
 * Example board tokens: 'stripe', 'figma', 'github', 'coinbase'
 */
export async function fetchGreenhouseJobs(
  boardToken: string
): Promise<RawIngestedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "HuntDeck-Bot/1.0",
      },
      next: { revalidate: 1800 }, // Cache 30m
    });

    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`Greenhouse API responded with ${res.status}`);
    }

    const data = (await res.json()) as GreenhouseResponse;
    const companyName = boardToken.charAt(0).toUpperCase() + boardToken.slice(1);

    return (data.jobs || []).map((job): RawIngestedJob => {
      const locationName = job.location?.name || "";
      const isRemote = /remote/i.test(locationName) || /remote/i.test(job.title);

      // Clean HTML tags from Greenhouse content if present
      const cleanDescription = (job.content || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();

      return {
        title: job.title,
        company: companyName,
        description: cleanDescription || `${job.title} at ${companyName}`,
        location: locationName,
        remoteType: isRemote ? "REMOTE_ONLY" : "ANY",
        atsPlatform: "GREENHOUSE",
        applicationUrl: job.absolute_url,
        externalJobId: String(job.id),
        postedAt: job.updated_at ? new Date(job.updated_at) : new Date(),
        sourceUrl: url,
      };
    });
  } catch (error) {
    console.warn(`[Greenhouse Adapter] Failed to fetch board: ${boardToken}`, error);
    return [];
  }
}
