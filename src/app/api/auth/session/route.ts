import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers });
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          authSubject: user.authSubject,
          email: user.email,
          name: user.name,
          role: user.role,
          profile: user.profile,
        },
      },
      { headers }
    );
  } catch {
    return NextResponse.json(
      { error: "Authentication is temporarily unavailable." },
      { status: 503, headers }
    );
  }
}
