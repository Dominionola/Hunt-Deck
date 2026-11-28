import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCallbackSchema } from "@/lib/validations/auth";
import { createClient } from "@/utils/supabase/server";
import { syncSupabaseUser } from "@/services/db/userService";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = authCallbackSchema.safeParse({
    code: url.searchParams.get("code") ?? undefined,
    token_hash: url.searchParams.get("token_hash") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
  });

  if (parsed.success) {
    try {
      const supabase = createClient(await cookies());
      let sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;

      if (parsed.data.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.data.code);
        if (!error && data.session?.user) {
          sessionUser = data.session.user;
        }
      } else if (parsed.data.token_hash && parsed.data.type) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: parsed.data.token_hash,
          type: parsed.data.type,
        });
        if (!error && data.session?.user) {
          sessionUser = data.session.user;
        }
      }

      if (sessionUser) {
        let destination = "/onboarding";
        if (sessionUser.email) {
          try {
            const fullName =
              (sessionUser.user_metadata?.full_name as string | undefined) ||
              (sessionUser.user_metadata?.name as string | undefined);
            const dbUser = await syncSupabaseUser(sessionUser.id, sessionUser.email, fullName);
            const hasOnboarded = Boolean(dbUser?.profile?.targetTitles?.length);
            if (hasOnboarded) {
              destination = "/dashboard";
            }
          } catch {
            // Fall back safely to /onboarding if DB lookup is momentarily unavailable
          }
        }

        return NextResponse.redirect(new URL(destination, url.origin), {
          headers: { "Cache-Control": "no-store" },
        });
      }
    } catch {
      /* Never expose an authorization code or provider response. */
    }
  }

  return NextResponse.redirect(new URL("/login?confirmation=failed", url.origin), {
    headers: { "Cache-Control": "no-store" },
  });
}
