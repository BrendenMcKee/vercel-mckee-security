import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/portal/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Admin gate (PORTAL_PLAN.md 6.5): getClaims() + fresh profiles.role check.
 * Anything short of an active admin gets a neutral not-found response, so the
 * route is never advertised. Admins sign in via /user-dashboard first.
 *
 * Every admin server action independently re-checks with requireAdmin() (R6).
 */
export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getAuthContext();

  if (!user || !profile || profile.role !== "admin" || profile.status !== "active") {
    if (user) {
      console.warn(`[portal] Non-admin access attempt on admin portal: auth user ${user.id}.`);
    }
    notFound();
  }

  return <div className="portal-area">{children}</div>;
}
