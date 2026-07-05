import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ACTIVATION_COOKIE, validateInvitationToken } from "@/lib/portal/invitations";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { createPortalServerClient } from "@/lib/portal/supabase/server";

/**
 * Final step of the Google activation path (PORTAL_PLAN.md 6.4): the OAuth
 * callback lands here with a fresh session; the raw token rides the
 * short-lived httpOnly cookie set by beginGoogleActivation. Invariant: a
 * Google identity is linked to a pending profile only when the request
 * carries a valid unconsumed token, and the Google email must match
 * target_email when one is set. Mismatch = sign out, token NOT consumed.
 */
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/account/activate?error=${reason}`);

  const cookieStore = await cookies();
  const token = cookieStore.get(ACTIVATION_COOKIE)?.value;
  cookieStore.delete(ACTIVATION_COOKIE);

  if (!token) return fail("session_expired");

  const supabase = await createPortalServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return fail("session_expired");

  const userId = claims.sub;
  const userEmail = ((claims.email as string | undefined) ?? "").toLowerCase();

  const validation = await validateInvitationToken(token);
  if (validation.state !== "valid") {
    // Fresh Google session with no usable invite: sign out so the visitor
    // doesn't linger as an orphan session.
    await supabase.auth.signOut();
    return fail("token_invalid");
  }
  const { invitation, profile } = validation;

  // A signed-in user who already owns a profile keeps their session; the
  // invitation stays unconsumed.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingProfile) return fail("already_linked");

  const targetEmail = invitation.target_email?.toLowerCase() ?? null;
  if (targetEmail && targetEmail !== userEmail) {
    await supabase.auth.signOut();
    return fail("email_mismatch");
  }

  const admin = getPortalAdminClient();
  const { data: linked, error: linkError } = await admin
    .from("profiles")
    .update({ user_id: userId, status: "active" })
    .eq("id", profile.id)
    .is("user_id", null)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (linkError || !linked) {
    console.error("[portal] Google activation linking failed:", linkError ?? "already linked");
    await supabase.auth.signOut();
    return fail("token_invalid");
  }

  const { error: usedError } = await admin
    .from("invitations")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invitation.id)
    .is("used_at", null);
  if (usedError) {
    console.error("[portal] Marking invitation used failed:", usedError);
  }

  return NextResponse.redirect(`${origin}/user-dashboard`);
}
