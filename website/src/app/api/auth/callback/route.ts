import { NextResponse, type NextRequest } from "next/server";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";

/**
 * The Google activation flow (PORTAL_PLAN.md 6.4) legitimately arrives here
 * with a session that has no profile yet; linking happens on this path, so it
 * is exempt from the uninvited-sign-in cleanup below.
 */
const ACTIVATION_COMPLETE_PATH = "/account/activate/complete";

/**
 * PKCE code exchange for Supabase OAuth sign-in (PORTAL_PLAN.md 6.1 step 3).
 * Route handlers can write cookies, so the server client persists the session
 * here. `next` is constrained to a local path to prevent open redirects.
 *
 * Uninvited sign-ins (stakeholder 2026-07-05): OAuth signups must stay enabled
 * globally for the invite activation flow (R9), which means anyone clicking
 * "Continue with Google" briefly creates an auth user. For plain sign-ins,
 * a session without a linked profile is rejected right here: sign out, delete
 * the auth user so nothing lingers in Supabase, and return to the sign-in
 * screen with a clear "no account" message instead of pushing forward.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  const next = searchParams.get("next") ?? "/user-dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/user-dashboard";
  const separator = safeNext.includes("?") ? "&" : "?";

  if (code) {
    const supabase = await createPortalServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (safeNext !== ACTIVATION_COMPLETE_PATH) {
        const { data } = await supabase.auth.getClaims();
        const userId = data?.claims?.sub;
        if (userId) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          // Only treat a *successful* empty lookup as "no account": a failed
          // query must never delete a real user.
          if (!profileError && !profile) {
            console.warn(
              `[portal] Uninvited Google sign-in rejected: auth user ${userId} has no profile; removing.`,
            );
            await supabase.auth.signOut();
            const { error: deleteError } = await getPortalAdminClient().auth.admin.deleteUser(userId);
            if (deleteError) {
              // Orphan cleanup cron (Phase 7) is the backstop.
              console.error("[portal] Uninvited auth user cleanup failed:", deleteError);
            }
            return NextResponse.redirect(`${origin}${safeNext}${separator}auth_error=no_account`);
          }
        }
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
    console.warn("[portal] OAuth code exchange failed:", error.message);
  }

  // Land failures on the intended destination: sign-in pages render the
  // logged-out state and /account/reset-password renders its link-expired
  // state, each with a retry path.
  return NextResponse.redirect(`${origin}${safeNext}${separator}auth_error=callback`);
}
