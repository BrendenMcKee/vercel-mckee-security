import type { Metadata } from "next";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { PendingTabLink } from "@/components/portal/pending-tab-link";
import { AdminAlerts } from "@/components/admin-portal/admin-alerts";
import { AdminBilling } from "@/components/admin-portal/admin-billing";
import { AdminClientsPanel } from "@/components/admin-portal/admin-clients-panel";
import { AdminDevices } from "@/components/admin-portal/admin-devices";
import { AdminOverview } from "@/components/admin-portal/admin-overview";
import { ClientMailPausedBanner } from "@/components/admin-portal/client-mail-paused-banner";
import { SignOutButton } from "@/components/portal/sign-out-button";
import { PORTAL_SHELL_CLASS } from "@/lib/portal/shell";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "clients", label: "Clients" },
  { id: "billing", label: "Billing" },
  { id: "devices", label: "Devices" },
  { id: "alerts", label: "Alerts" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tabbed operating console (PORTAL_PLAN.md 7.2). Overview (KPIs + activity
 * feed), Clients (search, filters, create, row click to detail), Billing
 * (autopay + manual collection boards, Phase 5), Devices (all tracked
 * equipment across clients, filterable by category and due status), and
 * Alerts (operational failures, Phase 7). Fleet joins in Phase 6A. Reads run
 * on the user-context client: admin RLS policies authorize them (R13).
 */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; addTo?: string }>;
}) {
  const { tab, addTo } = await searchParams;
  const activeTab: TabId =
    tab === "clients"
      ? "clients"
      : tab === "billing"
        ? "billing"
        : tab === "devices"
          ? "devices"
          : tab === "alerts"
            ? "alerts"
            : "overview";

  const supabase = await createPortalServerClient();
  const nowIso = new Date().toISOString();
  const [{ count: openAlerts }, settingsRes, onTestState, onTestZones] = await Promise.all([
    supabase
      .from("portal_alerts")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),
    supabase.from("portal_settings").select("client_mail_enabled").eq("id", 1).maybeSingle(),
    supabase
      .from("lanvac_account_state")
      .select("profile_id")
      .gt("on_test_until", nowIso),
    supabase.from("lanvac_zones").select("profile_id").eq("on_test", true),
  ]);
  const onTestSites = new Set([
    ...(onTestState.data ?? []).map((row) => row.profile_id),
    ...(onTestZones.data ?? []).map((row) => row.profile_id),
  ]).size;
  const alertBadge = (openAlerts ?? 0) + onTestSites;
  const clientMailEnabled = settingsRes.data?.client_mail_enabled === true;

  return (
    <section className={`${PORTAL_SHELL_CLASS} py-8 sm:py-12`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-amber-300">
            McKee Security Staff Console
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Admin Dashboard
          </h1>
        </div>
        <SignOutButton />
      </div>

      {!clientMailEnabled && <ClientMailPausedBanner />}

      <nav
        className="no-scrollbar -mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-white/10 px-4 sm:mx-0 sm:mt-8 sm:gap-2 sm:px-0"
        aria-label="Dashboard sections"
      >
        {TABS.map((t) => (
          <PendingTabLink
            key={t.id}
            href={t.id === "overview" ? "/admin-dashboard" : `/admin-dashboard?tab=${t.id}`}
            active={activeTab === t.id}
          >
            {t.label}
            {t.id === "alerts" && (
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                  alertBadge > 0
                    ? "bg-red-500 text-white"
                    : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40"
                }`}
                aria-label={`${alertBadge} open alerts`}
              >
                {alertBadge}
              </span>
            )}
          </PendingTabLink>
        ))}
      </nav>

      <div className="mt-6 sm:mt-8">
        {activeTab === "overview" ? (
          <AdminOverview />
        ) : activeTab === "billing" ? (
          <AdminBilling />
        ) : activeTab === "devices" ? (
          <AdminDevices />
        ) : activeTab === "alerts" ? (
          <AdminAlerts />
        ) : (
          <ClientsTab addToAccountId={addTo} />
        )}
      </div>
    </section>
  );
}

async function ClientsTab({ addToAccountId }: { addToAccountId?: string }) {
  const supabase = await createPortalServerClient();
  const [{ data: clients, error }, membersResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, services(*), invitations(id, target_email, expires_at, used_at, created_at), accounts(name)")
      .eq("role", "client")
      .order("created_at", { ascending: false }),
    supabase.from("account_members").select("account_id, email"),
  ]);

  if (error) {
    console.error("[portal] Admin clients query failed:", error);
    throw new Error("Clients failed to load.");
  }
  if (membersResult.error) {
    console.error("[portal] Admin account members query failed:", membersResult.error);
  }

  const prefillAccountId =
    addToAccountId && UUID_RE.test(addToAccountId) ? addToAccountId : "";

  return (
    <AdminClientsPanel
      clients={clients ?? []}
      memberEmails={membersResult.data ?? []}
      prefillAccountId={prefillAccountId}
    />
  );
}
