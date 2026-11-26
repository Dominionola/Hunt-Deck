import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import {
  CURATED_FUNDED_STARTUPS,
  discoverStartupAts,
  publicBoardUrl,
  startupProbeInputSchema,
} from "@/services/jobs/adapters/startupBoardDiscovery";

const headers = { "Cache-Control": "no-store" };

/** Admin-only curated funded startup directory. */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin authorization required." }, { status: 403, headers });
  }

  return NextResponse.json(
    {
      startups: CURATED_FUNDED_STARTUPS.map((item) => ({
        ...item,
        boardUrl: publicBoardUrl(item),
      })),
    },
    { headers }
  );
}

/** Admin-only ATS auto-probe for any startup company slug. */
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
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400, headers });
  }

  const parsed = startupProbeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid lowercase company slug (letters, numbers, hyphens)." },
      { status: 400, headers }
    );
  }

  try {
    const result = await discoverStartupAts(parsed.data.slug);
    return NextResponse.json(result, { headers });
  } catch {
    return NextResponse.json({ error: "Startup ATS discovery is temporarily unavailable." }, { status: 503, headers });
  }
}
