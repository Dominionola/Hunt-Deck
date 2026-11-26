import { z } from "zod";

export const freehireWorkModeSchema = z.enum(["ANY", "REMOTE_ONLY", "HYBRID", "ONSITE"]);
export type FreehireWorkMode = z.infer<typeof freehireWorkModeSchema>;

export const freehireSourceFilterSchema = z.enum([
  "ALL",
  "ATS_ONLY",
  "ASHBY",
  "GREENHOUSE",
  "LEVER",
  "WORKDAY",
]);
export type FreehireSourceFilter = z.infer<typeof freehireSourceFilterSchema>;

export const freehireImportRequestSchema = z
  .object({
    query: z.string().trim().min(2).max(160),
    workMode: freehireWorkModeSchema.default("ANY"),
    sourceFilter: freehireSourceFilterSchema.default("ALL"),
    limit: z.coerce.number().int().min(5).max(100).default(25),
  })
  .strict();

export type FreehireImportRequest = z.infer<typeof freehireImportRequestSchema>;

export const freehireIngestionJobSchema = z
  .object({
    userId: z.string().min(1).max(100),
    query: z.string().trim().min(2).max(160),
    workMode: freehireWorkModeSchema.default("ANY"),
    sourceFilter: freehireSourceFilterSchema.default("ALL"),
    limit: z.number().int().min(5).max(100).default(25),
  })
  .strict();

export type FreehireIngestionJob = z.infer<typeof freehireIngestionJobSchema>;

export const freehireLiveSearchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(160),
    workMode: freehireWorkModeSchema.default("ANY"),
    sourceFilter: freehireSourceFilterSchema.default("ALL"),
    limit: z.coerce.number().int().min(1).max(20).default(12),
    offset: z.coerce.number().int().min(0).max(500).default(0),
  })
  .strict();

export type FreehireLiveSearchQuery = z.infer<typeof freehireLiveSearchQuerySchema>;

export const freehireCompanySearchSchema = z
  .object({
    q: z.string().trim().min(1).max(120),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();

export const freehireSaveSlugSchema = z
  .object({
    publicSlug: z
      .string()
      .trim()
      .min(3)
      .max(220)
      .regex(/^[a-z0-9][a-z0-9_-]+$/i, "Invalid Freehire job slug."),
  })
  .strict();
