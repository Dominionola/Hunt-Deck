import { z } from "zod";
export const resumeJobIdSchema = z.string().regex(/^[a-f0-9]{64}$/);

// Redis stores opaque references only; filenames and document content stay out.
export const resumeJobDataSchema = z.object({
  userId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  storageKey: z.string().regex(/^resumes\/[a-zA-Z0-9_-]+\/[a-f0-9]{64}\.pdf$/),
}).strict().refine((data) => data.storageKey.startsWith(`resumes/${data.userId}/`));
