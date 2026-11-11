import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUserByAuthSubject, syncSupabaseUser } from "@/services/db/userService";
import type { User, Profile, Resume } from "@prisma/client";

export type AuthenticatedUserWithProfile = User & {
  profile: Profile | null;
  resumes: Resume[];
};

/**
 * Validates the Supabase session server-side from request cookies
 * and resolves the matching application User record from Prisma.
 * Returns null if the user is unauthenticated or the session is invalid.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUserWithProfile | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Ask Supabase Auth to validate user identity (not trusting raw cookie payload)
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return null;
    }

    const authSubject = data.user.id;
    const email = data.user.email;

    if (!email) {
      return null;
    }

    // Lookup matching internal user by Supabase Auth subject UUID
    let user = await getUserByAuthSubject(authSubject);

    // If first-time authenticated session, automatically sync the mapping
    if (!user) {
      const fullName = (data.user.user_metadata?.full_name as string) || (data.user.user_metadata?.name as string);
      user = await syncSupabaseUser(authSubject, email, fullName);
    }

    return user as AuthenticatedUserWithProfile;
  } catch {
    return null;
  }
}

/**
 * Throws an Error if no valid server session exists.
 * Used in server actions and protected API route handlers.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUserWithProfile> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: A valid authenticated session is required.");
  }
  return user;
}
