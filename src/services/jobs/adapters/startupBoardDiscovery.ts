import { z } from "zod";
import { ingestionSourceSchema, type IngestionSource } from "@/lib/validations/jobIngestion";

export type StartupStage = "Seed / YC" | "Series A" | "Series B" | "Series C+" | "Growth";

export type CuratedStartupLead = IngestionSource & {
  companyName: string;
  stage: StartupStage;
  focus: string;
};

/**
 * Curated catalog of high-growth, VC-backed startups and modern tech companies
 * verified against public Ashby, Greenhouse, and Lever APIs.
 */
export const CURATED_FUNDED_STARTUPS: readonly CuratedStartupLead[] = [
  { companyName: "Linear", platform: "ASHBY", board: "linear", stage: "Series B", focus: "Developer Tools & Product" },
  { companyName: "Cursor (Anysphere)", platform: "ASHBY", board: "cursor", stage: "Series B", focus: "AI Code Editor" },
  { companyName: "PostHog", platform: "ASHBY", board: "posthog", stage: "Series B", focus: "Open-Source Product Analytics (YC)" },
  { companyName: "Supabase", platform: "ASHBY", board: "supabase", stage: "Series C+", focus: "Postgres & Backend Platform (YC)" },
  { companyName: "Resend", platform: "ASHBY", board: "resend", stage: "Seed / YC", focus: "Developer Email API (YC)" },
  { companyName: "Clerk", platform: "ASHBY", board: "clerk", stage: "Series B", focus: "Authentication & User Management" },
  { companyName: "Modal", platform: "ASHBY", board: "modal", stage: "Series A", focus: "Serverless AI Cloud Infrastructure" },
  { companyName: "LangChain", platform: "ASHBY", board: "langchain", stage: "Series A", focus: "AI Agent & LLM Framework" },
  { companyName: "ElevenLabs", platform: "ASHBY", board: "elevenlabs", stage: "Series C+", focus: "Voice AI & Audio Synthesis" },
  { companyName: "Perplexity", platform: "ASHBY", board: "perplexity", stage: "Series C+", focus: "AI Answer Engine" },
  { companyName: "Replit", platform: "ASHBY", board: "replit", stage: "Series B", focus: "AI Software Creation Platform" },
  { companyName: "Ramp", platform: "ASHBY", board: "ramp", stage: "Series C+", focus: "Fintech & Spend Management" },
  { companyName: "Vanta", platform: "ASHBY", board: "vanta", stage: "Series C+", focus: "Security & Compliance (YC)" },
  { companyName: "Harvey", platform: "ASHBY", board: "harvey", stage: "Series C+", focus: "Legal AI" },
  { companyName: "Synthesia", platform: "ASHBY", board: "synthesia", stage: "Series C+", focus: "AI Video Generation" },
  { companyName: "Vercel", platform: "GREENHOUSE", board: "vercel", stage: "Series C+", focus: "Frontend Cloud & Next.js" },
  { companyName: "Anthropic", platform: "GREENHOUSE", board: "anthropic", stage: "Growth", focus: "Frontier AI Research & Safety" },
  { companyName: "Mercury", platform: "GREENHOUSE", board: "mercury", stage: "Series B", focus: "Startup Banking & Fintech" },
  { companyName: "Moniepoint", platform: "GREENHOUSE", board: "moniepoint", stage: "Series C+", focus: "African Fintech & Payments" },
  { companyName: "Scale AI", platform: "GREENHOUSE", board: "scaleai", stage: "Growth", focus: "AI Data & Evaluation" },
  { companyName: "Figma", platform: "GREENHOUSE", board: "figma", stage: "Growth", focus: "Collaborative Design" },
  { companyName: "Brex", platform: "GREENHOUSE", board: "brex", stage: "Growth", focus: "Corporate Spend & Fintech (YC)" },
  { companyName: "Stripe", platform: "GREENHOUSE", board: "stripe", stage: "Growth", focus: "Global Payments Infrastructure (YC)" },
  { companyName: "Cloudflare", platform: "GREENHOUSE", board: "cloudflare", stage: "Growth", focus: "Edge Network & Workers" },
];

export const startupProbeInputSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/),
}).strict();

export type StartupProbeResult = {
  found: boolean;
  matches: Array<IngestionSource & { jobCount: number; boardUrl: string }>;
};

export function publicBoardUrl(source: IngestionSource): string {
  const board = encodeURIComponent(source.board);
  if (source.platform === "ASHBY") return `https://jobs.ashbyhq.com/${board}`;
  if (source.platform === "GREENHOUSE") return `https://job-boards.greenhouse.io/${board}`;
  return `https://jobs.lever.co/${board}`;
}

/**
 * Probes public ATS endpoints (Ashby, Greenhouse, Lever) for a company slug
 * to automatically identify which ATS hosts its open roles.
 */
export async function discoverStartupAts(
  rawSlug: string,
  fetcher: typeof fetch = fetch
): Promise<StartupProbeResult> {
  const { slug } = startupProbeInputSchema.parse({ slug: rawSlug });
  const candidates: Array<{ platform: IngestionSource["platform"]; url: string }> = [
    { platform: "ASHBY", url: `https://api.ashbyhq.com/posting-api/job-board/${slug}` },
    { platform: "GREENHOUSE", url: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs` },
    { platform: "LEVER", url: `https://api.lever.co/v0/postings/${slug}?mode=json&limit=20` },
  ];

  const checks = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        const parsedSource = ingestionSourceSchema.parse({ platform: candidate.platform, board: slug });
        const response = await fetcher(candidate.url, {
          headers: { Accept: "application/json" },
          redirect: "error",
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return null;
        const data: unknown = await response.json();
        const jobCount = Array.isArray(data)
          ? data.length
          : typeof data === "object" && data !== null && "jobs" in data && Array.isArray((data as { jobs: unknown[] }).jobs)
            ? (data as { jobs: unknown[] }).jobs.length
            : 0;
        if (jobCount <= 0) return null;
        return {
          ...parsedSource,
          jobCount,
          boardUrl: publicBoardUrl(parsedSource),
        };
      } catch {
        return null;
      }
    })
  );

  const matches = checks.filter((item): item is NonNullable<typeof item> => item !== null);
  return { found: matches.length > 0, matches };
}
