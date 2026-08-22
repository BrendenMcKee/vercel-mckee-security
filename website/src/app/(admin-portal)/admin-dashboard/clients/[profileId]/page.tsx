import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { AdminClientDetail } from "@/components/admin-portal/admin-client-detail";
import { asLanvacSignalClass } from "@/lib/portal/lanvac-signals";
import { lanvacWritesLive, parseNotifyList } from "@/lib/portal/lanvac-writes";
import { ClientMailPausedBanner } from "@/components/admin-portal/client-mail-paused-banner";
import { SignOutButton } from "@/components/portal/sign-out-button";

export const metadata: Metadata = {
  title: "Client Detail",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Client detail (PORTAL_PLAN.md 7.2): one page per client with profile
 * editing, service management (R21: all plan changes live here, on the admin
 * side only), invitation state, caller ID list + audit history (Phase 4,
 * R23/R24), device maintenance dates, and billing (Phase 5: rails, record
 * payment, ledger). Reads run on the user-context client so admin RLS
 * authorizes them (R13); the layout gate 404s non-admins.
 */
export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  // Pages render in parallel with the layout gate: signed-out visitors get
  // the layout's SignIn screen, so render nothing here instead of a 404.
  // Signed-in non-admins fall through; RLS returns no row and they 404,
  // matching the layout's neutral not-found response.
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

  const [
    contactsResult,
    changesResult,
    devicesResult,
    paymentsResult,
    cardPaymentsResult,
    cloudInterestResult,
    settingsResult,
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
        .from("devices")
        .select("*")
        .eq("profile_id", profileId)
        .order("created_at"),
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
      supabase
        .from("cloud_backup_interest")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle(),
      supabase.from("portal_settings").select("client_mail_enabled").eq("id", 1).maybeSingle(),
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

  const subError =
    contactsResult.error ??
    changesResult.error ??
    devicesResult.error ??
    paymentsResult.error ??
    cardPaymentsResult.error ??
    cloudInterestResult.error ??
    stationStateResult.error ??
    stationZonesResult.error ??
    stationSignalsResult.error ??
    stationWriteResult.error;
  if (subError) {
    console.error("[portal] Admin client detail sub-queries failed:", subError);
    throw new Error("Client detail failed to load.");
  }

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

      <div className="mt-6 sm:mt-10">
        <AdminClientDetail
          client={client}
          callerIdContacts={contactsResult.data ?? []}
          callerIdChanges={changesResult.data ?? []}
          devices={devicesResult.data ?? []}
          manualPayments={paymentsResult.data ?? []}
          cloudBackupInterest={cloudInterestResult.data}
          stationState={
            stationStateResult.data
              ? {
                  panelType: stationStateResult.data.panel_type,
                  isDisabled: stationStateResult.data.is_disabled,
                  onTestUntil: stationStateResult.data.on_test_until,
                  lastSignalAt: stationStateResult.data.last_signal_at,
                  lastSignalClass: asLanvacSignalClass(
                    stationStateResult.data.last_signal_class,
                  ),
                  lastSyncedAt: stationStateResult.data.last_synced_at,
                  lastError: stationStateResult.data.last_error,
                }
              : null
          }
          writesLive={lanvacWritesLive(client.lanvac_account_code)}
          stationZones={(stationZonesResult.data ?? []).map((zone) => {
            const write = (stationWriteResult.data ?? []).find(
              (row) => row.zone_number === zone.zone_number,
            );
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
          })}
          stationSignals={(stationSignalsResult.data ?? []).map((row) => ({
            occurredAtText: row.occurred_at_text,
            signal: row.signal,
            description: row.description,
            signalClass: asLanvacSignalClass(row.signal_class) ?? "unknown",
          }))}
          cardPayments={(cardPaymentsResult.data ?? []).map((event) => {
            const payload = event.payload as { amount_paid?: number } | null;
            return {
              id: event.id,
              serviceId: event.service_id,
              paidOn: event.created_at.slice(0, 10),
              amountCents: typeof payload?.amount_paid === "number" ? payload.amount_paid : null,
            };
          })}
        />
      </div>
    </section>
  );
}
