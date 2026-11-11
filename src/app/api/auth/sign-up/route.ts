import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signUpSchema } from "@/lib/validations/auth";
import { createClient } from "@/utils/supabase/server";
import { syncSupabaseUser } from "@/services/db/userService";

export async function POST(request: Request) {
  // Prevent cross-site origin submissions
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid registration details.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { email, password, fullName } = parsed.data;

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Registration failed." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Sync into internal Prisma User table mapped to Supabase UUID
    await syncSupabaseUser(data.user.id, email, fullName);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Registration is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

