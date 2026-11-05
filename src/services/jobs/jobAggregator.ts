import crypto from "crypto";
import { fetchGreenhouseJobs } from "./adapters/greenhouseAdapter";
import { fetchLeverJobs } from "./adapters/leverAdapter";
import { searchJSearchJobs } from "./adapters/jsearchAdapter";
import type { RawIngestedJob, JobIngestionResult } from "./adapters/types";
import { upsertJobPosting } from "@/services/db/jobService";

/**
 * Computes a deterministic SHA-256 fingerprint for deduplication.
 */
export function computeJobHash(company: string, title: string, applyUrl: string): string {
  const normalized = `${company.trim().toLowerCase()}::${title.trim().toLowerCase()}::${applyUrl.trim()}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export interface IngestionOptions {
  greenhouseBoards?: string[];
  leverSites?: string[];
  searchQueries?: string[];
}

/**
 * Default verified high-growth tech companies using Greenhouse & Lever ATS
 */
export const DEFAULT_GREENHOUSE_BOARDS = [
  "stripe",
  "figma",
  "github",
  "coinbase",
  "gusto",
  "brex",
  "ramp",
  "databricks",
];

export const DEFAULT_LEVER_SITES = [
  "netflix",
  "spotify",
  "atlassian",
  "docker",
  "palantir",
];

/**
 * Orchestrates multi-source job ingestion across Greenhouse, Lever, and search APIs.
 * Automatically deduplicates postings using SHA-256 before database insertion.
 */
export async function runJobIngestion(
  options: IngestionOptions = {}
): Promise<JobIngestionResult> {
  const greenhouseBoards = options.greenhouseBoards || DEFAULT_GREENHOUSE_BOARDS;
  const leverSites = options.leverSites || DEFAULT_LEVER_SITES;
  const searchQueries = options.searchQueries || [];

  const allJobs: RawIngestedJob[] = [];
  const errors: string[] = [];

  // 1. Fetch from Greenhouse boards
  await Promise.allSettled(
    greenhouseBoards.map(async (board) => {
      try {
        const jobs = await fetchGreenhouseJobs(board);
        allJobs.push(...jobs);
      } catch (err: unknown) {
        errors.push(`Greenhouse board ${board}: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );

  // 2. Fetch from Lever sites
  await Promise.allSettled(
    leverSites.map(async (site) => {
      try {
        const jobs = await fetchLeverJobs(site);
        allJobs.push(...jobs);
      } catch (err: unknown) {
        errors.push(`Lever site ${site}: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );

  // 3. Fetch from JSearch queries if configured
  await Promise.allSettled(
    searchQueries.map(async (query) => {
      try {
        const jobs = await searchJSearchJobs(query);
        allJobs.push(...jobs);
      } catch (err: unknown) {
        errors.push(`JSearch query ${query}: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );

  // 4. SHA-256 In-Memory Deduplication
  const seenHashes = new Set<string>();
  const uniqueJobs: RawIngestedJob[] = [];

  for (const job of allJobs) {
    const hash = computeJobHash(job.company, job.title, job.applicationUrl);
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      uniqueJobs.push(job);
    }
  }

  // 5. Persist unique jobs to PostgreSQL database
  let savedCount = 0;
  for (const job of uniqueJobs) {
    try {
      await upsertJobPosting({
        title: job.title,
        company: job.company,
        description: job.description,
        location: job.location,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        remoteType: job.remoteType,
        atsPlatform: job.atsPlatform,
        applicationUrl: job.applicationUrl,
        externalJobId: job.externalJobId,
        postedAt: job.postedAt,
      });
      savedCount++;
    } catch {
      // Continue persisting remaining jobs if one fails or DB offline in dev
    }
  }

  return {
    source: "multi_source_orchestrator",
    totalFetched: allJobs.length,
    deduplicatedCount: uniqueJobs.length,
    jobs: uniqueJobs,
    errors,
  };
}
