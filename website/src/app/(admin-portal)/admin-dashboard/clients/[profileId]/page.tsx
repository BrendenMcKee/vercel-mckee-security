import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAuthContext } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import {
  AdminClientDetail,
  type AdminClientTab,
  type CardPaymentEntry,
} from "@/components/admin-portal/admin-client-detail";
import type { AdminAccountMember } from "@/components/admin-portal/admin-account-people";
import type { CallerIdContact } from "@/components/portal/caller-id-editor";
import type { Tables } from "@/lib/portal/database.types";
import type {
  LanvacStationSignal,
  LanvacStationState,
  LanvacStationZone,
} from "@/components/portal/lanvac-station-readout";
import { asLanvacSignalClass } from "@/lib/portal/lanvac-signals";
import { lanvacWritesLive, parseNotifyList } from "@/lib/portal/lanvac-writes";
import { PendingTabLink } from "@/components/portal/pending-tab-link";
import { ClientMailPausedBanner } from "@/components/admin-portal/client-mail-paused-banner";
import { SignOutButton } from "@/components/portal/sign-out-button";
import { ScrollToHash } from "@/components/portal/scroll-to-hash";
import { hasCurrentMonitoring } from "@/lib/portal/service-labels";

type PortalClient = Awaited<ReturnType<typeof createPortalServerClient>>;

export const metadata: Metadata = {
  title: "Client Detail",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Client detail (PORTAL_PLAN.md 7.2): one page per client, tabbed like the
 * staff console. Account (profile, invite, disable/delete), Billing (R21
 * plans + rails), Security (station, on-test, zones, Historic, caller ID),
 * Devices. Reads run on the user-context client so admin RLS authorizes
 * them (R13). Signed-in clients get the layout wrong-door screen.
 */
export default async function AdminClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { profileId } = await params;
  const { tab } = await searchParams;

  // Pages render in parallel with the layout gate: signed-out visitors get
  // the layout's SignIn screen, so render nothing here instead of a 404.
  // Signed-in clients get the layout wrong-door screen.
  const { user } = await getAuthContext();
  if (!user) return null;

  if (!UUID_RE.test(profileId)) notFound();

  const supabase = await createPortalServerClient();
  const { data: client, error } = await supabase
    .from("profiles")
    .select("*, services(*), invitations(id, target_email, expires_at, used_at, created_at)")
    .eq("id", profileId)
    .eq("role", "client")
    .maybeSingle();

  if (error) {
    console.error("[portal] Admin client detail query failed:", error);
    throw new Error("Client detail failed to load.");
  }
  if (!client) notFound();

  const urlTab: AdminClientTab =
    tab === "billing" || tab === "security" || tab === "devices" || tab === "account"
      ? tab
      : "account";

  const [
    contactsCountResult,
    changesCountResult,
    devicesCountResult,
    zonesCountResult,
    stationPeekResult,
    siblingCountResult,
    membersResult,
    settingsResult,
    billingExtras,
    securityExtras,
    devicesExtras,
  ] = await Promise.all([
    supabase
      .from("caller_id_contacts")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId),
    supabase
      .from("caller_id_changes")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId),
    supabase
      .from("devices")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId),
    supabase
      .from("lanvac_zones")
      .select("zone_number", { count: "exact", head: true })
      .eq("profile_id", profileId),
    supabase
      .from("lanvac_account_state")
      .select("profile_id")
      .eq("profile_id", profileId)
      .maybeSingle(),
    urlTab === "account" && client.account_id
      ? supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("account_id", client.account_id)
      : Promise.resolve({ count: 1, error: null }),
    urlTab === "account" && client.account_id
      ? supabase
          .from("account_members")
          .select("id, email, role, user_id")
          .eq("account_id", client.account_id)
      : Promise.resolve({ data: [] as AdminAccountMember[], error: null }),
    supabase.from("portal_settings").select("client_mail_enabled").eq("id", 1).maybeSingle(),
    urlTab === "billing" ? loadBillingExtras(supabase, profileId) : Promise.resolve(null),
    urlTab === "security" ? loadSecurityExtras(supabase, profileId) : Promise.resolve(null),
    urlTab === "devices" ? loadDevicesExtras(supabase, profileId) : Promise.resolve(null),
  ]);

  const visibilityError =
    contactsCountResult.error ??
    changesCountResult.error ??
    devicesCountResult.error ??
    zonesCountResult.error ??
    stationPeekResult.error ??
    siblingCountResult.error ??
    membersResult.error;
  if (visibilityError) {
    console.error("[portal] Admin client detail tab visibility failed:", visibilityError);
    throw new Error("Client detail failed to load.");
  }
  if (billingExtras && !billingExtras.ok) {
    console.error("[portal] Admin client detail billing query failed:", billingExtras.error);
    throw new Error("Client detail failed to load.");
  }
  if (securityExtras && !securityExtras.ok) {
    console.error("[portal] Admin client detail security query failed:", securityExtras.error);
    throw new Error("Client detail failed to load.");
  }
  if (devicesExtras && !devicesExtras.ok) {
    console.error("[portal] Admin client detail devices query failed:", devicesExtras.error);
    throw new Error("Client detail failed to load.");
  }

  const showSecurityTab =
    hasCurrentMonitoring(client.services) ||
    Boolean(client.lanvac_account_code || client.lanvac_city) ||
    (contactsCountResult.count ?? 0) > 0 ||
    (changesCountResult.count ?? 0) > 0 ||
    (zonesCountResult.count ?? 0) > 0 ||
    stationPeekResult.data != null;
  const showDevicesTab =
    hasCurrentMonitoring(client.services) || (devicesCountResult.count ?? 0) > 0;
  const requestedTab = urlTab;
  const activeTab: AdminClientTab =
    requestedTab === "security" && !showSecurityTab
      ? "account"
      : requestedTab === "devices" && !showDevicesTab
        ? "account"
        : requestedTab;

  const clientTabs: Array<{ id: AdminClientTab; label: string; href: string }> = [
    { id: "account", label: "Account", href: `/admin-dashboard/clients/${profileId}` },
    { id: "billing", label: "Billing", href: `/admin-dashboard/clients/${profileId}?tab=billing` },
    ...(showSecurityTab
      ? [
          {
            id: "security" as const,
            label: "Security",
            href: `/admin-dashboard/clients/${profileId}?tab=security`,
          },
        ]
      : []),
    ...(showDevicesTab
      ? [
          {
            id: "devices" as const,
            label: "Devices",
            href: `/admin-dashboard/clients/${profileId}?tab=devices`,
          },
        ]
      : []),
  ];

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/admin-dashboard?tab=clients"
            className="text-sm font-bold uppercase tracking-widest text-amber-300 hover:text-white"
          >
            &larr; All Clients
          </Link>
          <h1 className="mt-2 break-words text-2xl font-bold text-white sm:text-4xl">
            {client.first_name} {client.last_name}
          </h1>
        </div>
        <SignOutButton />
      </div>

      {settingsResult.data?.client_mail_enabled !== true && <ClientMailPausedBanner />}

      <Suspense fallback={null}>
        <ScrollToHash />
      </Suspense>

      <nav
        className="no-scrollbar -mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-white/10 px-4 sm:mx-0 sm:mt-8 sm:gap-2 sm:px-0"
        aria-label="Client sections"
      >
        {clientTabs.map((item) => (
          <PendingTabLink
            key={item.id}
            href={item.href}
            active={activeTab === item.id}
            prefetch={item.id === "security" ? false : undefined}
          >
            {item.label}
          </PendingTabLink>
        ))}
      </nav>

      <div className="mt-6 sm:mt-8">
        <AdminClientDetail
          tab={activeTab}
          client={client}
          siblingSiteCount={Math.max(0, (siblingCountResult.count ?? 1) - 1)}
          members={(membersResult.data ?? []) as AdminAccountMember[]}
          callerIdContacts={securityExtras?.ok ? securityExtras.contacts : []}
          callerIdChanges={securityExtras?.ok ? securityExtras.changes : []}
          devices={devicesExtras?.ok ? devicesExtras.devices : []}
          manualPayments={billingExtras?.ok ? billingExtras.manualPayments : []}
          cloudBackupInterest={billingExtras?.ok ? billingExtras.cloudBackupInterest : null}
          stationState={securityExtras?.ok ? securityExtras.stationState : null}
          writesLive={lanvacWritesLive(client.lanvac_account_code)}
          stationZones={securityExtras?.ok ? securityExtras.stationZones : []}
          stationSignals={securityExtras?.ok ? securityExtras.stationSignals : []}
          cardPayments={billingExtras?.ok ? billingExtras.cardPayments : []}
        />
      </div>
    </section>
  );
}

async function loadBillingExtras(supabase: PortalClient, profileId: string) {
  const [paymentsResult, cardPaymentsResult, cloudInterestResult] = await Promise.all([
    supabase
      .from("manual_payments")
      .select("*")
      .eq("profile_id", profileId)
      .order("paid_on", { ascending: false })
      .limit(24),
    supabase
      .from("billing_events")
      .select("id, service_id, created_at, payload")
      .eq("profile_id", profileId)
      .eq("type", "invoice.paid")
      .order("created_at", { ascending: false })
      .limit(24),
    supabase.from("cloud_backup_interest").select("*").eq("profile_id", profileId).maybeSingle(),
  ]);
  const error = paymentsResult.error ?? cardPaymentsResult.error ?? cloudInterestResult.error;
  if (error) return { ok: false as const, error };
  return {
    ok: true as const,
    manualPayments: paymentsResult.data ?? [],
    cloudBackupInterest: cloudInterestResult.data,
    cardPayments: (cardPaymentsResult.data ?? []).map((event): CardPaymentEntry => {
      const payload = event.payload as { amount_paid?: number } | null;
      return {
        id: event.id,
        serviceId: event.service_id,
        paidOn: event.created_at.slice(0, 10),
        amountCents: typeof payload?.amount_paid === "number" ? payload.amount_paid : null,
      };
    }),
  };
}

async function loadDevicesExtras(supabase: PortalClient, profileId: string) {
  const devicesResult = await supabase
    .from("devices")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at");
  if (devicesResult.error) return { ok: false as const, error: devicesResult.error };
  return { ok: true as const, devices: devicesResult.data ?? [] };
}

async function loadSecurityExtras(supabase: PortalClient, profileId: string) {
  const [
    contactsResult,
    changesResult,
    stationStateResult,
    stationZonesResult,
    stationSignalsResult,
    stationWriteResult,
  ] = await Promise.all([
    supabase
      .from("caller_id_contacts")
      .select("id, phone, label, passcode, sort_order")
      .eq("profile_id", profileId)
      .order("sort_order"),
    supabase
      .from("caller_id_changes")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("lanvac_account_state")
      .select(
        "panel_type, is_disabled, on_test_until, last_signal_at, last_signal_class, last_synced_at, last_error",
      )
      .eq("profile_id", profileId)
      .maybeSingle(),
    supabase
      .from("lanvac_zones")
      .select("zone_number, description, zone_type, on_test, use_call_list")
      .eq("profile_id", profileId)
      .order("zone_number"),
    supabase
      .from("lanvac_signals")
      .select("occurred_at_text, signal, description, signal_class")
      .eq("profile_id", profileId)
      .order("sort_index"),
    supabase
      .from("lanvac_zone_write")
      .select("zone_number, delay, notify_list, signal_code, restore_code")
      .eq("profile_id", profileId),
  ]);
  const error =
    contactsResult.error ??
    changesResult.error ??
    stationStateResult.error ??
    stationZonesResult.error ??
    stationSignalsResult.error ??
    stationWriteResult.error;
  if (error) return { ok: false as const, error };

  const stationState: LanvacStationState | null = stationStateResult.data
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

  const stationZones: LanvacStationZone[] = (stationZonesResult.data ?? []).map((zone) => {
    const write = (stationWriteResult.data ?? []).find((row) => row.zone_number === zone.zone_number);
    return {
      zoneNumber: zone.zone_number,
      description: zone.description,
      zoneType: zone.zone_type,
      onTest: zone.on_test,
      useCallList: zone.use_call_list,
      write: write
        ? {
            delay: write.delay,
            notifyList: parseNotifyList(write.notify_list),
            signalCode: write.signal_code,
            restoreCode: write.restore_code,
          }
        : null,
    };
  });

  const stationSignals: LanvacStationSignal[] = (stationSignalsResult.data ?? []).map((row) => ({
    occurredAtText: row.occurred_at_text,
    signal: row.signal,
    description: row.description,
    signalClass: asLanvacSignalClass(row.signal_class) ?? "unknown",
  }));

  return {
    ok: true as const,
    contacts: (contactsResult.data ?? []) as CallerIdContact[],
    changes: (changesResult.data ?? []) as Tables<"caller_id_changes">[],
    stationState,
    stationZones,
    stationSignals,
  };
}
