import { z } from "zod";
import { ingestionSourceSchema, type IngestionSource } from "@/lib/validations/jobIngestion";

// Reviewed MIT-licensed compilation: copyright 2026 Keugene Lee. Job content
// belongs to employers. We use only provider and board IDs as discovery leads.
export const GITHUB_SOURCE = "https://raw.githubusercontent.com/Keugene11/Summer-2027-Tech-Internships/main/.github/scripts/listings.json";
const entrySchema = z.object({ active: z.literal(true), is_visible: z.literal(true), url: z.string().url(),
  source: z.object({ ats: z.enum(["greenhouse", "lever"]), board: z.string(), job_id: z.union([z.string(), z.number()]) }) });

/** Extract fixed-host employer board identifiers; a lead is not a verified job. */
export function discoverBoards(data: unknown): { sources: IngestionSource[]; skipped: number } {
  const entries = z.array(z.unknown()).max(20000).parse(data);
  const found = new Map<string, IngestionSource>(); let skipped = 0;
  for (const entry of entries) {
    const parsed = entrySchema.safeParse(entry);
    if (!parsed.success) { skipped++; continue; }
    const { source, url } = parsed.data;
    const candidate = ingestionSourceSchema.safeParse({ platform: source.ats.toUpperCase(), board: source.board });
    if (!candidate.success) { skipped++; continue; }
    const address = new URL(url); const parts = address.pathname.split("/").filter(Boolean);
    const hosts = source.ats === "greenhouse" ? ["boards.greenhouse.io", "job-boards.greenhouse.io"] : ["jobs.lever.co"];
    const jobId = String(source.job_id);
    if (address.protocol !== "https:" || address.username || address.password || address.port || !hosts.includes(address.hostname) ||
        parts[0]?.toLowerCase() !== candidate.data.board || (source.ats === "greenhouse" ? parts[1] !== "jobs" || parts[2] !== jobId : parts[1] !== jobId)) { skipped++; continue; }
    found.set(`${candidate.data.platform}:${candidate.data.board}`, candidate.data);
  }
  return { sources: [...found.values()].sort((a, b) => `${a.platform}:${a.board}`.localeCompare(`${b.platform}:${b.board}`)), skipped };
}

export async function fetchGithubBoardLeads(fetcher = fetch) {
  const response = await fetcher(GITHUB_SOURCE, { redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.body) throw new Error("GitHub job source unavailable.");
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let body = ""; let size = 0;
  while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength;
    if (size > 4 * 1024 * 1024) { await reader.cancel(); throw new Error("GitHub job source exceeds limit."); }
    body += decoder.decode(value, { stream: true }); }
  body += decoder.decode();
  try { return discoverBoards(JSON.parse(body)); } catch { throw new Error("GitHub job source has an invalid format."); }
}
