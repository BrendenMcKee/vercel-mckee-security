import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Client portal route group: /user-dashboard, /account/activate.
 *
 * Phase 0: branded shell only. Phase 1 adds the getClaims() gate that renders
 * <SignIn/> for logged-out visitors (PORTAL_PLAN.md Section 6.1).
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="portal-area">{children}</div>;
}
