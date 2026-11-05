import { z } from "zod";

export const experienceItemSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
});

export const educationItemSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string().optional(),
  graduationYear: z.string().optional(),
});

export const projectItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()).default([]),
  url: z.string().url().optional().or(z.literal("")),
});

export const resumeParsedDataSchema = z.object({
  fullName: z.string(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).default([]),
  experience: z.array(experienceItemSchema).default([]),
  education: z.array(educationItemSchema).default([]),
  projects: z.array(projectItemSchema).default([]),
});

export const uploadResumeSchema = z.object({
  title: z.string().min(1).default("Master Resume"),
  originalFileUrl: z.string().url("Valid file URL is required"),
  extractedText: z.string().min(10, "Extracted text is required"),
  parsedData: resumeParsedDataSchema,
  atsScore: z.number().int().min(0).max(100).optional(),
});

export type ExperienceItem = z.infer<typeof experienceItemSchema>;
export type EducationItem = z.infer<typeof educationItemSchema>;
export type ProjectItem = z.infer<typeof projectItemSchema>;
export type ResumeParsedData = z.infer<typeof resumeParsedDataSchema>;
export type UploadResumeInput = z.infer<typeof uploadResumeSchema>;
