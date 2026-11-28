import { z } from "zod";

export const remoteFeedProviderSchema = z.enum(["himalayas", "jobicy"]);
export type RemoteFeedProvider = z.infer<typeof remoteFeedProviderSchema>;

export const remoteFeedQuerySchema = z.object({
  provider: remoteFeedProviderSchema.default("himalayas"),
  q: z.string().trim().max(120).optional(),
  geo: z.string().trim().max(80).optional(),
  cursor: z.string().trim().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type RemoteFeedQueryInput = z.infer<typeof remoteFeedQuerySchema>;

export const remoteFeedSaveSchema = z
  .object({
    provider: remoteFeedProviderSchema,
    externalJobId: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    title: z.string().min(1).max(300),
    description: z.string().min(20).max(50000),
    location: z.string().max(500).optional(),
    salaryMin: z.number().int().nonnegative().optional(),
    salaryMax: z.number().int().nonnegative().optional(),
    remoteType: z.enum(["REMOTE_ONLY", "HYBRID", "ONSITE", "ANY"]).default("REMOTE_ONLY"),
    atsPlatform: z.enum(["GREENHOUSE", "LEVER", "ASHBY", "WORKDAY", "OTHER"]).default("OTHER"),
    applicationUrl: z
      .string()
      .url()
      .refine((url) => new URL(url).protocol === "https:", "HTTPS application URL required."),
    postedAt: z.string().datetime().optional(),
  })
  .strict();

export type RemoteFeedSaveInput = z.infer<typeof remoteFeedSaveSchema>;
