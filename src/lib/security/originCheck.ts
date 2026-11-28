import { NextResponse } from "next/server";

const ALLOWED_FETCH_SITES = new Set(["same-origin", "same-site", "none"]);

/**
 * Enforces browser same-origin policy on cookie-authenticated mutations.
 * Blocks cross-site requests carrying a mismatched Origin or cross-site Sec-Fetch-Site.
 */
export function verifySameOrigin(request?: Request): NextResponse | null {
  if (!request) return null;

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && !ALLOWED_FETCH_SITES.has(secFetchSite.toLowerCase())) {
    return NextResponse.json(
      { error: "Cross-site requests are not permitted." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  return null;
}
