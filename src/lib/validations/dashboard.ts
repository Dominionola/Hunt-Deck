import { z } from "zod";

const count = z.number().int().nonnegative();
export const dashboardUserSchema = z.object({ name: z.string().nullable(), email: z.string().email(), role: z.enum(["USER", "ADMIN", "ENTERPRISE"]) });
export type DashboardUser = z.infer<typeof dashboardUserSchema>;
export const dashboardMetricsSchema = z.object({
  success: z.literal(true),
  pipeline: z.object({ total: count, saved: count, applied: count, interviewing: count, offers: count, rejected: count }),
  velocity: z.object({ applicationsThisWeek: count,
    weeks: z.array(z.object({ start: z.string().datetime(), count })).length(6) }),
  recentApplications: z.array(z.object({ id: z.string(), title: z.string(), company: z.string(),
    status: z.enum(["SAVED", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"]),
    updatedAt: z.string().datetime(), followUpDate: z.string().datetime().nullable() })).max(5),
  primaryResume: z.object({ id: z.string(), title: z.string(), lastUpdated: z.string().datetime() }).nullable(),
  targetTitles: z.array(z.string()),
});
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;
