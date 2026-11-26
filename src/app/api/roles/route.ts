import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { roleSearchQuerySchema } from "@/lib/validations/roleCatalog";
import { getRoleCatalog } from "@/services/matching/roleCatalog";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  const query = roleSearchQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return NextResponse.json({ error: "Invalid role search." }, { status: 400, headers });
  try {
    const catalog = getRoleCatalog();
    return NextResponse.json({ success: true, version: catalog.snapshot.version, ...catalog.search(query.data.q, query.data.limit) }, { headers });
  } catch { return NextResponse.json({ error: "Role search is temporarily unavailable." }, { status: 503, headers }); }
}
