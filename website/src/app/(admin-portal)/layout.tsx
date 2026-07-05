import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/portal/auth";
import { SignIn } from "@/components/portal/sign-in";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Admin gate (PORTAL_PLAN.md 6.5, amended 2026-07-05): signed-out visitors
 * get the shared SignIn screen in place; signed-in users who are not active
 * admins get a neutral not-found response, so authenticated clients never
 * learn the admin console exists.
 *
 * Every admin server action independently re-checks with requireAdmin() (R6).
 */
export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getAuthContext();

  if (!user) {
    return <SignIn next="/admin-dashboard" variant="admin" />;
  }

  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    console.warn(`[portal] Non-admin access attempt on admin portal: auth user ${user.id}.`);
    notFound();
  }

  return <div className="portal-area">{children}</div>;
}
