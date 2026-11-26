import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { deleteOwnedAccountData } from "@/services/db/accountDeletionService";

export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await deleteOwnedAccountData(user.id);
    if (!result.deleted) {
      return NextResponse.json({ error: "Account not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to delete account data." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
