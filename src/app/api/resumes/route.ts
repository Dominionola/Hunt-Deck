import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { getPrimaryResume, getUserResumes, updateResumeParsedData } from "@/services/db/resumeService";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    let resume = await getPrimaryResume(user.id);
    if (!resume) {
      const all = await getUserResumes(user.id);
      resume = all[0] || null;
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json(
      {
        success: true,
        resume: resume
          ? {
              id: resume.id,
              title: resume.title,
              atsScore: resume.atsScore,
              parsedData: resume.parsedData,
              originalFileUrl: resume.originalFileUrl,
              isPrimary: resume.isPrimary,
              updatedAt: resume.updatedAt,
            }
          : null,
        profile: profile
          ? {
              headline: profile.headline,
              targetTitles: profile.targetTitles,
              minSalary: profile.minSalary,
              maxSalary: profile.maxSalary,
              remotePreference: profile.remotePreference,
            }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load resume profile.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const body = await request.json();
    const { resumeId, parsedData, profile } = body;

    let targetResumeId = resumeId;
    if (!targetResumeId) {
      const primary = await getPrimaryResume(user.id);
      targetResumeId = primary?.id;
    }

    if (targetResumeId && parsedData) {
      await updateResumeParsedData(user.id, targetResumeId, parsedData);
    }

    if (profile) {
      await db.profile.upsert({
        where: { userId: user.id },
        update: {
          headline: profile.headline,
          targetTitles: profile.targetTitles,
          minSalary: profile.minSalary,
          remotePreference: profile.remotePreference,
        },
        create: {
          userId: user.id,
          headline: profile.headline,
          targetTitles: profile.targetTitles || [],
          minSalary: profile.minSalary,
          remotePreference: profile.remotePreference || "ANY",
        },
      });
    }

    return NextResponse.json(
      { success: true, message: "Profile and resume updated successfully." },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update resume.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

