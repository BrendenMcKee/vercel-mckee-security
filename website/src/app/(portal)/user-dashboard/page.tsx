import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { resolvePortalSession } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import {
  SERVICE_TYPE_LABELS,
  hasCurrentMonitoring,
  tierLabel,
} from "@/lib/portal/service-labels";
import {
  PAYMENT_METHOD_LABELS,
  formatCents,
  intervalMonths,
  invoiceSendCents,
  voipCoverageLabel,
  voipUnchargedPorts,
  type PaymentMethod,
} from "@/lib/portal/billing";
import { deviceCategoryLabel, deviceExpiryDate, isDeviceExpired } from "@/lib/portal/devices";
import { ServiceStatusBadge } from "@/components/admin-portal/ui";
import { CallerIdEditor } from "@/components/portal/caller-id-editor";
import { ManageBillingButton } from "@/components/portal/manage-billing-button";
import { ManualPaymentBanner, ServiceRateLine } from "@/components/portal/manual-payment-notice";
import { PaymentSetupBanner } from "@/components/portal/payment-setup-banner";
import { PortalCard, PortalCardIcon } from "@/components/portal/portal-card";
import { PayNowButton } from "@/components/portal/pay-now-button";
import { CloudBackupInterest } from "@/components/portal/cloud-backup-interest";
import { ClientSettingsForm } from "@/components/portal/client-settings-form";
import { LanvacEmergencyReadout } from "@/components/portal/lanvac-emergency-readout";
import { LanvacStationReadout } from "@/components/portal/lanvac-station-readout";
import { lanvacEmergencyNumbers } from "@/lib/portal/lanvac-cities";
import { asLanvacSignalClass } from "@/lib/portal/lanvac-signals";
import { isStationOnTest, lanvacWritesLive } from "@/lib/portal/lanvac-writes";
import { ScrollToHash } from "@/components/portal/scroll-to-hash";

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

type ClientTabId = "dashboard" | "security" | "settings" | "alerts";

/**
 * Client portal (PORTAL_PLAN.md 7.1). Tabs: Dashboard / Security / Settings /
 * Alerts. Dashboard is billing-first plus compact service cards. Security is
 * only shown when the account has monitoring or leftover station/contact/
 * equipment rows; that is the only client tab that mounts the station
 * readout (Lanvac pull) or the full caller-ID editor.
 */
function monitoringHeaderCopy(tier: string): string {
  switch (tier) {
    case "landline":
      return "This system reports to the monitoring station over a land line. If it goes off, they call your contact list in order.";
    case "cellular":
      return "This system reports over a cellular communicator. If it goes off, the station calls your contact list in order.";
    case "cellular_tc":
      return "Cellular communicator plus Total Connect 2.0 app control. If it goes off, the station calls your contact list in order.";
    case "cellular_tc_home":
      return "Cellular communicator, Total Connect 2.0, and home automation. If it goes off, the station calls your contact list in order.";
    default:
      return "If this system goes off, the monitoring station calls your contact list in order.";
  }
}

export default async function UserDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; tab?: string; site?: string }>;
}) {
  // Pages render in parallel with their layout, so unauthenticated visits
  // reach this code even though the layout shows SignIn instead. Render
  // nothing in every state the layout gates away. `?site=` is validated
  // here (cookie / first active site if missing or not accessible).
  const { payment, tab, site } = await searchParams;
  const session = await resolvePortalSession(site);
  if (session.kind !== "client" || !session.passwordSet) return null;
  const { user, selectedSite: profile } = session;
  const requestedTab: ClientTabId =
    tab === "settings"
      ? "settings"
      : tab === "alerts"
        ? "alerts"
        : tab === "security"
          ? "security"
          : "dashboard";

  const supabase = await createPortalServerClient();
  const fetchDashboardExtras = () =>
    Promise.all([
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
      supabase
        .from("cloud_backup_interest")
        .select("profile_id, email, consented_at")
        .eq("profile_id", profile.id)
        .maybeSingle(),
    ]);
  const fetchSecurityExtras = () =>
    Promise.all([
      supabase
        .from("caller_id_contacts")
        .select("id, phone, label, passcode, sort_order")
        .eq("profile_id", profile.id)
        .order("sort_order"),
      supabase
        .from("lanvac_zones")
        .select("zone_number, description, zone_type, on_test, use_call_list")
        .eq("profile_id", profile.id)
        .order("zone_number"),
      supabase
        .from("lanvac_signals")
        .select("occurred_at_text, signal, description, signal_class")
        .eq("profile_id", profile.id)
        .order("sort_index"),
    ]);

  const [
    servicesResult,
    devicesResult,
    contactsCountResult,
    stationStateResult,
    cachedZonesResult,
    earlyDashboard,
    earlySecurity,
  ] = await Promise.all([
    supabase
      .from("services")
      .select(
        "id, service_type, tier, status, billing_method, billing_interval, monthly_amount_cents, number_count, seat_count, port_count, port_fee_charged_count, next_due_on, stripe_subscription_id",
      )
      .eq("profile_id", profile.id)
      .order("service_type"),
    supabase
      .from("devices")
      .select("id, label, category, installed_on, lifetime_years")
      .eq("profile_id", profile.id)
      .order("created_at"),
    supabase
      .from("caller_id_contacts")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
    supabase
      .from("lanvac_account_state")
      .select(
        "panel_type, is_disabled, on_test_until, last_signal_at, last_signal_class, last_synced_at, last_error",
      )
      .eq("profile_id", profile.id)
      .maybeSingle(),
    supabase
      .from("lanvac_zones")
      .select("zone_number")
      .eq("profile_id", profile.id),
    requestedTab === "dashboard" ? fetchDashboardExtras() : Promise.resolve(null),
    requestedTab === "security" ? fetchSecurityExtras() : Promise.resolve(null),
  ]);

  if (
    servicesResult.error ||
    devicesResult.error ||
    contactsCountResult.error ||
    stationStateResult.error ||
    cachedZonesResult.error
  ) {
    console.error(
      "[portal] Client dashboard query failed:",
      servicesResult.error ??
        devicesResult.error ??
        contactsCountResult.error ??
        stationStateResult.error ??
        cachedZonesResult.error,
    );
    throw new Error("Dashboard failed to load.");
  }

  const services = servicesResult.data;
  const monitoring = services.find((s) => s.service_type === "monitoring");
  const currentMonitoring =
    monitoring && monitoring.status !== "cancelled" ? monitoring : null;
  const cloud = services.find((s) => s.service_type === "cloud_backup");
  const voip = services.find((s) => s.service_type === "voip");
  const contactCount = contactsCountResult.count ?? 0;
  const showCallerId = hasCurrentMonitoring(services) || contactCount > 0;
  const showDevices = hasCurrentMonitoring(services) || devicesResult.data.length > 0;
  const canRefreshStation =
    hasCurrentMonitoring(services) && Boolean(profile.lanvac_account_code);
  const showStation =
    canRefreshStation ||
    (cachedZonesResult.data ?? []).length > 0 ||
    stationStateResult.data != null;
  const showSecurityTab = showCallerId || showDevices || showStation;
  const activeTab: ClientTabId =
    requestedTab === "security" && !showSecurityTab ? "dashboard" : requestedTab;

  let dashboardExtras = earlyDashboard;
  let securityExtras = activeTab === "security" ? earlySecurity : null;
  if (activeTab === "dashboard" && !dashboardExtras) {
    dashboardExtras = await fetchDashboardExtras();
  }

  if (dashboardExtras) {
    const [manualPaymentsResult, cardPaymentsResult, cloudInterestResult] = dashboardExtras;
    if (manualPaymentsResult.error || cardPaymentsResult.error || cloudInterestResult.error) {
      console.error(
        "[portal] Client dashboard billing query failed:",
        manualPaymentsResult.error ?? cardPaymentsResult.error ?? cloudInterestResult.error,
      );
      throw new Error("Dashboard failed to load.");
    }
  }
  if (securityExtras) {
    const [contactsResult, stationZonesResult, stationSignalsResult] = securityExtras;
    if (contactsResult.error || stationZonesResult.error || stationSignalsResult.error) {
      console.error(
        "[portal] Client security tab query failed:",
        contactsResult.error ?? stationZonesResult.error ?? stationSignalsResult.error,
      );
      throw new Error("Dashboard failed to load.");
    }
  }

  const stationZones = (securityExtras?.[1].data ?? []).map((zone) => ({
    zoneNumber: zone.zone_number,
    description: zone.description,
    zoneType: zone.zone_type,
    onTest: zone.on_test,
    useCallList: zone.use_call_list,
  }));
  const stationSignals = (securityExtras?.[2].data ?? []).map((row) => ({
    occurredAtText: row.occurred_at_text,
    signal: row.signal,
    description: row.description,
    signalClass: asLanvacSignalClass(row.signal_class) ?? "unknown",
  }));
  const stationState = stationStateResult.data
    ? {
        panelType: stationStateResult.data.panel_type,
        isDisabled: stationStateResult.data.is_disabled,
        onTestUntil: stationStateResult.data.on_test_until,
        lastSignalAt: stationStateResult.data.last_signal_at,
        lastSignalClass: asLanvacSignalClass(stationStateResult.data.last_signal_class),
        lastSyncedAt: stationStateResult.data.last_synced_at,
        lastError: stationStateResult.data.last_error,
      }
    : null;
  const missingCallerId = hasCurrentMonitoring(services) && contactCount === 0;
  const unpaidServices = services.filter((s) => s.status === "unpaid");
  const serviceTypeById = new Map(services.map((s) => [s.id, s.service_type]));

  const cardSetupNeeded = services.filter(
    (s) => s.billing_method === "stripe" && !s.stripe_subscription_id && s.status === "active",
  );
  const stripePayables = [
    ...unpaidServices.filter((s) => s.billing_method === "stripe"),
    ...cardSetupNeeded.filter((s) => !unpaidServices.some((u) => u.id === s.id)),
  ];
  const unchargedPorts =
    voip &&
    voip.billing_method === "stripe" &&
    voip.status !== "cancelled" &&
    voip.status !== "paused"
      ? voipUnchargedPorts(voip.port_count, voip.port_fee_charged_count)
      : 0;
  const outstandingPortFee =
    voip && unchargedPorts > 0 ? { serviceId: voip.id, uncharged: unchargedPorts } : null;

  const manualPayments = dashboardExtras?.[0].data ?? [];
  const cardPayments = dashboardExtras?.[1].data ?? [];
  const cloudInterest = dashboardExtras?.[2].data ?? null;

  const history: PaymentHistoryEntry[] = [
    ...manualPayments.map((p) => ({
      key: `m-${p.id}`,
      paidOn: p.paid_on,
      amountCents: p.amount_cents,
      how: PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? "Payment",
      serviceType: serviceTypeById.get(p.service_id) ?? null,
    })),
    ...cardPayments.map((e) => {
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
  const expiredDevices = devicesResult.data.filter((device) =>
    isDeviceExpired(device.installed_on, device.lifetime_years),
  );
  const manualUnpaid = unpaidServices.filter((s) => s.billing_method === "manual").length;
  const cardPaymentAlerts = hasCardOnFile
    ? stripePayables.length + (outstandingPortFee ? 1 : 0)
    : stripePayables.length > 0 || outstandingPortFee
      ? 1
      : 0;
  const stationOnTest = isStationOnTest({
    onTestUntil: stationState?.onTestUntil,
  });
  const alertCount =
    manualUnpaid +
    cardPaymentAlerts +
    (missingCallerId ? 1 : 0) +
    expiredDevices.length +
    (stationOnTest ? 1 : 0);

  const clientTabs: Array<{ id: ClientTabId; label: string; href: string }> = [
    { id: "dashboard", label: "Dashboard", href: "/user-dashboard" },
    ...(showSecurityTab
      ? [{ id: "security" as const, label: "Security", href: "/user-dashboard?tab=security" }]
      : []),
    { id: "settings", label: "Settings", href: "/user-dashboard?tab=settings" },
    { id: "alerts", label: "Alerts", href: "/user-dashboard?tab=alerts" },
  ];

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <ScrollToHash />
      </Suspense>
      <nav
        className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-white/10 px-4 sm:mx-0 sm:gap-2 sm:px-0"
        aria-label="Client portal sections"
      >
        {clientTabs.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            prefetch={item.id === "security" ? false : undefined}
            className={`shrink-0 whitespace-nowrap rounded-t-xl px-3.5 py-2.5 text-[13px] font-bold uppercase tracking-wide transition-colors sm:px-5 sm:text-sm ${
              activeTab === item.id
                ? "border border-b-0 border-white/10 bg-surface text-white"
                : "text-white/50 hover:text-white"
            }`}
            aria-current={activeTab === item.id ? "page" : undefined}
          >
            <span className="inline-flex items-center gap-2">
              {item.label}
              {item.id === "alerts" && (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    alertCount > 0
                      ? "bg-red-500 text-white"
                      : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40"
                  }`}
                  aria-label={`${alertCount} alerts`}
                >
                  {alertCount}
                </span>
              )}
            </span>
          </Link>
        ))}
      </nav>

      {activeTab === "settings" ? (
        <ClientSettingsForm email={profile.email} phone={profile.phone} address={profile.address} />
      ) : activeTab === "alerts" ? (
        <ClientAlertsPanel
          unpaidServices={unpaidServices}
          missingCallerId={missingCallerId}
          cardSetupNeeded={cardSetupNeeded}
          stripePayables={stripePayables}
          outstandingPortFee={outstandingPortFee}
          hasCardOnFile={hasCardOnFile}
          expiredDevices={expiredDevices}
          stationOnTest={stationOnTest}
          stationOnTestUntil={stationState?.onTestUntil ?? null}
          showSecurityTab={showSecurityTab}
        />
      ) : activeTab === "security" ? (
        <ClientSecurityPanel
          profileId={profile.id}
          lanvacCity={profile.lanvac_city}
          lanvacAccountCode={profile.lanvac_account_code}
          monitoring={currentMonitoring}
          showStation={showStation}
          canRefreshStation={canRefreshStation}
          stationState={stationState}
          stationZones={stationZones}
          stationSignals={stationSignals}
          showCallerId={showCallerId}
          contacts={securityExtras?.[0].data ?? []}
          showDevices={showDevices}
          devices={devicesResult.data}
        />
      ) : (
        <ClientDashboardPanel
          payment={payment}
          unpaidServices={unpaidServices}
          stripePayables={stripePayables}
          outstandingPortFee={outstandingPortFee}
          hasCardOnFile={hasCardOnFile}
          missingCallerId={missingCallerId}
          showSecurityTab={showSecurityTab}
          monitoring={monitoring ?? null}
          voip={voip ?? null}
          cloud={cloud ?? null}
          billableServices={billableServices}
          history={history}
          cloudInterest={cloudInterest}
          email={profile.email}
        />
      )}
    </div>
  );
}

function ClientDashboardPanel({
  payment,
  unpaidServices,
  stripePayables,
  outstandingPortFee,
  hasCardOnFile,
  missingCallerId,
  showSecurityTab,
  monitoring,
  voip,
  cloud,
  billableServices,
  history,
  cloudInterest,
  email,
}: {
  payment?: string;
  unpaidServices: Array<{
    id: string;
    service_type: "monitoring" | "cloud_backup" | "voip";
    billing_method: "stripe" | "manual";
    billing_interval: "monthly" | "annual";
    monthly_amount_cents: number | null;
    next_due_on: string | null;
  }>;
  stripePayables: Array<{
    id: string;
    service_type: "monitoring" | "cloud_backup" | "voip";
    tier: string;
    status: string;
    next_due_on: string | null;
  }>;
  outstandingPortFee: { serviceId: string; uncharged: number } | null;
  hasCardOnFile: boolean;
  missingCallerId: boolean;
  showSecurityTab: boolean;
  monitoring: {
    status: "active" | "paused" | "cancelled" | "unpaid";
    tier: string;
    monthly_amount_cents: number | null;
    billing_interval: "monthly" | "annual";
    billing_method: "stripe" | "manual";
  } | null;
  voip: {
    status: "active" | "paused" | "cancelled" | "unpaid";
    tier: string;
    monthly_amount_cents: number | null;
    billing_interval: "monthly" | "annual";
    billing_method: "stripe" | "manual";
    number_count: number;
    seat_count: number;
  } | null;
  cloud: {
    status: "active" | "paused" | "cancelled" | "unpaid";
    tier: string;
  } | null;
  billableServices: Array<{
    id: string;
    service_type: "monitoring" | "cloud_backup" | "voip";
    billing_method: "stripe" | "manual";
    billing_interval: "monthly" | "annual";
    monthly_amount_cents: number | null;
    next_due_on: string | null;
    stripe_subscription_id: string | null;
  }>;
  history: PaymentHistoryEntry[];
  cloudInterest: { profile_id: string } | null;
  email: string | null;
}) {
  return (
    <>
      {payment === "success" && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm leading-relaxed text-emerald-200"
        >
          Your card is saved. Approved services and any port fee are starting on
          that card. Payments from here are automatic. If anything below still
          looks unpaid, refresh in a few seconds or use Finish starting your
          services.
        </p>
      )}
      {payment === "cancelled" && (
        <p
          role="status"
          className="rounded-2xl border border-white/15 bg-surface p-5 text-sm leading-relaxed text-white/70"
        >
          No card was saved and nothing was charged. Use Set up your card to
          start your services when you are ready.
        </p>
      )}

      {unpaidServices
        .filter((service) => service.billing_method === "manual")
        .map((service) => (
          <ManualPaymentBanner
            key={service.id}
            serviceLabel={SERVICE_TYPE_LABELS[service.service_type]}
            monthlyCents={service.monthly_amount_cents}
            interval={service.billing_interval}
            dueOn={service.next_due_on}
          />
        ))}

      <PaymentSetupBanner
        services={stripePayables}
        portFee={outstandingPortFee}
        hasCardOnFile={hasCardOnFile}
      />

      {missingCallerId && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-amber-100">
            Alarm contact list needed
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-amber-200/90">
            Your monitoring plan is on this account, but the monitoring station
            does not have anyone to call yet. Add at least one person with their
            passcode.
          </p>
          <Link
            href="/user-dashboard?tab=security#alarm-contact-list"
            prefetch={false}
            className="mt-4 inline-flex cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-(--primary-hover)"
          >
            Add contacts
          </Link>
        </div>
      )}

      {billableServices.length > 0 && (
        <PortalCard
          icon="card"
          tone="billing"
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
                      <dd
                        className={`text-right ${
                          service.billing_method === "stripe"
                            ? service.stripe_subscription_id
                              ? "font-semibold text-emerald-300"
                              : "font-semibold text-amber-300"
                            : "text-white/85"
                        }`}
                      >
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
                          {" "}plus HST
                          {service.billing_interval === "annual" ? " per year" : " per month"}
                        </dd>
                      </div>
                    )}
                    {service.billing_method === "manual" && service.monthly_amount_cents != null && (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="shrink-0 text-white/45">Amount to send</dt>
                        <dd className="text-right tabular-nums">
                          <span className="font-semibold text-white">
                            {formatCents(
                              invoiceSendCents(service.monthly_amount_cents, service.billing_interval),
                            )}
                          </span>
                          <span className="block text-xs font-normal text-white/50">
                            includes 13% HST
                          </span>
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
            <div className="mt-4 space-y-2">
              <ManageBillingButton />
              <p className="text-xs leading-relaxed text-white/40">
                Change your card here. Automatic payments keep going on the new card.
              </p>
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
          icon="shield"
          tone="monitoring"
          title={SERVICE_TYPE_LABELS.monitoring}
          description="Your alarm monitoring plan"
          status={<ServiceStatusBadge status={monitoring.status} withIcon />}
          action={<ServiceStatusBadge status={monitoring.status} />}
        >
          <div className="flex flex-col gap-5 border-t border-white/10 pt-5 md:flex-row md:items-center md:justify-between md:gap-10">
            <div>
              <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {tierLabel(monitoring.tier)}
              </p>
              {monitoring.monthly_amount_cents != null && (
                <ServiceRateLine
                  monthlyCents={monitoring.monthly_amount_cents}
                  interval={monitoring.billing_interval}
                  billingMethod={monitoring.billing_method}
                />
              )}
              {showSecurityTab && (
                <Link
                  href="/user-dashboard?tab=security"
                  prefetch={false}
                  className="mt-4 inline-flex cursor-pointer text-sm font-bold text-white underline decoration-white/30 underline-offset-4 hover:text-primary hover:decoration-primary"
                >
                  Manage zones, signals, and contacts
                </Link>
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
        </PortalCard>
      )}

      {voip && (
        <PortalCard
          icon="voip"
          tone="voip"
          title={SERVICE_TYPE_LABELS.voip}
          description="Your phone service plan"
          status={<ServiceStatusBadge status={voip.status} withIcon />}
          action={<ServiceStatusBadge status={voip.status} />}
        >
          <div className="flex flex-col gap-5 border-t border-white/10 pt-5 md:flex-row md:items-center md:justify-between md:gap-10">
            <div>
              <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {tierLabel(voip.tier)}
              </p>
              {voip.monthly_amount_cents != null && (
                <ServiceRateLine
                  monthlyCents={voip.monthly_amount_cents}
                  interval={voip.billing_interval}
                  billingMethod={voip.billing_method}
                  suffix={` for ${voipCoverageLabel({
                    tier: voip.tier,
                    numberCount: voip.number_count,
                    seatCount: voip.seat_count,
                  })}`}
                />
              )}
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/55 md:border-l md:border-white/10 md:pl-8">
              Your phone service is managed by McKee Security. To add numbers or
              seats, or to make other changes, call{" "}
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

      {cloud && (
        <PortalCard
          icon="cloud"
          tone="cloud_backup"
          title={SERVICE_TYPE_LABELS.cloud_backup}
          description="Camera footage stored securely off-site"
          status={<ServiceStatusBadge status={cloud.status} withIcon />}
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

      {(!monitoring || !voip || !cloud) && (
        <div className="space-y-3 pt-4">
          <div className="border-t border-dashed border-white/10 pt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
              Other McKee services
            </p>
            <p className="mt-1 text-sm text-white/40">
              These are not on your account. Call the office if you would like to add one.
            </p>
          </div>

          {!monitoring && (
            <PortalCard
              icon="shield"
              tone="muted"
              title={SERVICE_TYPE_LABELS.monitoring}
              description="Not on this account"
            >
              <p className="border-t border-white/10 pt-4 text-sm leading-relaxed text-white/45">
                No monitoring service is connected to this account. If you would
                like to protect your property with professional alarm monitoring,
                call{" "}
                <a
                  href="tel:+17054572156"
                  className="whitespace-nowrap font-bold text-white/70 hover:text-white"
                >
                  (705) 457-2156
                </a>
                .
              </p>
            </PortalCard>
          )}

          {!voip && (
            <PortalCard
              icon="voip"
              tone="muted"
              title={SERVICE_TYPE_LABELS.voip}
              description="Not on this account"
            >
              <p className="border-t border-white/10 pt-4 text-sm leading-relaxed text-white/45">
                No VoIP phone service is connected to this account. If you would
                like professional phone service for your home or business, call{" "}
                <a
                  href="tel:+17054572156"
                  className="whitespace-nowrap font-bold text-white/70 hover:text-white"
                >
                  (705) 457-2156
                </a>
                .
              </p>
            </PortalCard>
          )}

          {!cloud && (
            <PortalCard
              icon="cloud"
              tone="muted"
              title={SERVICE_TYPE_LABELS.cloud_backup}
              description="Not on this account yet"
            >
              <div className="space-y-4 border-t border-white/10 pt-4">
                <p className="max-w-3xl text-sm leading-relaxed text-white/45">
                  Camera Cloud Backup will keep a secure off-site copy of your
                  IP-camera footage if the recorder is damaged, stolen, or fails.
                  The service is still being prepared.
                </p>
                <CloudBackupInterest
                  initiallyInterested={cloudInterest != null}
                  email={email}
                  quiet
                />
              </div>
            </PortalCard>
          )}
        </div>
      )}
    </>
  );
}

function ClientSecurityPanel({
  profileId,
  lanvacCity,
  lanvacAccountCode,
  monitoring,
  showStation,
  canRefreshStation,
  stationState,
  stationZones,
  stationSignals,
  showCallerId,
  contacts,
  showDevices,
  devices,
}: {
  profileId: string;
  lanvacCity: string | null;
  lanvacAccountCode: string | null;
  monitoring: {
    id: string;
    status: "active" | "paused" | "cancelled" | "unpaid";
    tier: string;
    monthly_amount_cents: number | null;
    billing_interval: "monthly" | "annual";
    billing_method: "stripe" | "manual";
  } | null;
  showStation: boolean;
  canRefreshStation: boolean;
  stationState: {
    panelType: string;
    isDisabled: boolean;
    onTestUntil: string | null;
    lastSignalAt: string | null;
    lastSignalClass: ReturnType<typeof asLanvacSignalClass>;
    lastSyncedAt: string | null;
    lastError: string | null;
  } | null;
  stationZones: Array<{
    zoneNumber: number;
    description: string;
    zoneType: string;
    onTest: boolean;
    useCallList: boolean | null;
  }>;
  stationSignals: Array<{
    occurredAtText: string;
    signal: string;
    description: string;
    signalClass: NonNullable<ReturnType<typeof asLanvacSignalClass>>;
  }>;
  showCallerId: boolean;
  contacts: Array<{ id: string; phone: string; label: string; passcode: string | null }>;
  showDevices: boolean;
  devices: Array<{
    id: string;
    label: string;
    category: string;
    installed_on: string;
    lifetime_years: number;
  }>;
}) {
  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="border-b border-white/10 pb-8 pt-4 sm:pb-10 sm:pt-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <PortalCardIcon icon="shield" tone="monitoring" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
                  Your security system
                </h2>
                {monitoring && <ServiceStatusBadge status={monitoring.status} withIcon />}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">
                {monitoring
                  ? `${tierLabel(monitoring.tier)} · ${SERVICE_TYPE_LABELS.monitoring}`
                  : "Contacts and equipment on file"}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
                {monitoring
                  ? monitoringHeaderCopy(monitoring.tier)
                  : "There is no current monitoring plan on this account. Contacts and equipment from an earlier plan stay here so you can still review them."}
              </p>
            </div>
          </div>
          {monitoring?.status === "unpaid" && (
            <div className="shrink-0 sm:pt-1">
              {monitoring.billing_method === "stripe" ? (
                <PayNowButton serviceId={monitoring.id} label="Add your card and start services" />
              ) : (
                <Link
                  href="/user-dashboard"
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-(--primary-hover)"
                >
                  See how to pay
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      {showStation && (
        <PortalCard
          icon="shield"
          tone="monitoring"
          title="Zones & Signals"
          description="The zone list and recent signals the monitoring station keeps for this security system"
        >
          <div className="border-t border-white/10 pt-5">
            <LanvacStationReadout
              profileId={profileId}
              canRefresh={canRefreshStation}
              variant="client"
              writesLive={lanvacWritesLive(lanvacAccountCode)}
              state={stationState}
              zones={stationZones}
              signals={stationSignals}
              showEquipmentNote={showDevices && devices.length > 0}
            />
          </div>
        </PortalCard>
      )}

      {showCallerId && (
        <PortalCard
          id="alarm-contact-list"
          icon="phone"
          tone="monitoring"
          title="Alarm Contact List (Caller ID)"
          description="Who the monitoring station calls, in order, when your alarm goes off"
        >
          <div className="border-t border-white/10 pt-5">
            <p className="max-w-3xl text-sm leading-relaxed text-white/55">
              When your alarm goes off, the monitoring station works down this
              list from #1 to the last person. Each person has a passcode they
              give the station to confirm who they are. Add, edit, or remove
              people and save. McKee Security is notified automatically and
              updates the station.
            </p>
            <div className="mt-5">
              <CallerIdEditor variant="client" initialContacts={contacts} />
            </div>
            <div className="mt-6 border-t border-white/10 pt-5">
              <LanvacEmergencyReadout
                city={lanvacCity}
                numbers={lanvacEmergencyNumbers(lanvacCity)}
              />
            </div>
          </div>
        </PortalCard>
      )}

      {showDevices && devices.length > 0 && (
        <PortalCard
          id="equipment-maintenance"
          icon="wrench"
          tone="monitoring"
          title="Equipment Maintenance"
          description="Install dates and upcoming replacements for your system's hardware"
        >
          <div className="grid gap-3 border-t border-white/10 pt-5 md:grid-cols-2">
            {devices.map((device) => {
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
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-white/35">
                    {deviceCategoryLabel(device.category)}
                  </p>
                  <p className="mt-1.5 text-sm text-white/65">
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

function ClientAlertsPanel({
  unpaidServices,
  missingCallerId,
  cardSetupNeeded,
  stripePayables,
  outstandingPortFee,
  hasCardOnFile,
  expiredDevices,
  stationOnTest,
  stationOnTestUntil,
  showSecurityTab,
}: {
  unpaidServices: Array<{
    id: string;
    service_type: "monitoring" | "cloud_backup" | "voip";
    tier: string;
    billing_method: string;
    billing_interval: "monthly" | "annual";
    monthly_amount_cents: number | null;
    next_due_on: string | null;
  }>;
  missingCallerId: boolean;
  cardSetupNeeded: Array<{
    id: string;
    service_type: "monitoring" | "cloud_backup" | "voip";
    next_due_on: string | null;
  }>;
  stripePayables: Array<{
    id: string;
    service_type: "monitoring" | "cloud_backup" | "voip";
    tier: string;
    status: string;
    next_due_on: string | null;
  }>;
  outstandingPortFee: { serviceId: string; uncharged: number } | null;
  hasCardOnFile: boolean;
  expiredDevices: Array<{
    id: string;
    label: string;
    installed_on: string;
    lifetime_years: number;
  }>;
  stationOnTest: boolean;
  stationOnTestUntil: string | null;
  showSecurityTab: boolean;
}) {
  const clear =
    unpaidServices.length === 0 &&
    !missingCallerId &&
    cardSetupNeeded.length === 0 &&
    !outstandingPortFee &&
    expiredDevices.length === 0 &&
    !stationOnTest;

  if (clear) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-emerald-100">All clear</h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-200/90">
          Nothing on this account needs your attention right now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/50">
        Everything that needs attention on this account. Payment items also stay at the top of
        your Dashboard.
      </p>
      {unpaidServices
        .filter((service) => service.billing_method === "manual")
        .map((service) => (
          <ManualPaymentBanner
            key={service.id}
            serviceLabel={SERVICE_TYPE_LABELS[service.service_type]}
            monthlyCents={service.monthly_amount_cents}
            interval={service.billing_interval}
            dueOn={service.next_due_on}
          />
        ))}
      <PaymentSetupBanner
        services={stripePayables}
        portFee={outstandingPortFee}
        hasCardOnFile={hasCardOnFile}
      />
      {stationOnTest && (
        <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-sky-100">System is on test</h2>
          <p className="mt-3 text-sm leading-relaxed text-sky-100/90">
            The monitoring station will not dispatch on this system
            {stationOnTestUntil
              ? ` until ${new Date(stationOnTestUntil).toLocaleString("en-CA", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : ""}
            . End the test from the{" "}
            {showSecurityTab ? (
              <Link
                href="/user-dashboard?tab=security"
                prefetch={false}
                className="font-bold text-white underline decoration-white/30 underline-offset-4 hover:text-primary hover:decoration-primary"
              >
                Security tab
              </Link>
            ) : (
              "Dashboard"
            )}{" "}
            when the work is done.
          </p>
        </div>
      )}
      {missingCallerId && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-amber-100">Alarm contact list needed</h2>
          <p className="mt-3 text-sm leading-relaxed text-amber-200/90">
            Your monitoring plan is on this account, but the monitoring station does not have
            anyone to call yet.
          </p>
          <Link
            href="/user-dashboard?tab=security#alarm-contact-list"
            prefetch={false}
            className="mt-4 inline-flex cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-(--primary-hover)"
          >
            Add contacts
          </Link>
        </div>
      )}
      {expiredDevices.map((device) => {
        const expiry = deviceExpiryDate(device.installed_on, device.lifetime_years);
        return (
          <div
            key={device.id}
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-6"
          >
            <h2 className="text-lg font-bold text-amber-100">Device replacement due</h2>
            <p className="mt-3 text-sm leading-relaxed text-amber-200/90">
              {device.label} was due for replacement in{" "}
              {expiry.toLocaleDateString("en-CA", { year: "numeric", month: "long" })}. Call McKee
              Security at{" "}
              <a href="tel:+17054572156" className="font-bold text-white hover:text-primary">
                (705) 457-2156
              </a>{" "}
              to schedule it.
            </p>
            {showSecurityTab && (
              <Link
                href="/user-dashboard?tab=security#equipment-maintenance"
                prefetch={false}
                className="mt-4 inline-flex cursor-pointer text-sm font-bold text-white underline decoration-white/30 underline-offset-4 hover:text-primary hover:decoration-primary"
              >
                View equipment
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
