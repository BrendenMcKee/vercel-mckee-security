import type { Metadata } from "next";
import { getAuthContext } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import {
  SERVICE_TYPE_LABELS,
  tierLabel,
} from "@/lib/portal/service-labels";
import {
  PAYMENT_INSTRUCTIONS,
  PAYMENT_METHOD_LABELS,
  formatCents,
  intervalMonths,
  type PaymentMethod,
} from "@/lib/portal/billing";
import { deviceExpiryDate, isDeviceExpired } from "@/lib/portal/devices";
import { ServiceStatusBadge } from "@/components/admin-portal/ui";
import { CallerIdEditor } from "@/components/portal/caller-id-editor";
import { PayNowButton } from "@/components/portal/pay-now-button";
import { ManageBillingButton } from "@/components/portal/manage-billing-button";
import { PortalCard } from "@/components/portal/portal-card";

export const metadata: Metadata = {
  title: "Manage Account",
  robots: { index: false, follow: false },
};

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type PaymentHistoryEntry = {
  key: string;
  paidOn: string;
  amountCents: number | null;
  how: string;
  serviceType: string | null;
};

/**
 * Client dashboard (PORTAL_PLAN.md 7.1). Phase 3 gave it the read-only
 * monitoring/cloud cards; Phase 4 adds caller ID list management and device
 * maintenance; Phase 5 adds the payment banner (Stripe Pay Now vs manual
 * instructions). Stakeholder round 2 adds the Billing & Payments card:
 * next payment date, full payment history (manual ledger + card payments),
 * card setup for autopay services, and the Stripe portal for receipts/card
 * updates. Reads go through RLS: a client can only see their own rows.
 */
export default async function UserDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  // Pages render in parallel with their layout, so unauthenticated visits
  // reach this code even though the layout shows SignIn instead. Render
  // nothing in every state the layout gates away.
  const { user, profile } = await getAuthContext();
  if (!user || !profile || profile.status === "disabled") return null;

  const { payment } = await searchParams;

  const supabase = await createPortalServerClient();
  const [servicesResult, contactsResult, devicesResult, manualPaymentsResult, cardPaymentsResult] =
    await Promise.all([
      supabase
        .from("services")
        .select(
          "id, service_type, tier, status, billing_method, billing_interval, monthly_amount_cents, next_due_on, stripe_subscription_id",
        )
        .eq("profile_id", profile.id)
        .order("service_type"),
      supabase
        .from("caller_id_contacts")
        .select("phone, label, passcode")
        .eq("profile_id", profile.id)
        .order("created_at"),
      supabase
        .from("devices")
        .select("id, label, installed_on, lifetime_years")
        .eq("profile_id", profile.id)
        .order("created_at"),
      supabase
        .from("manual_payments")
        .select("id, service_id, amount_cents, method, paid_on")
        .eq("profile_id", profile.id)
        .order("paid_on", { ascending: false })
        .limit(24),
      supabase
        .from("billing_events")
        .select("id, service_id, created_at, payload")
        .eq("profile_id", profile.id)
        .eq("type", "invoice.paid")
        .order("created_at", { ascending: false })
        .limit(24),
    ]);

  if (servicesResult.error || contactsResult.error || devicesResult.error) {
    console.error(
      "[portal] Client dashboard query failed:",
      servicesResult.error ?? contactsResult.error ?? devicesResult.error,
    );
    throw new Error("Dashboard failed to load.");
  }

  const services = servicesResult.data;
  const monitoring = services.find((s) => s.service_type === "monitoring");
  const cloud = services.find((s) => s.service_type === "cloud_backup");
  const unpaidServices = services.filter((s) => s.status === "unpaid");
  const serviceTypeById = new Map(services.map((s) => [s.id, s.service_type]));

  // Autopay services with no card on file yet, but nothing owing right now:
  // prompt for card setup (billing starts at their anniversary).
  const cardSetupNeeded = services.filter(
    (s) => s.billing_method === "stripe" && !s.stripe_subscription_id && s.status === "active",
  );

  // Unified payment history: manual ledger + successful card payments.
  const history: PaymentHistoryEntry[] = [
    ...(manualPaymentsResult.data ?? []).map((p) => ({
      key: `m-${p.id}`,
      paidOn: p.paid_on,
      amountCents: p.amount_cents,
      how: PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? "Payment",
      serviceType: serviceTypeById.get(p.service_id) ?? null,
    })),
    ...(cardPaymentsResult.data ?? []).map((e) => {
      const payload = e.payload as { amount_paid?: number } | null;
      return {
        key: `c-${e.id}`,
        paidOn: e.created_at.slice(0, 10),
        amountCents: typeof payload?.amount_paid === "number" ? payload.amount_paid : null,
        how: "Card (automatic)",
        serviceType: e.service_id ? (serviceTypeById.get(e.service_id) ?? null) : null,
      };
    }),
  ]
    .sort((a, b) => b.paidOn.localeCompare(a.paidOn))
    .slice(0, 12);

  const billableServices = services.filter((s) => s.status !== "cancelled");
  const hasCardOnFile = services.some((s) => s.stripe_subscription_id);

  return (
    <div className="space-y-6">
      {payment === "success" && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm leading-relaxed text-emerald-200"
        >
          Payment set up successfully. Thank you! A confirmation email is on
          its way. If anything below still looks out of date, refresh in a few
          seconds.
        </p>
      )}
      {payment === "cancelled" && (
        <p
          role="status"
          className="rounded-2xl border border-white/15 bg-surface p-5 text-sm leading-relaxed text-white/70"
        >
          Checkout was cancelled and no charge was made. You can set up payment
          any time from the Billing &amp; Payments section below.
        </p>
      )}

      {unpaidServices.map((service) => (
        <div
          key={service.id}
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-6"
        >
          <h2 className="text-lg font-bold text-amber-100">
            Payment needed: {SERVICE_TYPE_LABELS[service.service_type]}
          </h2>
          {service.billing_method === "stripe" ? (
            <div className="mt-3 space-y-4">
              <p className="text-sm leading-relaxed text-amber-200/90">
                Your {SERVICE_TYPE_LABELS[service.service_type].toLowerCase()} plan
                ({tierLabel(service.tier)}) is waiting on a payment. Enter your
                card below. After that, payments happen automatically each
                billing period.
              </p>
              <PayNowButton serviceId={service.id} />
            </div>
          ) : (
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-amber-200/90">
              <p>
                {service.monthly_amount_cents
                  ? `Amount due: ${formatCents(service.monthly_amount_cents * intervalMonths(service.billing_interval))} plus tax${
                      service.billing_interval === "annual"
                        ? ` (${formatCents(service.monthly_amount_cents)}/month, invoiced annually)`
                        : ""
                    }${service.next_due_on ? `, due ${formatDate(service.next_due_on)}` : ""}.`
                  : "A payment is due on this service."}
              </p>
              <p>{PAYMENT_INSTRUCTIONS}</p>
            </div>
          )}
        </div>
      ))}

      {cardSetupNeeded.map((service) => (
        <div
          key={service.id}
          className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 sm:p-6"
        >
          <h2 className="text-lg font-bold text-sky-100">
            Set up automatic payments: {SERVICE_TYPE_LABELS[service.service_type]}
          </h2>
          <div className="mt-3 space-y-4">
            <p className="text-sm leading-relaxed text-sky-200/90">
              Your account is set up for automatic card payments, but no card is
              on file yet. Add your card below. You will not be charged today
              {service.next_due_on
                ? `; your first automatic payment happens on your regular billing date, ${formatDate(service.next_due_on)}`
                : ""}
              .
            </p>
            <PayNowButton serviceId={service.id} label="Set Up Automatic Payments" />
          </div>
        </div>
      ))}

      <PortalCard
        icon="shield"
        title={SERVICE_TYPE_LABELS.monitoring}
        description="Your alarm monitoring plan"
        action={monitoring ? <ServiceStatusBadge status={monitoring.status} /> : undefined}
      >
        {monitoring ? (
          <div className="flex flex-col gap-5 border-t border-white/10 pt-5 md:flex-row md:items-center md:justify-between md:gap-10">
            <div>
              <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {tierLabel(monitoring.tier)}
              </p>
              {monitoring.monthly_amount_cents != null && (
                <p className="mt-2 text-[15px] text-white/55">
                  <span className="font-semibold text-white/80">
                    {formatCents(monitoring.monthly_amount_cents)}
                  </span>
                  /month plus tax
                  {monitoring.billing_interval === "annual" && ", invoiced annually"}
                </p>
              )}
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/55 md:border-l md:border-white/10 md:pl-8">
              Your monitoring plan is managed by McKee Security. To make changes,
              call{" "}
              <a
                href="tel:+17054572156"
                className="whitespace-nowrap font-bold text-white hover:text-primary"
              >
                (705) 457-2156
              </a>
              .
            </p>
          </div>
        ) : (
          <p className="border-t border-white/10 pt-5 text-sm leading-relaxed text-white/65">
            No monitoring service on this account. Interested? Call{" "}
            <a href="tel:+17054572156" className="font-bold text-white hover:text-primary">
              (705) 457-2156
            </a>{" "}
            to get set up.
          </p>
        )}
      </PortalCard>

      {cloud && (
        <PortalCard
          icon="cloud"
          title={SERVICE_TYPE_LABELS.cloud_backup}
          description="Camera footage stored securely off-site"
          action={<ServiceStatusBadge status={cloud.status} />}
        >
          <div className="flex flex-col gap-5 border-t border-white/10 pt-5 md:flex-row md:items-center md:justify-between md:gap-10">
            <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{tierLabel(cloud.tier)}</p>
            <p className="max-w-sm text-sm leading-relaxed text-white/55 md:border-l md:border-white/10 md:pl-8">
              Your cloud backup plan runs on McKee-managed equipment. For plan
              questions or changes, contact McKee Security at{" "}
              <a
                href="tel:+17054572156"
                className="whitespace-nowrap font-bold text-white hover:text-primary"
              >
                (705) 457-2156
              </a>
              .
            </p>
          </div>
        </PortalCard>
      )}

      {billableServices.length > 0 && (
        <PortalCard
          icon="card"
          title={<>Billing &amp; Payments</>}
          description="What you pay, when it comes out, and every payment you have made"
        >
          <div className="grid gap-3 border-t border-white/10 pt-5 md:grid-cols-2">
            {billableServices.map((service) => {
              const invoiceCents =
                service.monthly_amount_cents != null
                  ? service.monthly_amount_cents * intervalMonths(service.billing_interval)
                  : null;
              return (
                <div key={service.id} className="rounded-xl border border-white/10 bg-background p-4 sm:p-5">
                  <p className="font-bold text-white">{SERVICE_TYPE_LABELS[service.service_type]}</p>
                  <dl className="mt-3.5 space-y-2.5 text-sm">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="shrink-0 text-white/45">How you pay</dt>
                      <dd className="text-right text-white/85">
                        {service.billing_method === "stripe"
                          ? service.stripe_subscription_id
                            ? "Automatic (card on file)"
                            : "Automatic card payments (card not set up yet)"
                          : "e-Transfer, cheque, or cash"}
                      </dd>
                    </div>
                    {invoiceCents != null && (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="shrink-0 text-white/45">Amount</dt>
                        <dd className="text-right tabular-nums text-white/85">
                          <span className="font-semibold text-white">{formatCents(invoiceCents)}</span>
                          {" "}plus tax
                          {service.billing_interval === "annual" ? " per year" : " per month"}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-4 border-t border-white/10 pt-2.5">
                      <dt className="shrink-0 text-white/45">Next payment</dt>
                      <dd className="text-right font-semibold text-white">
                        {service.next_due_on ? formatDate(service.next_due_on) : "To be confirmed"}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>

          {hasCardOnFile && (
            <div className="mt-4">
              <ManageBillingButton />
            </div>
          )}

          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              Payment history
            </p>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-white/45">
                No payments on record yet. Once you make a payment, it shows up
                here.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-white/5 text-sm">
                {history.map((entry) => (
                  <li
                    key={entry.key}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-white/80">
                      <span className="text-[15px] font-bold tabular-nums text-white">
                        {entry.amountCents != null ? formatCents(entry.amountCents) : "Payment"}
                      </span>
                      <span className="text-white/60">
                        {" "}
                        &middot; {entry.how}
                      </span>
                      {entry.serviceType && (
                        <span className="text-white/40">
                          {" "}
                          &middot; {SERVICE_TYPE_LABELS[entry.serviceType as keyof typeof SERVICE_TYPE_LABELS] ?? entry.serviceType}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-white/45">{formatDate(entry.paidOn)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PortalCard>
      )}

      {monitoring && (
        <PortalCard
          icon="phone"
          title="Alarm Contact List (Caller ID)"
          description="Who the monitoring station calls when your alarm goes off"
        >
          <div className="border-t border-white/10 pt-5">
            <p className="max-w-3xl text-sm leading-relaxed text-white/55">
              These are the people the monitoring station calls, in order, when
              your alarm goes off. Each person has a passcode they give the
              station to confirm who they are. Add or remove contacts and save.
              McKee Security is notified automatically and updates the station.
            </p>
            <div className="mt-5">
              <CallerIdEditor variant="client" initialContacts={contactsResult.data} />
            </div>
          </div>
        </PortalCard>
      )}

      {devicesResult.data.length > 0 && (
        <PortalCard
          icon="wrench"
          title="Equipment Maintenance"
          description="Install dates and upcoming replacements for your system's hardware"
        >
          <div className="grid gap-3 border-t border-white/10 pt-5 md:grid-cols-2">
            {devicesResult.data.map((device) => {
              const expired = isDeviceExpired(device.installed_on, device.lifetime_years);
              const expiry = deviceExpiryDate(device.installed_on, device.lifetime_years);
              return (
                <div
                  key={device.id}
                  className={`rounded-xl border p-4 ${
                    expired
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-white/10 bg-background"
                  }`}
                >
                  <p className="font-bold text-white">{device.label}</p>
                  <p className="mt-1 text-sm text-white/65">
                    Installed {formatDate(device.installed_on)}
                  </p>
                  <p className={`mt-1 text-sm font-semibold ${expired ? "text-amber-300" : "text-white/65"}`}>
                    {expired
                      ? `Replacement was due ${expiry.toLocaleDateString("en-CA", { year: "numeric", month: "long" })}. Call McKee to schedule it.`
                      : `Next replacement due ${expiry.toLocaleDateString("en-CA", { year: "numeric", month: "long" })}.`}
                  </p>
                </div>
              );
            })}
          </div>
        </PortalCard>
      )}
    </div>
  );
}
