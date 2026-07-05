import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh for portal routes, called from src/proxy.ts.
 *
 * Server Components cannot write cookies, so expired auth tokens must be
 * refreshed here, before render, and the fresh cookies persisted on both the
 * forwarded request and the outgoing response (current @supabase/ssr guidance).
 *
 * This function never makes authorization decisions: layouts and server
 * actions re-check identity and role themselves (PORTAL_PLAN.md R6).
 */
export async function refreshPortalSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Triggers a token refresh when the access token is expired; the setAll
  // callback above persists the refreshed cookies.
  await supabase.auth.getClaims();

  return response;
}
