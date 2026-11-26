import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import {
  freehireCompanySearchSchema,
  freehireImportRequestSchema,
} from "@/lib/validations/freehire";
import { enqueueFreehireIngestion } from "@/services/queue/jobIngestionQueue";
import { searchFreehireCompanies } from "@/services/jobs/adapters/freehireAdapter";

const headers = { "Cache-Control": "no-store" };

/** Admin-only Freehire company search for board discovery. */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin authorization required." }, { status: 403, headers });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = freehireCompanySearchSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid company search term." }, { status: 400, headers });
  }

  try {
    const companies = await searchFreehireCompanies(parsed.data.q, parsed.data.limit);
    return NextResponse.json({ companies }, { headers });
  } catch {
    return NextResponse.json({ error: "Freehire company search unavailable." }, { status: 503, headers });
  }
}

/** Admin-only Freehire batch job ingestion enqueue. */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin authorization required." }, { status: 403, headers });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 8192) {
      return NextResponse.json({ error: "Request too large." }, { status: 413, headers });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400, headers });
  }

  const parsed = freehireImportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid Freehire search query (2-160 characters) and filter options." },
      { status: 400, headers }
    );
  }

  try {
    const job = await enqueueFreehireIngestion({
      userId: user.id,
      ...parsed.data,
    });
    return NextResponse.json({ jobId: job.id }, { status: 202, headers });
  } catch {
    return NextResponse.json({ error: "Freehire job ingestion is temporarily unavailable." }, { status: 503, headers });
  }
}
