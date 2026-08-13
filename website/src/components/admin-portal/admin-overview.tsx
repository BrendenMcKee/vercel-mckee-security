import type { ReactNode } from "react";
import Link from "next/link";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import {
  SERVICE_THEME,
  SERVICE_TIERS,
  SERVICE_TYPE_LABELS,
  tierLabel,
  type ServiceType,
} from "@/lib/portal/service-labels";

type FeedItem = { at: string; text: string; href?: string };
type KpiTone = "neutral" | "good" | "watch" | "alert";

const TONE_STYLES: Record<KpiTone, { card: string; value: string; icon: string }> = {
  neutral: {
    card: "border-white/10 bg-surface",
    value: "text-white",
    icon: "bg-white/10 text-white/70",
  },
  good: {
    card: "border-emerald-500/25 bg-emerald-500/10",
    value: "text-emerald-100",
    icon: "bg-emerald-500/15 text-emerald-300",
  },
  watch: {
    card: "border-amber-500/30 bg-amber-500/10",
    value: "text-amber-100",
    icon: "bg-amber-500/15 text-amber-300",
  },
  alert: {
    card: "border-red-500/30 bg-red-500/10",
    value: "text-red-100",
    icon: "bg-red-500/15 text-red-300",
  },
};

function KpiIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden>
      {children}
    </svg>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: KpiTone;
  icon: ReactNode;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${styles.card}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-bold uppercase tracking-wide text-white/70">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${styles.value}`}>{value}</p>
      {sub && <p className="mt-1.5 text-xs leading-relaxed text-white/45">{sub}</p>}
    </div>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white/55">{title}</h2>
      {hint && <p className="mt-1 text-xs text-white/35">{hint}</p>}
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

  // Billing KPIs (Phase 5). Booked revenue = monthly amounts on services we
  // are actually billing. Paused is a hold: Stripe is not charging.
  const billable = services.filter((s) => s.status !== "cancelled" && s.status !== "paused");
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
    <div className="space-y-8 sm:space-y-10">
      <section>
        <SectionHeading title="Clients" hint="Who is on the books right now" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <KpiCard
            label="Active clients"
            value={activeClients}
            tone={activeClients > 0 ? "good" : "neutral"}
            icon={
              <KpiIcon>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </KpiIcon>
            }
          />
          <KpiCard
            label="Pending activations"
            value={pendingActivations}
            sub="Invited, not yet signed in"
            tone={pendingActivations > 0 ? "watch" : "good"}
            icon={
              <KpiIcon>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2M12 22a10 10 0 110-20 10 10 0 010 20z" />
              </KpiIcon>
            }
          />
          <KpiCard
            label="Disabled accounts"
            value={disabledClients}
            tone={disabledClients > 0 ? "watch" : "neutral"}
            icon={
              <KpiIcon>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636A9 9 0 105.636 18.364M6 6l12 12" />
              </KpiIcon>
            }
          />
        </div>
      </section>

      <section>
        <SectionHeading title="Billing" hint="What is booked each month" />
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <KpiCard
            label="Booked monthly revenue"
            value={dollars(autopayCents + manualCents)}
            sub="Across all active services with a rate set"
            tone="neutral"
            icon={
              <KpiIcon>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </KpiIcon>
            }
          />
          <KpiCard
            label="Card vs direct payers"
            value={`${dollars(autopayCents)} / ${dollars(manualCents)}`}
            sub="Automatic card payments vs e-Transfer, cheque, or cash"
            tone="neutral"
            icon={
              <KpiIcon>
                <rect x="2.75" y="5.25" width="18.5" height="13.5" rx="2.5" />
                <path strokeLinecap="round" d="M2.75 9.75h18.5M6.25 14.75h4" />
              </KpiIcon>
            }
          />
        </div>
      </section>

      <section>
        <SectionHeading title="Needs attention" hint="Items that should be handled this week" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <KpiCard
            label="Unpaid services"
            value={unpaidServices}
            sub="Assigned, awaiting first payment"
            tone={unpaidServices > 0 ? "watch" : "good"}
            icon={
              <KpiIcon>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4M12 16h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </KpiIcon>
            }
          />
          <KpiCard
            label="Overdue to collect"
            value={overdueManual}
            sub="Direct payers past their due date"
            tone={overdueManual > 0 ? "alert" : "good"}
            icon={
              <KpiIcon>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2M4.93 19.07A10 10 0 1119.07 4.93 10 10 0 014.93 19.07z" />
              </KpiIcon>
            }
          />
          <KpiCard
            label="Failed card payments"
            value={failedPayments30d}
            sub="Last 30 days"
            tone={failedPayments30d > 0 ? "alert" : "good"}
            icon={
              <KpiIcon>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </KpiIcon>
            }
          />
        </div>
      </section>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
          <h2 className="text-lg font-bold text-white">Services by plan</h2>
          <p className="mt-1 text-xs text-white/40">Cancelled services excluded.</p>
          <div className="mt-4 space-y-5">
            {(Object.keys(SERVICE_TIERS) as ServiceType[]).map((type) => (
              <div key={type}>
                <p className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className={`h-2.5 w-2.5 rounded-full ${SERVICE_THEME[type].dot}`} />
                  {SERVICE_TYPE_LABELS[type]}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SERVICE_TIERS[type].map((tier) => (
                    <span
                      key={tier}
                      className={`rounded-full border px-3 py-1 text-xs ${SERVICE_THEME[type].chip}`}
                    >
                      {tierLabel(tier)}: <span className="font-bold">{tierCounts.get(`${type}:${tier}`) ?? 0}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
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
