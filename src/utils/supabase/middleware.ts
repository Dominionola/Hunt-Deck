import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Session refresh only: routes must still verify and authorize their own users.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const refreshHeaders = new Headers();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Keep public pages available when Supabase has not been configured.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        const previousCookies = response.cookies.getAll();
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        Object.entries(headers).forEach(([name, value]) => refreshHeaders.set(name, value));
        response = NextResponse.next({ request });
        refreshHeaders.forEach((value, name) => response.headers.set(name, value));
        previousCookies.forEach((cookie) => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims verifies the session and refreshes expired tokens when necessary.
  await supabase.auth.getClaims();
  return response;
}
