import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { profilePreferencesSchema } from "@/lib/validations/profile";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  }

  try {
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: {
        remotePreference: true,
        preferredLocations: true,
        targetTitles: true,
        minSalary: true,
      },
    });

    return NextResponse.json(
      {
        preferences: profile ?? {
          remotePreference: "ANY",
          preferredLocations: [],
          targetTitles: [],
          minSalary: null,
        },
      },
      { headers }
    );
  } catch {
    return NextResponse.json({ error: "Could not load preferences." }, { status: 503, headers });
  }
}

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400, headers });
  }

  const parsed = profilePreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid preferences payload.", details: parsed.error.flatten() },
      { status: 400, headers }
    );
  }

  try {
    const updated = await db.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        remotePreference: parsed.data.remotePreference,
        preferredLocations: parsed.data.preferredLocations,
        targetTitles: parsed.data.targetTitles,
        minSalary: parsed.data.minSalary,
      },
      update: {
        remotePreference: parsed.data.remotePreference,
        preferredLocations: parsed.data.preferredLocations,
        targetTitles: parsed.data.targetTitles,
        minSalary: parsed.data.minSalary,
      },
      select: {
        remotePreference: true,
        preferredLocations: true,
        targetTitles: true,
        minSalary: true,
      },
    });

    return NextResponse.json({ success: true, preferences: updated }, { headers });
  } catch {
    return NextResponse.json({ error: "Could not save preferences." }, { status: 503, headers });
  }
}
