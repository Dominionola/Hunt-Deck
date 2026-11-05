import type { RawIngestedJob } from "./types";

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_description: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_apply_link: string;
  job_is_remote: boolean;
  job_min_salary?: number;
  job_max_salary?: number;
  job_posted_at_datetime_utc?: string;
}

interface JSearchResponse {
  data: JSearchJob[];
}

/**
 * Searches and ingests jobs via JSearch (RapidAPI).
 * Covers aggregate postings across Google Jobs, LinkedIn, Indeed, Glassdoor.
 */
export async function searchJSearchJobs(
  query: string,
  numPages: number = 1
): Promise<RawIngestedJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY || process.env.JSEARCH_API_KEY;

  if (!apiKey) {
    // When no external API key is set, gracefully return empty or local mock
    return [];
  }

  const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=${numPages}`;

  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error(`JSearch API responded with ${res.status}`);
    }

    const data = (await res.json()) as JSearchResponse;

    return (data.data || []).map((job): RawIngestedJob => {
      const locationParts = [job.job_city, job.job_state, job.job_country].filter(Boolean);

      // Detect ATS platform from apply link
      let platform: RawIngestedJob["atsPlatform"] = "OTHER";
      if (/greenhouse\.io/i.test(job.job_apply_link)) platform = "GREENHOUSE";
      else if (/lever\.co/i.test(job.job_apply_link)) platform = "LEVER";
      else if (/ashbyhq\.com/i.test(job.job_apply_link)) platform = "ASHBY";
      else if (/myworkdayjobs\.com/i.test(job.job_apply_link)) platform = "WORKDAY";

      return {
        title: job.job_title,
        company: job.employer_name,
        description: job.job_description,
        location: locationParts.join(", ") || undefined,
        salaryMin: job.job_min_salary ? Math.round(job.job_min_salary) : undefined,
        salaryMax: job.job_max_salary ? Math.round(job.job_max_salary) : undefined,
        remoteType: job.job_is_remote ? "REMOTE_ONLY" : "ANY",
        atsPlatform: platform,
        applicationUrl: job.job_apply_link,
        externalJobId: job.job_id,
        postedAt: job.job_posted_at_datetime_utc
          ? new Date(job.job_posted_at_datetime_utc)
          : new Date(),
        sourceUrl: url,
      };
    });
  } catch (error) {
    console.warn(`[JSearch Adapter] Error searching query: ${query}`, error);
    return [];
  }
}
