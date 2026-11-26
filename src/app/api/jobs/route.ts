import { NextResponse } from "next/server";
import { getJobs } from "@/services/db/jobService";
import { jobQuerySchema } from "@/lib/validations/job";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { ingestionRequestSchema } from "@/lib/validations/jobIngestion";
import { enqueueJobIngestion } from "@/services/queue/jobIngestionQueue";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;

  // Never accept caller-supplied user identity from query parameters
  if (searchParams.has("userId")) {
    return NextResponse.json(
      { error: "Caller-supplied user identity is not permitted." },
      { status: 400 }
    );
  }

  const result = jobQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!result.success) {
    return NextResponse.json({ error: "Invalid job search parameters." }, { status: 400 });
  }

  try {
    // Authenticate user server-side from session cookies
    const user = await getAuthenticatedUser();
    const verifiedUserId = user?.id;

    const jobs = await getJobs(result.data, verifiedUserId);
    return NextResponse.json({ success: true, ...jobs }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Job listings are temporarily unavailable." }, { status: 503 });
  }
}

// Ingestion changes state and makes external requests; requires admin session
export async function POST(request?: Request) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin authorization required." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const headers = { "Cache-Control": "no-store" };
  if (!request) return NextResponse.json({ error: "Choose explicit job sources." }, { status: 400, headers });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  try {
    if (Number(request.headers.get("content-length")) > 8192) return NextResponse.json({ error: "Request too large." }, { status: 413, headers });
    const raw = await request.text();
    if (raw.length > 8192) return NextResponse.json({ error: "Request too large." }, { status: 413, headers });
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid job sources." }, { status: 400, headers }); }
    const parsed = ingestionRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Choose 1–5 valid Greenhouse or Lever board identifiers." }, { status: 400, headers });
    const job = await enqueueJobIngestion({ userId: user.id, sources: parsed.data.sources });
    return NextResponse.json({ jobId: job.id }, { status: 202, headers });
  } catch {
    return NextResponse.json({ error: "Job ingestion is temporarily unavailable." }, { status: 503, headers });
  }
}
