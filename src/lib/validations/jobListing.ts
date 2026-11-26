import { z } from "zod";
export const jobListingSchema = z.object({
  id: z.string(), title: z.string(), company: z.string(), location: z.string().nullable().optional(),
  remoteType: z.enum(["REMOTE_ONLY", "HYBRID", "ONSITE", "ANY"]),
  atsPlatform: z.enum(["GREENHOUSE", "LEVER", "ASHBY", "WORKDAY", "OTHER"]),
  applicationUrl: z.string().url().refine((url) => ["http:", "https:"].includes(new URL(url).protocol)),
  postedAt: z.string().datetime(), salaryMin: z.number().nullable().optional(), salaryMax: z.number().nullable().optional(),
  semanticSimilarity: z.number().finite().min(-100).max(100).optional(),
  matchesTargetRole: z.boolean().optional(),
  techStack: z.array(z.string()).max(10).optional(),
});
export const jobListingResponseSchema = z.object({ success: z.literal(true), items: z.array(jobListingSchema).max(50),
  personalization: z.enum(["ready", "no_resume", "incompatible_resume"]).optional(),
  pagination: z.object({ page: z.number().int().positive(), limit: z.number().int().positive(), total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative() }),
});
export type JobListing = z.infer<typeof jobListingSchema>;
