import { z } from "zod";

export const skillCategorySchema = z.enum([
  "Languages",
  "Frameworks",
  "Cloud",
  "Methodologies",
  "Domains",
]);

export type SkillCategory = z.infer<typeof skillCategorySchema>;

export const skillItemSchema = z.object({
  name: z.string().trim().min(1, "Skill name cannot be empty"),
  category: skillCategorySchema,
  isVerified: z.boolean().default(true),
});

export type SkillItem = z.infer<typeof skillItemSchema>;

export const step1ImportSchema = z.object({
  resumeFileId: z
    .string()
    .trim()
    .min(1, "A valid uploaded resume file ID or scratch identifier is required"),
  fileName: z.string().optional(),
  fileSizeBytes: z.number().int().nonnegative().optional(),
  linkedinUrl: z
    .string()
    .trim()
    .regex(
      /^(https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?)?$/,
      "Must be a valid LinkedIn profile URL (e.g. https://linkedin.com/in/username)"
    )
    .optional()
    .or(z.literal("")),
  isScratchMode: z.boolean().default(false),
});

export type Step1ImportInput = z.infer<typeof step1ImportSchema>;

export const step2SkillsSchema = z.object({
  skills: z
    .array(skillItemSchema)
    .min(3, "At least 3 verified skills are required to calculate job fit"),
  atsReadabilityScore: z.number().int().min(0).max(100).default(88),
});

export type Step2SkillsInput = z.infer<typeof step2SkillsSchema>;

export const workArrangementSchema = z.enum(["REMOTE", "HYBRID", "ONSITE"]);
export type WorkArrangement = z.infer<typeof workArrangementSchema>;

export const seniorityLevelSchema = z.enum([
  "ENTRY",
  "MID",
  "SENIOR",
  "LEAD",
  "EXECUTIVE",
]);
export type SeniorityLevel = z.infer<typeof seniorityLevelSchema>;

export const step3TargetsSchema = z.object({
  targetTitles: z
    .array(z.string().trim().min(2, "Title must be at least 2 characters"))
    .min(1, "Select or enter at least one target job title"),
  workArrangement: workArrangementSchema,
  preferredLocations: z.array(z.string().trim()).default([]),
  seniorityLevel: seniorityLevelSchema,
  minSalary: z
    .number()
    .int()
    .min(0, "Minimum salary cannot be negative")
    .default(140000),
});

export type Step3TargetsInput = z.infer<typeof step3TargetsSchema>;

export const topMatchCardSchema = z.object({
  id: z.string().min(1),
  companyName: z.string().min(1),
  companyLogoUrl: z.string().optional(),
  roleTitle: z.string().min(1),
  fitScore: z.number().int().min(0).max(100),
  location: z.string().default("Remote US"),
  compensationRange: z.string().default("$150,000 – $180,000"),
  atsSource: z.string().default("Direct ATS"),
  verifiedSkillsMetCount: z.number().int().min(0),
  totalSkillsRequiredCount: z.number().int().min(1),
  matchedSkillsSample: z.array(z.string()).default([]),
  applicationUrl: z.string().url().optional(),
});

export type TopMatchCard = z.infer<typeof topMatchCardSchema>;

export const step4RevealSchema = z.object({
  matches: z.array(topMatchCardSchema).min(1, "At least one match preview required"),
});

export type Step4RevealInput = z.infer<typeof step4RevealSchema>;

export const completeOnboardingSchema = z.object({
  importData: step1ImportSchema,
  skillsData: step2SkillsSchema,
  targetsData: step3TargetsSchema,
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
