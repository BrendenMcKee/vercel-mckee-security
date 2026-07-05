import type { NextRequest } from "next/server";
import { refreshPortalSession } from "@/lib/portal/supabase/proxy-session";

/**
 * Portal-scoped proxy (Next 16 rename of middleware).
 *
 * Sole job: refresh Supabase auth cookies before portal pages render, because
 * Server Components cannot write cookies. Authorization happens in layouts,
 * server actions, and RLS (PORTAL_PLAN.md R6); never here.
 *
 * The matcher is scoped tightly to portal routes so the rest of the site
 * (marketing pages, Data Drops, Starlink admin, static assets) is untouched.
 */
export function proxy(request: NextRequest) {
  return refreshPortalSession(request);
}

export const config = {
  matcher: ["/user-dashboard/:path*", "/admin-dashboard/:path*", "/account/:path*"],
};
