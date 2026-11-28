import { z } from "zod";

export const hnHiringQuerySchema = z.object({
  storyId: z.string().regex(/^\d+$/).optional(),
  page: z.coerce.number().int().min(0).max(50).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  remoteOnly: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
});

export type HnHiringQueryInput = z.infer<typeof hnHiringQuerySchema>;

export const hnSaveJobSchema = z.object({
  externalJobId: z.string().min(1).max(100),
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  location: z.string().max(300).optional(),
  description: z.string().min(10).max(50000),
  applicationUrl: z
    .string()
    .min(1)
    .max(2000)
    .refine((val) => {
      try {
        const parsed = new URL(val);
        return parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:";
      } catch {
        return false;
      }
    }, "Valid http, https, or mailto URL required."),
  remoteType: z.enum(["REMOTE_ONLY", "HYBRID", "ONSITE", "ANY"]).default("ANY"),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  directEmail: z.string().email().optional(),
});

export type HnSaveJobInput = z.infer<typeof hnSaveJobSchema>;
