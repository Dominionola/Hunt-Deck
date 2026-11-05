import { z } from "zod";

export const createApplicationSchema = z.object({
  jobId: z.string().min(1),
  resumeId: z.string().min(1),
  tailoredResumeUrl: z.string().url().optional(),
  coverLetterText: z.string().optional(),
  status: z
    .enum(["SAVED", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"])
    .default("SAVED"),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(["SAVED", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"]),
  interviewNotes: z.string().optional(),
  followUpDate: z.coerce.date().optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStatusInput = z.infer<
  typeof updateApplicationStatusSchema
>;
