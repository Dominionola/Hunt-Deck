import { it } from "node:test";
import assert from "node:assert/strict";
import { registerAccount } from "../../src/services/auth/registrationService";
import { GET as confirmationCallback } from "../../src/app/auth/callback/route";
import { authCallbackSchema, resendConfirmationSchema } from "../../src/lib/validations/auth";

const input = { email: "synthetic@example.invalid", password: "synthetic-test-password", fullName: "Synthetic Candidate" };
type Auth = Parameters<typeof registerAccount>[2];
type Synchronize = Parameters<typeof registerAccount>[3];

it("requires confirmation and does not link unverified or obfuscated signup users", async () => {
  let synchronized = false;
  const auth = { signUp: async () => ({ data: { user: { id: "unverified" }, session: null }, error: null }) } as unknown as Auth;
  const sync = (async () => { synchronized = true; }) as unknown as Synchronize;
  const result = await registerAccount(input, "http://localhost:3000/auth/callback", auth, sync);
  assert.equal(result.confirmationRequired, true);
  assert.equal(result.user, undefined);
  assert.equal(synchronized, false);
});

it("links only the session identity after an immediate authenticated signup", async () => {
  let identity: unknown[] = [];
  const auth = { signUp: async (args: { options: { emailRedirectTo: string } }) => {
    assert.equal(args.options.emailRedirectTo, "http://localhost:3000/auth/callback");
    return { data: { user: { id: "response-id" }, session: { user: { id: "verified-id", email: input.email } } }, error: null };
  } } as unknown as Auth;
  const sync = (async (...args: unknown[]) => { identity = args; }) as unknown as Synchronize;
  const result = await registerAccount(input, "http://localhost:3000/auth/callback", auth, sync);
  assert.equal(result.confirmationRequired, false);
  assert.equal(result.user?.id, "verified-id");
  assert.deepEqual(identity, ["verified-id", input.email, input.fullName]);
});

it("never reports signup success when the provider rejects registration", async () => {
  const auth = { signUp: async () => ({ data: { user: null, session: null }, error: { message: "Registration rejected" } }) } as unknown as Auth;
  const result = await registerAccount(input, "http://localhost:3000/auth/callback", auth);
  assert.equal(result.success, undefined);
  assert.equal(result.error, "Registration rejected");
});

it("rejects missing confirmation codes and ignores external redirect parameters", async () => {
  const response = await confirmationCallback(new Request("http://localhost:3000/auth/callback?next=https://example.invalid"));
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?confirmation=failed");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

it("validates both PKCE code and Supabase OTP token_hash callback parameters", () => {
  assert.equal(authCallbackSchema.safeParse({ code: "pkce_code_123" }).success, true);
  assert.equal(
    authCallbackSchema.safeParse({ token_hash: "hash_abc", type: "signup" }).success,
    true
  );
  assert.equal(authCallbackSchema.safeParse({ token_hash: "hash_abc" }).success, false);
  assert.equal(authCallbackSchema.safeParse({}).success, false);

  assert.equal(resendConfirmationSchema.safeParse({ email: "alex@example.com" }).success, true);
  assert.equal(resendConfirmationSchema.safeParse({ email: "not-an-email" }).success, false);
});
