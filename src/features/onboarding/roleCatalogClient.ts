import type { ResumeParsedData } from "@/lib/validations/resume";
import { roleProfileSchema, roleSearchResponseSchema, roleSuggestionResponseSchema, type RoleProfile } from "@/lib/validations/roleCatalog";

/** Send only reviewed occupational facts to our own server, never contact fields. */
export function reviewedRoleProfile(resume: ResumeParsedData | undefined, skills: string[]): RoleProfile {
  return roleProfileSchema.parse({ skills,
    experience: resume?.experience.map(({ title, bullets }) => ({ title, bullets })) ?? [],
    education: resume?.education.map(({ degree, fieldOfStudy }) => ({ degree, ...(fieldOfStudy ? { fieldOfStudy } : {}) })) ?? [],
    projects: resume?.projects.map(({ name, description }) => ({ name, description })) ?? [] });
}
const timeoutSignal = (signal?: AbortSignal) => signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
export async function loadRoleSuggestions(profile: RoleProfile, signal?: AbortSignal) {
  const response = await fetch("/api/roles/suggestions", { method: "POST", cache: "no-store", signal: timeoutSignal(signal),
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile }) });
  if (!response.ok) throw new Error(response.status === 401 ? "Sign in again to load role suggestions." : "Role suggestions could not be loaded. You can retry or add your own roles.");
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error("Role suggestions could not be loaded. Please retry."); }
  const result = roleSuggestionResponseSchema.safeParse(body);
  if (!result.success) throw new Error("Role suggestions could not be loaded. Please retry.");
  return result.data;
}
export async function searchRoleCatalog(query: string, signal?: AbortSignal) {
  const response = await fetch(`/api/roles?q=${encodeURIComponent(query.trim())}&limit=8`, { cache: "no-store", signal: timeoutSignal(signal) });
  if (!response.ok) throw new Error("Role search could not be loaded. You can retry or use a custom title.");
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error("Role search could not be loaded. Please retry."); }
  const result = roleSearchResponseSchema.safeParse(body);
  if (!result.success) throw new Error("Role search could not be loaded. Please retry.");
  return result.data;
}
