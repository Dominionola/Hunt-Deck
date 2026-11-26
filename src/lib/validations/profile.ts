import { z } from "zod";

const trimmedTag = z.string().trim().min(1).max(120);

export const profilePreferencesSchema = z
  .object({
    remotePreference: z.enum(["REMOTE_ONLY", "HYBRID", "ONSITE", "ANY"]),
    preferredLocations: z
      .array(trimmedTag)
      .max(10)
      .transform((items) => [...new Set(items)]),
    targetTitles: z
      .array(trimmedTag)
      .max(10)
      .transform((items) => [...new Set(items)]),
    minSalary: z.number().int().min(0).max(2_000_000).nullable(),
  })
  .strict();

export type ProfilePreferencesInput = z.infer<typeof profilePreferencesSchema>;
