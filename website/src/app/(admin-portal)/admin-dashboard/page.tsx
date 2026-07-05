import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Phase 0 shell. Phase 1 puts this behind the admin role gate; Phases 2+ add
 * the Clients, Overview, Billing, and Alerts tabs (PORTAL_PLAN.md Section 7.2).
 */
export default function AdminDashboardPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        McKee Security Internal
      </p>
      <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Admin Dashboard</h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-white/65">
        The administration console is under construction.
      </p>
    </section>
  );
}
