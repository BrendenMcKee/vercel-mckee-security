import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Admin portal route group: /admin-dashboard.
 *
 * Phase 0: branded shell only. Phase 1 adds the getClaims() + profiles.role
 * gate that renders a neutral not-found response for non-admins
 * (PORTAL_PLAN.md Section 6.5).
 */
export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="portal-area">{children}</div>;
}
