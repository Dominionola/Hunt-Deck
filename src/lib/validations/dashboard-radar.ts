import { z } from "zod";

// Only consume public listing fields. Match scores require an authenticated user.
const publicJobSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().nullable().optional(),
  remoteType: z.enum(["REMOTE_ONLY", "HYBRID", "ONSITE", "ANY"]),
  postedAt: z.iso.datetime({ offset: true }),
  applicationUrl: z.url().refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  }),
});

export const radarResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(publicJobSchema).max(3),
});

export type RadarJob = z.infer<typeof publicJobSchema>;
