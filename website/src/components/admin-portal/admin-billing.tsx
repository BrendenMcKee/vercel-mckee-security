import Link from "next/link";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { SERVICE_TYPE_LABELS, tierLabel } from "@/lib/portal/service-labels";
import { daysUntil, formatCents } from "@/lib/portal/billing";
import { ServiceStatusBadge } from "@/components/admin-portal/ui";

/**
 * Phase 5 Billing tab (PORTAL_PLAN.md 7.2/7.3): answers the owner's daily
 * questions — who pays by card, who is on the legacy rail, which manual
 * payments are due or overdue, and which card payments failed. Recording a
 * payment happens on the client detail page (one click through).
 */
export async function AdminBilling() {
  const supabase = await createPortalServerClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [servicesRes, failedRes] = await Promise.all([
    supabase
      .from("services")
      .select(
        "id, service_type, tier, status, billing_method, billing_interval, monthly_amount_cents, next_due_on, stripe_subscription_id, profiles(id, first_name, last_name, email, stripe_customer_id)",
      )
      .neq("status", "cancelled"),
    supabase
      .from("billing_events")
      .select("id, type, profile_id, created_at")
      .eq("type", "invoice.payment_failed")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
  ]);

  if (servicesRes.error || failedRes.error) {
    console.error("[portal] Billing tab queries failed:", servicesRes.error ?? failedRes.error);
    throw new Error("Billing failed to load.");
  }

  const services = servicesRes.data;
  const failedEvents = failedRes.data;

  const autopay = services.filter((s) => s.billing_method === "stripe");
  const manual = services
    .filter((s) => s.billing_method === "manual")
    .sort((a, b) => (a.next_due_on ?? "9999").localeCompare(b.next_due_on ?? "9999"));

  const nameByProfileId = new Map(
    services
      .filter((s) => s.profiles)
      .map((s) => [s.profiles!.id, `${s.profiles!.first_name} ${s.profiles!.last_name}`]),
  );

  const clientCell = (service: (typeof services)[number]) =>
    service.profiles ? (
      <Link
        href={`/admin-dashboard/clients/${service.profiles.id}`}
        className="font-bold text-white hover:text-primary"
      >
        {service.profiles.first_name} {service.profiles.last_name}
      </Link>
    ) : (
      <span className="text-white/40">Unknown client</span>
    );

  return (
    <div className="space-y-8">
      {failedEvents.length > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h2 className="text-lg font-bold text-red-200">
            Failed card payments (last 30 days)
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {failedEvents.map((event) => (
              <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-2">
                {event.profile_id ? (
                  <Link
                    href={`/admin-dashboard/clients/${event.profile_id}`}
                    className="font-bold text-white hover:text-primary"
                  >
                    {nameByProfileId.get(event.profile_id) ?? "View client"}
                  </Link>
                ) : (
                  <span className="text-white/70">Unmatched Stripe customer — check the Stripe dashboard</span>
                )}
                <span className="text-xs text-red-200/70">
                  {new Date(event.created_at).toLocaleString("en-CA")}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-red-200/60">
            Stripe retries failed cards automatically. If retries keep failing, get an updated card from the client.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-surface p-6">
        <h2 className="text-lg font-bold text-white">Manual billing ({manual.length})</h2>
        <p className="mt-1 text-xs text-white/40">
          Legacy rail (R22): the daily reminder cron emails these clients before
          their due date and when overdue. Click a client to record a received
          payment; that advances the due date a month.
        </p>
        {manual.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">No services on manual billing.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-white/40">
                  <th className="py-2 pr-4 font-bold">Client</th>
                  <th className="py-2 pr-4 font-bold">Service</th>
                  <th className="py-2 pr-4 font-bold">Rate</th>
                  <th className="py-2 pr-4 font-bold">Next due</th>
                  <th className="py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {manual.map((service) => {
                  const days = service.next_due_on ? daysUntil(service.next_due_on) : null;
                  const overdue = days != null && days < 0;
                  const dueSoon = days != null && days >= 0 && days <= 7;
                  return (
                    <tr
                      key={service.id}
                      className={`border-b border-white/5 ${overdue ? "bg-red-500/10" : dueSoon ? "bg-amber-500/5" : ""}`}
                    >
                      <td className="py-3 pr-4">{clientCell(service)}</td>
                      <td className="py-3 pr-4 text-white/70">
                        {SERVICE_TYPE_LABELS[service.service_type]} · {tierLabel(service.tier)}
                      </td>
                      <td className="py-3 pr-4 text-white/70">
                        {service.monthly_amount_cents != null ? (
                          <>
                            {formatCents(service.monthly_amount_cents)}/mo
                            {service.billing_interval === "annual" && (
                              <span className="text-white/40"> (annual invoice)</span>
                            )}
                          </>
                        ) : (
                          <span className="text-amber-300">Not set</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {service.next_due_on ? (
                          <span
                            className={
                              overdue
                                ? "font-bold text-red-300"
                                : dueSoon
                                  ? "font-bold text-amber-300"
                                  : "text-white/70"
                            }
                          >
                            {service.next_due_on}
                            {overdue && ` (${Math.abs(days!)}d overdue)`}
                            {dueSoon && !overdue && ` (in ${days}d)`}
                          </span>
                        ) : (
                          <span className="text-amber-300">Not set</span>
                        )}
                      </td>
                      <td className="py-3">
                        <ServiceStatusBadge status={service.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-surface p-6">
        <h2 className="text-lg font-bold text-white">Stripe autopay ({autopay.length})</h2>
        <p className="mt-1 text-xs text-white/40">
          Card-on-file subscriptions renew themselves; Stripe is the source of
          truth and the webhook keeps statuses in sync. Nothing to collect
          manually here.
        </p>
        {autopay.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">No services on autopay yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-white/40">
                  <th className="py-2 pr-4 font-bold">Client</th>
                  <th className="py-2 pr-4 font-bold">Service</th>
                  <th className="py-2 pr-4 font-bold">Subscription</th>
                  <th className="py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {autopay.map((service) => (
                  <tr key={service.id} className="border-b border-white/5">
                    <td className="py-3 pr-4">{clientCell(service)}</td>
                    <td className="py-3 pr-4 text-white/70">
                      {SERVICE_TYPE_LABELS[service.service_type]} · {tierLabel(service.tier)}
                    </td>
                    <td className="py-3 pr-4 text-white/70">
                      {service.stripe_subscription_id ? (
                        "Card on file"
                      ) : (
                        <span className="text-amber-300">Awaiting first payment</span>
                      )}
                    </td>
                    <td className="py-3">
                      <ServiceStatusBadge status={service.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
