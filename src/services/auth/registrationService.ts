import type { SupabaseClient } from "@supabase/supabase-js";
import type { SignUpInput } from "@/lib/validations/auth";
import { syncSupabaseUser } from "@/services/db/userService";

export async function registerAccount(
  input: SignUpInput,
  redirectTo: string,
  auth: Pick<SupabaseClient["auth"], "signUp">,
  synchronize: typeof syncSupabaseUser = syncSupabaseUser,
) {
  const { data, error } = await auth.signUp({
    email: input.email, password: input.password,
    options: { emailRedirectTo: redirectTo, data: { full_name: input.fullName } },
  });
  if (error || !data.user) return { error: error?.message || "Registration failed." };
  // Pending confirmations, including obfuscated responses for existing users,
  // must never be treated as proof of identity or linked to application records.
  if (data.session) {
    await synchronize(data.session.user.id, data.session.user.email || input.email, input.fullName);
  }
  return { success: true, confirmationRequired: !data.session, user: data.session
    ? { id: data.session.user.id, email: data.session.user.email } : undefined };
}
