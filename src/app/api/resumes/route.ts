import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { getPrimaryResume, getUserResumes, updateResumeParsedData } from "@/services/db/resumeService";
import { db } from "@/lib/db";
import { resumeParsedDataSchema } from "@/lib/validations/resume";
import { updateProfileSchema } from "@/lib/validations/auth";
import { verifySameOrigin } from "@/lib/security/originCheck";

const updateResumeBodySchema = z
  .object({
    resumeId: z.string().min(1).max(120).optional(),
    parsedData: resumeParsedDataSchema.optional(),
    profile: updateProfileSchema.optional(),
  })
  .strict();

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
  } catch {
    return NextResponse.json({ error: "Failed to load resume profile." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: Request) {
  const originError = verifySameOrigin(request);
  if (originError) return originError;

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const rawBody: unknown = await request.json();
    const parsed = updateResumeBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid resume update payload." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { resumeId, parsedData, profile } = parsed.data;

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
  } catch {
    return NextResponse.json(
      { error: "Failed to update resume." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

