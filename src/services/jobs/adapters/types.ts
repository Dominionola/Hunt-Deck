export interface RawIngestedJob {
  title: string;
  company: string;
  description: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  remoteType: "REMOTE_ONLY" | "HYBRID" | "ONSITE" | "ANY";
  atsPlatform: "GREENHOUSE" | "LEVER" | "ASHBY" | "WORKDAY" | "OTHER";
  applicationUrl: string;
  externalJobId?: string;
  postedAt?: Date;
  sourceUrl?: string;
}

export interface JobIngestionResult {
  source: string;
  totalFetched: number;
  deduplicatedCount: number;
  jobs: RawIngestedJob[];
  errors: string[];
}
