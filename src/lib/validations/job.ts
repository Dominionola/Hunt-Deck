import { z } from "zod";

export const jobQuerySchema = z.object({
  search: z.string().optional(),
  remoteType: z.enum(["REMOTE_ONLY", "HYBRID", "ONSITE", "ANY"]).optional(),
  minSalary: z.coerce.number().int().positive().optional(),
  platform: z.enum(["GREENHOUSE", "LEVER", "ASHBY", "WORKDAY", "OTHER"]).optional(),
  location: z.string().optional(),
  minFitScore: z.coerce.number().min(0).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createJobPostingSchema = z.object({
  title: z.string().min(2),
  company: z.string().min(1),
  description: z.string().min(20),
  location: z.string().optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  remoteType: z.enum(["REMOTE_ONLY", "HYBRID", "ONSITE", "ANY"]).default("ANY"),
  atsPlatform: z.enum(["GREENHOUSE", "LEVER", "ASHBY", "WORKDAY", "OTHER"]).default("OTHER"),
  applicationUrl: z.string().url(),
  externalJobId: z.string().optional(),
});

export type JobQueryInput = z.infer<typeof jobQuerySchema>;
export type CreateJobPostingInput = z.infer<typeof createJobPostingSchema>;
