import { NextResponse, type NextRequest } from "next/server";
import { createPortalServerClient } from "@/lib/portal/supabase/server";

/**
 * PKCE code exchange for Supabase OAuth sign-in (PORTAL_PLAN.md 6.1 step 3).
 * Route handlers can write cookies, so the server client persists the session
 * here. `next` is constrained to a local path to prevent open redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  const next = searchParams.get("next") ?? "/user-dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/user-dashboard";

  if (code) {
    const supabase = await createPortalServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
    console.warn("[portal] OAuth code exchange failed:", error.message);
  }

  return NextResponse.redirect(`${origin}/user-dashboard?auth_error=callback`);
}
