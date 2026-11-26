import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { roleSuggestionRequestSchema } from "@/lib/validations/roleCatalog";
import { readLimitedJson, RequestBodyLimitError } from "@/lib/http/readLimitedJson";
import { getRoleCatalog } from "@/services/matching/roleCatalog";
import { suggestRoles } from "@/services/matching/roleSuggestions";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  let body: unknown;
  try { body = await readLimitedJson(request); }
  catch (error) { return NextResponse.json({ error: error instanceof RequestBodyLimitError ? "Profile is too large." : "Invalid profile request." }, { status: error instanceof RequestBodyLimitError ? 413 : 400, headers }); }
  const parsed = roleSuggestionRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid reviewed profile." }, { status: 400, headers });
  try {
    const catalog = getRoleCatalog();
    return NextResponse.json({ success: true, version: catalog.snapshot.version, suggestions: suggestRoles(parsed.data.profile, catalog) }, { headers });
  } catch { return NextResponse.json({ error: "Role suggestions are temporarily unavailable." }, { status: 503, headers }); }
}
