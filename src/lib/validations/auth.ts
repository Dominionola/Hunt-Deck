import { z } from "zod";

export const authCallbackSchema = z.object({
  code: z.string().min(1).max(4096).optional(),
  token_hash: z.string().min(1).max(4096).optional(),
  type: z.enum(["signup", "email", "recovery", "invite", "magiclink", "email_change"]).optional(),
}).refine(
  (val) => Boolean(val.code) || (Boolean(val.token_hash) && Boolean(val.type)),
  "Confirmation code or token hash is required."
);

export const resendConfirmationSchema = z.object({
  email: z.string().email("Please enter a valid email address.").max(254),
}).strict();
export type ResendConfirmationInput = z.infer<typeof resendConfirmationSchema>;

export const signInSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(1024),
}).strict();
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(1024),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(120).optional(),
}).strict();
export type SignUpInput = z.infer<typeof signUpSchema>;

// Profile fields accepted by the existing profile service.
export const updateProfileSchema = z.object({
  headline: z.string().optional(),
  targetTitles: z.array(z.string()).optional(),
  minSalary: z.number().int().nonnegative().optional(),
  maxSalary: z.number().int().nonnegative().optional(),
  preferredLocations: z.array(z.string()).optional(),
  remotePreference: z.enum(["REMOTE_ONLY", "HYBRID", "ONSITE", "ANY"]).optional(),
  experienceYears: z.number().int().nonnegative().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
