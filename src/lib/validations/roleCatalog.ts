import { z } from "zod";

const id = z.string().regex(/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);
export const occupationSchema = z.object({ id, title: z.string().min(1).max(500), aliases: z.array(z.string()).max(500),
  isco: z.string(), description: z.string().max(50000), essential: z.array(id).max(500), optional: z.array(id).max(1000), broader: z.array(id).max(30) });
export const roleCatalogSchema = z.object({ source: z.literal("ESCO"), version: z.literal("v1.2.1"), language: z.literal("en"),
  occupations: z.array(occupationSchema).min(3000).max(10000), skills: z.array(z.object({ id, label: z.string().min(1).max(500) })).min(1000).max(30000) });
export type RoleOccupation = z.infer<typeof occupationSchema>;
export type RoleCatalogData = z.infer<typeof roleCatalogSchema>;

export const roleProfileSchema = z.object({
  skills: z.array(z.string().trim().min(1).max(200)).max(200),
  experience: z.array(z.object({ title: z.string().max(200), bullets: z.array(z.string().max(2000)).max(40) })).max(30),
  education: z.array(z.object({ degree: z.string().max(300), fieldOfStudy: z.string().max(300).optional() })).max(20),
  projects: z.array(z.object({ name: z.string().max(300), description: z.string().max(4000) })).max(30),
});
export type RoleProfile = z.infer<typeof roleProfileSchema>;
export const roleSuggestionRequestSchema = z.object({ profile: roleProfileSchema }).strict();
export const roleSearchQuerySchema = z.object({ q: z.string().trim().max(120).default(""), limit: z.coerce.number().int().min(1).max(12).default(8) }).strict();
export const roleSuggestionSchema = z.object({ title: z.string().min(1).max(120), kind: z.enum(["aligned", "transferable"]),
  reason: z.string(), occupationId: id.optional(), missingSkills: z.array(z.string()).max(3).optional() });
export type RoleSuggestion = z.infer<typeof roleSuggestionSchema>;
export const roleSearchItemSchema = z.object({ id, title: z.string(), matchedAlias: z.string().optional(), isco: z.string() });
export type RoleSearchItem = z.infer<typeof roleSearchItemSchema>;
export const roleSearchResponseSchema = z.object({ success: z.literal(true), version: z.string(), total: z.number().int().nonnegative(),
  items: z.array(roleSearchItemSchema).max(12) });
export const roleSuggestionResponseSchema = z.object({ success: z.literal(true), version: z.string(),
  suggestions: z.array(roleSuggestionSchema).max(40) });
