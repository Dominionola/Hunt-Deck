import { z } from "zod";

const csvTagSchema = z.preprocess((raw) => {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const items = Array.isArray(raw) ? raw : String(raw).split(",");
  const cleaned = [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
  return cleaned.length > 0 ? cleaned : undefined;
}, z.array(z.string().max(120)).max(10).optional());

export const regionScopeSchema = z.enum(["ANY", "WORLDWIDE", "US", "EMEA"]);
export type RegionScope = z.infer<typeof regionScopeSchema>;

export const jobQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  titles: csvTagSchema,
  stack: csvTagSchema,
  regionScope: regionScopeSchema.optional(),
  remoteType: z.enum(["REMOTE_ONLY", "HYBRID", "ONSITE", "ANY"]).optional(),
  minSalary: z.coerce.number().int().positive().optional(),
  platform: z.enum(["GREENHOUSE", "LEVER", "ASHBY", "WORKDAY", "OTHER"]).optional(),
  location: z.string().trim().max(120).optional(),
  minFitScore: z.coerce.number().min(0).max(100).optional(),
  minSimilarity: z.coerce.number().min(-100).max(100).optional(),
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
