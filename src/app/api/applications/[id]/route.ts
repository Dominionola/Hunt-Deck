import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import {
  updatePipelineStage,
  addApplicationNote,
  deleteApplication,
} from "@/services/db/applicationService";
import { z } from "zod";

const patchApplicationSchema = z.object({
  stage: z.enum(["saved", "tailored", "applied", "interviewing", "offer"]).optional(),
  note: z.string().optional(),
});

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { id } = await props.params;

  try {
    const json = await request.json();
    const parsed = patchApplicationSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid patch payload.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    let updated;
    if (parsed.data.stage) {
      updated = await updatePipelineStage(user.id, id, parsed.data.stage, parsed.data.note);
    } else if (parsed.data.note) {
      updated = await addApplicationNote(user.id, id, parsed.data.note);
    } else {
      return NextResponse.json({ error: "No update parameters provided." }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, application: updated },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update application.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { id } = await props.params;

  try {
    await deleteApplication(user.id, id);
    return NextResponse.json(
      { success: true, message: "Application removed from pipeline." },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete application.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

