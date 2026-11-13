import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { completeOnboardingSchema } from "@/lib/validations/onboarding";
import { upsertUserProfile } from "@/services/db/userService";
import { db } from "@/lib/db";
import { RemotePreference } from "@prisma/client";

export async function POST(request: Request) {
  // Prevent cross-origin submissions
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = completeOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid onboarding payload", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { importData, skillsData, targetsData } = parsed.data;

  try {
    // Map remote preference enum
    let remotePref: RemotePreference = RemotePreference.ANY;
    if (targetsData.workArrangement === "REMOTE") {
      remotePref = RemotePreference.REMOTE_ONLY;
    } else if (targetsData.workArrangement === "HYBRID") {
      remotePref = RemotePreference.HYBRID;
    } else if (targetsData.workArrangement === "ONSITE") {
      remotePref = RemotePreference.ONSITE;
    }

    // 1. Upsert Profile
    await upsertUserProfile(user.id, {
      headline: targetsData.targetTitles[0] || "Software Engineer",
      targetTitles: targetsData.targetTitles,
      minSalary: targetsData.minSalary,
      maxSalary: targetsData.minSalary ? Math.round(targetsData.minSalary * 1.3) : undefined,
      preferredLocations: targetsData.preferredLocations,
      remotePreference: remotePref,
      experienceYears: targetsData.seniorityLevel === "ENTRY" ? 1 : targetsData.seniorityLevel === "MID" ? 3 : 5,
    });

    // 2. Ensure Primary Resume exists
    if (!user.resumes || user.resumes.length === 0) {
      await db.resume.create({
        data: {
          userId: user.id,
          title: importData.fileName || "Master Profile",
          originalFileUrl: importData.resumeFileId ? `/uploads/${importData.resumeFileId}` : "scratch",
          extractedText: `Imported via Onboarding: ${targetsData.targetTitles.join(", ")}`,
          parsedData: {
            skills: skillsData.skills.map((s) => s.name),
            targets: targetsData.targetTitles,
            minSalary: targetsData.minSalary,
          },
          atsScore: skillsData.atsReadabilityScore || 88,
          isPrimary: true,
        },
      });
    }

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to persist onboarding profile." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
