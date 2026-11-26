import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { fetchGithubBoardLeads } from "@/services/jobs/adapters/githubBoardDiscovery";

/** Admin-only discovery: board identifiers require separate review and ingestion. */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin authorization required." }, { status: 403, headers });
  try {
    const result = await fetchGithubBoardLeads();
    return NextResponse.json({ sources: result.sources.slice(0, 100), total: result.sources.length, skipped: result.skipped }, { headers });
  } catch { return NextResponse.json({ error: "GitHub source discovery is unavailable." }, { status: 503, headers }); }
}
