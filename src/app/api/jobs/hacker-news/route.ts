import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { hnHiringQuerySchema } from "@/lib/validations/hackerNews";
import { fetchHnWhoIsHiringJobs } from "@/services/jobs/adapters/hackerNewsHiringAdapter";
import { getOrSetCached } from "@/lib/cache";

const headers = { "Cache-Control": "no-store" };

/**
 * Authenticated endpoint to fetch live job postings from the official
 * Hacker News "Who is Hiring?" monthly threads with direct contacts.
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  }

  const { searchParams } = new URL(request.url);
  const parsed = hnHiringQuerySchema.safeParse({
    storyId: searchParams.get("storyId") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    remoteOnly: searchParams.get("remoteOnly") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters.", details: parsed.error.format() }, { status: 400, headers });
  }

  try {
    const { data: result, cached } = await getOrSetCached(
      "hacker-news-hiring",
      parsed.data,
      900,
      () =>
        fetchHnWhoIsHiringJobs({
          storyId: parsed.data.storyId,
          page: parsed.data.page,
          hitsPerPage: parsed.data.limit,
          remoteOnly: parsed.data.remoteOnly,
          search: parsed.data.search,
        })
    );

    return NextResponse.json({ ...result, cached }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Hacker News hiring feed.";
    return NextResponse.json({ error: message }, { status: 502, headers });
  }
}
