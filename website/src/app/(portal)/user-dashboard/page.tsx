import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Account",
  robots: { index: false, follow: false },
};

/**
 * Phase 1: authenticated shell (gate lives in layout.tsx). Phase 3/4 replace
 * this placeholder with the dashboard cards (monitoring, cloud backup, caller
 * ID, devices, payment banner; PORTAL_PLAN.md 7.1).
 */
export default function UserDashboardPage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <p className="text-base leading-relaxed text-white/65">
        Your account dashboard is under construction. Service details, caller ID
        management, and more will appear here soon. Questions in the meantime? Call{" "}
        <a href="tel:+17054572156" className="font-bold text-white hover:text-primary">
          (705) 457-2156
        </a>
        .
      </p>
    </div>
  );
}
