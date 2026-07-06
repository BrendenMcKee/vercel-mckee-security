import type { Metadata } from "next";
import Link from "next/link";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { AdminAlerts } from "@/components/admin-portal/admin-alerts";
import { AdminBilling } from "@/components/admin-portal/admin-billing";
import { AdminClientsPanel } from "@/components/admin-portal/admin-clients-panel";
import { AdminOverview } from "@/components/admin-portal/admin-overview";
import { SignOutButton } from "@/components/portal/sign-out-button";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "clients", label: "Clients" },
  { id: "billing", label: "Billing" },
  { id: "alerts", label: "Alerts" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Tabbed operating console (PORTAL_PLAN.md 7.2). Overview (KPIs + activity
 * feed), Clients (search, filters, create, row click to detail), Billing
 * (autopay + manual collection boards, Phase 5), and Alerts (operational
 * failures, Phase 7). Fleet joins in Phase 6A. Reads run on the user-context
 * client: admin RLS policies authorize them (R13).
 */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: TabId =
    tab === "clients" ? "clients" : tab === "billing" ? "billing" : tab === "alerts" ? "alerts" : "overview";

  const supabase = await createPortalServerClient();
  const { count: openAlerts } = await supabase
    .from("portal_alerts")
    .select("id", { count: "exact", head: true })
    .is("resolved_at", null);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            McKee Security Internal
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Admin Dashboard
          </h1>
        </div>
        <SignOutButton />
      </div>

      <nav className="mt-8 flex gap-2 border-b border-white/10" aria-label="Dashboard sections">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "overview" ? "/admin-dashboard" : `/admin-dashboard?tab=${t.id}`}
            className={`rounded-t-xl px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
              activeTab === t.id
                ? "border border-b-0 border-white/10 bg-surface text-white"
                : "text-white/50 hover:text-white"
            }`}
            aria-current={activeTab === t.id ? "page" : undefined}
          >
            {t.label}
            {t.id === "alerts" && (openAlerts ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                {openAlerts}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        {activeTab === "overview" ? (
          <AdminOverview />
        ) : activeTab === "billing" ? (
          <AdminBilling />
        ) : activeTab === "alerts" ? (
          <AdminAlerts />
        ) : (
          <ClientsTab />
        )}
      </div>
    </section>
  );
}

async function ClientsTab() {
  const supabase = await createPortalServerClient();
  const { data: clients, error } = await supabase
    .from("profiles")
    .select("*, services(*), invitations(id, target_email, expires_at, used_at, created_at)")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[portal] Admin clients query failed:", error);
    throw new Error("Clients failed to load.");
  }

  return <AdminClientsPanel clients={clients ?? []} />;
}
