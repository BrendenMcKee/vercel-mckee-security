import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Client portal route group: /user-dashboard, /account/activate.
 *
 * Deliberately gate-free: /account/activate must render for anonymous
 * invitees (PORTAL_PLAN.md 6.3). The auth gate lives in
 * user-dashboard/layout.tsx.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="portal-area">{children}</div>;
}
