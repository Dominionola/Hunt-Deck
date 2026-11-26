import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCallbackSchema } from "@/lib/validations/auth";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = authCallbackSchema.safeParse({ code: url.searchParams.get("code") });
  if (parsed.success) {
    try {
      const supabase = createClient(await cookies());
      const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.data.code);
      if (!error && data.session) return NextResponse.redirect(new URL("/onboarding", url.origin),
        { headers: { "Cache-Control": "no-store" } });
    } catch { /* Never expose an authorization code or provider response. */ }
  }
  return NextResponse.redirect(new URL("/login?confirmation=failed", url.origin),
    { headers: { "Cache-Control": "no-store" } });
}
