import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { hnSaveJobSchema } from "@/lib/validations/hackerNews";
import { persistIngestedJob } from "@/services/jobs/persistJob";

const headers = { "Cache-Control": "no-store" };

/**
 * Saves and embeds an unadvertised Hacker News hiring post into the candidate's database opportunities.
 */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400, headers });
  }

  const parsed = hnSaveJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid job payload.", details: parsed.error.format() }, { status: 400, headers });
  }

  try {
    const persisted = await persistIngestedJob({
      company: parsed.data.company,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      salaryMin: parsed.data.salaryMin,
      salaryMax: parsed.data.salaryMax,
      remoteType: parsed.data.remoteType,
      atsPlatform: "OTHER",
      applicationUrl: parsed.data.applicationUrl,
      externalJobId: parsed.data.externalJobId,
      postedAt: new Date(),
    });

    return NextResponse.json({ success: true, jobId: persisted.id, embedded: persisted.embedded }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to persist Hacker News job posting.";
    return NextResponse.json({ error: message }, { status: 500, headers });
  }
}
