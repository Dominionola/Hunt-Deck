import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { approveSource, disableSource, listApprovedSources, sourceApprovalSchema, sourceDisableSchema } from "@/services/jobs/approvedSources";

const headers = { "Cache-Control": "no-store" };
async function admin() { const user = await getAuthenticatedUser(); return user?.role === "ADMIN" ? user : null; }
export async function GET() {
  if (!await admin()) return NextResponse.json({ error: "Admin authorization required." }, { status: 403, headers });
  if (process.env.JOB_SOURCE_SCHEDULER_ENABLED !== "1") return NextResponse.json({ error: "Source scheduling is not enabled." }, { status: 503, headers });
  try { return NextResponse.json({ schedules: await listApprovedSources() }, { headers }); }
  catch { return NextResponse.json({ error: "Source schedules unavailable." }, { status: 503, headers }); }
}
async function mutate(request: Request, action: "approve" | "disable") {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "Admin authorization required." }, { status: 403, headers });
  if (process.env.JOB_SOURCE_SCHEDULER_ENABLED !== "1") return NextResponse.json({ error: "Source scheduling is not enabled." }, { status: 503, headers });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  if (Number(request.headers.get("content-length")) > 2048) return NextResponse.json({ error: "Request too large." }, { status: 413, headers });
  try {
    const body = await request.text();
    if (body.length > 2048) return NextResponse.json({ error: "Request too large." }, { status: 413, headers });
    let raw: unknown; try { raw = JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid source schedule." }, { status: 400, headers }); }
    if (action === "approve") {
      const parsed = sourceApprovalSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: "Review the source and its terms before scheduling." }, { status: 400, headers });
      return NextResponse.json(await approveSource(user.id, parsed.data), { headers });
    }
    const parsed = sourceDisableSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Invalid source schedule." }, { status: 400, headers });
    const updated = await disableSource(user.id, parsed.data);
    return updated ? NextResponse.json({ disabled: true }, { headers }) : NextResponse.json({ error: "Schedule not found." }, { status: 404, headers });
  } catch { return NextResponse.json({ error: "Source scheduling unavailable." }, { status: 503, headers }); }
}
export async function POST(request: Request) { return mutate(request, "approve"); }
export async function DELETE(request: Request) { return mutate(request, "disable"); }
