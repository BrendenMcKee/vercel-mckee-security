import Link from "next/link";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import {
  SERVICE_TIERS,
  SERVICE_TYPE_LABELS,
  tierLabel,
  type ServiceType,
} from "@/lib/portal/service-labels";

type FeedItem = { at: string; text: string; href?: string };

function KpiCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-5">
      <p className="text-xs uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  );
}

/**
 * Overview (PORTAL_PLAN.md 7.2): plain aggregates over the portal tables
 * computed at request time, no analytics infrastructure. Phase 5 added the
 * billing row: booked monthly revenue split by rail, overdue manual
 * collections, and failed card payments (30 days). Reads run on the
 * user-context client under admin RLS (R13).
 */
export async function AdminOverview() {
  const supabase = await createPortalServerClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [profilesRes, servicesRes, activationsRes, failedRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, status, created_at")
      .eq("role", "client"),
    supabase
      .from("services")
      .select("id, profile_id, service_type, tier, status, created_at, billing_method, monthly_amount_cents, next_due_on"),
    supabase
      .from("invitations")
      .select("profile_id, used_at")
      .not("used_at", "is", null)
      .order("used_at", { ascending: false })
      .limit(15),
    supabase
      .from("billing_events")
      .select("id", { count: "exact", head: true })
      .eq("type", "invoice.payment_failed")
      .gte("created_at", thirtyDaysAgo),
  ]);

  if (profilesRes.error || servicesRes.error || activationsRes.error || failedRes.error) {
    console.error(
      "[portal] Overview queries failed:",
      profilesRes.error ?? servicesRes.error ?? activationsRes.error ?? failedRes.error,
    );
    throw new Error("Overview failed to load.");
  }

  const profiles = profilesRes.data;
  const services = servicesRes.data;
  const nameById = new Map(profiles.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));

  const activeClients = profiles.filter((p) => p.status === "active").length;
  const pendingActivations = profiles.filter((p) => p.status === "pending").length;
  const disabledClients = profiles.filter((p) => p.status === "disabled").length;
  const unpaidServices = services.filter((s) => s.status === "unpaid").length;

  // Billing KPIs (Phase 5). Booked revenue = monthly amounts on non-cancelled
  // services, split by rail.
  const billable = services.filter((s) => s.status !== "cancelled");
  const autopayCents = billable
    .filter((s) => s.billing_method === "stripe")
    .reduce((sum, s) => sum + (s.monthly_amount_cents ?? 0), 0);
  const manualCents = billable
    .filter((s) => s.billing_method === "manual")
    .reduce((sum, s) => sum + (s.monthly_amount_cents ?? 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdueManual = billable.filter(
    (s) => s.billing_method === "manual" && s.next_due_on && s.next_due_on < today,
  ).length;
  const failedPayments30d = failedRes.count ?? 0;
  const dollars = (cents: number) => `$${(cents / 100).toFixed(0)}`;

  const tierCounts = new Map<string, number>();
  for (const s of services) {
    if (s.status === "cancelled") continue;
    const key = `${s.service_type}:${s.tier}`;
    tierCounts.set(key, (tierCounts.get(key) ?? 0) + 1);
  }

  const feed: FeedItem[] = [
    ...profiles.map((p) => ({
      at: p.created_at,
      text: `Client created: ${p.first_name} ${p.last_name}`,
      href: `/admin-dashboard/clients/${p.id}`,
    })),
    ...activationsRes.data.map((inv) => ({
      at: inv.used_at!,
      text: `Account activated: ${nameById.get(inv.profile_id) ?? "Unknown client"}`,
      href: `/admin-dashboard/clients/${inv.profile_id}`,
    })),
    ...services.map((s) => ({
      at: s.created_at,
      text: `Service assigned: ${SERVICE_TYPE_LABELS[s.service_type]} (${tierLabel(s.tier)}) for ${nameById.get(s.profile_id) ?? "Unknown client"}`,
      href: `/admin-dashboard/clients/${s.profile_id}`,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active clients" value={activeClients} />
        <KpiCard label="Pending activations" value={pendingActivations} sub="Invited, not yet activated" />
        <KpiCard label="Unpaid services" value={unpaidServices} sub="Assigned, awaiting payment" />
        <KpiCard label="Disabled accounts" value={disabledClients} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Booked monthly revenue"
          value={dollars(autopayCents + manualCents)}
          sub="Non-cancelled services with an amount set"
        />
        <KpiCard
          label="Autopay vs manual"
          value={`${dollars(autopayCents)} / ${dollars(manualCents)}`}
          sub="Card on file vs legacy collection"
        />
        <KpiCard
          label="Overdue manual payments"
          value={overdueManual}
          sub="Collect these — see the Billing tab"
        />
        <KpiCard
          label="Failed card payments"
          value={failedPayments30d}
          sub="Last 30 days, via Stripe webhook"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-surface p-6">
          <h2 className="text-lg font-bold text-white">Services by tier</h2>
          <p className="mt-1 text-xs text-white/40">Cancelled services excluded.</p>
          <div className="mt-4 space-y-5">
            {(Object.keys(SERVICE_TIERS) as ServiceType[]).map((type) => (
              <div key={type}>
                <p className="text-sm font-bold text-white/80">{SERVICE_TYPE_LABELS[type]}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SERVICE_TIERS[type].map((tier) => (
                    <span
                      key={tier}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70"
                    >
                      {tierLabel(tier)}: <span className="font-bold text-white">{tierCounts.get(`${type}:${tier}`) ?? 0}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface p-6">
          <h2 className="text-lg font-bold text-white">Recent activity</h2>
          {feed.length === 0 ? (
            <p className="mt-4 text-sm text-white/40">Nothing yet. Create the first client from the Clients tab.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {feed.map((item, i) => (
                <li key={`${item.at}-${i}`} className="flex items-baseline justify-between gap-4 text-sm">
                  {item.href ? (
                    <Link href={item.href} className="text-white/80 hover:text-white">
                      {item.text}
                    </Link>
                  ) : (
                    <span className="text-white/80">{item.text}</span>
                  )}
                  <span className="shrink-0 text-xs text-white/40">
                    {new Date(item.at).toLocaleDateString("en-CA")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
