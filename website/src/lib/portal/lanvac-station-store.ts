import "server-only";

import { getPortalAdminClient, isPortalAdminConfigured } from "@/lib/portal/supabase/admin";
import type { LanvacAccountRead, LanvacHistoricRead, LanvacZoneRead } from "@/lib/portal/lanvac-api";
import {
  classifyLanvacSignal,
  parseLanvacHistoricDate,
} from "@/lib/portal/lanvac-signals";
import {
  LANVAC_ON_TEST_PULL_GRACE_MS,
  applyOnTestPullGrace,
  recentLanvacZoneTestIntent,
} from "@/lib/portal/lanvac-writes";

/**
 * Service-role station cache writes. Not a server action. Call only from
 * other server modules after an auth check.
 */

const USER_PULL_ERROR = "Could not refresh the station.";

function publicPullError(error: string): string {
  if (
    error === "The station connection is not configured." ||
    error === "Could not reach the monitoring station."
  ) {
    return error;
  }
  return USER_PULL_ERROR;
}

export async function clearLanvacStationCache(input: {
  profileId: string;
  fromCode: string | null;
  toCode: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
}): Promise<void> {
  if (!isPortalAdminConfigured()) return;
  const admin = getPortalAdminClient();
  const [zones, signals, state] = await Promise.all([
    admin.from("lanvac_zones").delete().eq("profile_id", input.profileId),
    admin.from("lanvac_signals").delete().eq("profile_id", input.profileId),
    admin.from("lanvac_account_state").delete().eq("profile_id", input.profileId),
  ]);
  if (zones.error || signals.error || state.error) {
    console.error("[portal] station cache clear failed:", zones.error ?? signals.error ?? state.error);
  }
  await admin.from("lanvac_station_events").insert({
    profile_id: input.profileId,
    lanvac_account_code: input.toCode,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    event_type: "code_change",
    detail: { from: input.fromCode, to: input.toCode },
  });
}

export type PersistLanvacPullInput = {
  profileId: string;
  code: string;
  actorUserId: string | null;
  actorEmail: string | null;
  syncedAt: string;
  account: { ok: true; data: LanvacAccountRead } | { ok: false; error: string };
  zones: { ok: true; data: LanvacZoneRead[] } | { ok: false; error: string };
  historic: { ok: true; data: LanvacHistoricRead[] } | { ok: false; error: string };
};

export async function persistLanvacPull(
  input: PersistLanvacPullInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPortalAdminConfigured()) {
    return { ok: false, error: "The station cache is not configured." };
  }

  const admin = getPortalAdminClient();
  const failed = [input.account, input.zones, input.historic].filter((part) => !part.ok);
  const firstError =
    failed.map((part) => (part.ok ? null : part.error)).filter(Boolean)[0] ?? USER_PULL_ERROR;
  const publicError = publicPullError(firstError);
  if (failed.length > 0) {
    console.error("[portal] station pull partial/fail:", firstError);
  }
  const firstHistoric = input.historic.ok ? input.historic.data[0] ?? null : null;
  const firstClass = firstHistoric ? classifyLanvacSignal(firstHistoric) : null;
  const firstWhen = firstHistoric ? parseLanvacHistoricDate(firstHistoric.date) : null;

  if (failed.length === 3) {
    const { error } = await admin.from("lanvac_account_state").upsert({
      profile_id: input.profileId,
      last_error: publicError,
    });
    if (error) {
      console.error("[portal] station pull_failed state write:", error);
      return { ok: false, error: "Could not save the station refresh." };
    }
    await admin.from("lanvac_station_events").insert({
      profile_id: input.profileId,
      lanvac_account_code: input.code,
      actor_user_id: input.actorUserId,
      actor_email: input.actorEmail,
      event_type: "pull_failed",
      detail: { error: publicError },
    });
    return { ok: false, error: publicError };
  }

  const statePatch: {
    profile_id: string;
    last_error: string | null;
    last_synced_at?: string;
    panel_type?: string;
    is_disabled?: boolean;
    last_signal_at?: string | null;
    last_signal_class?: string | null;
    last_signal_description?: string | null;
  } = {
    profile_id: input.profileId,
    last_error: failed.length > 0 ? publicError : null,
    last_synced_at: input.syncedAt,
  };
  if (input.account.ok) {
    statePatch.panel_type = input.account.data.panelType;
    statePatch.is_disabled = input.account.data.isDisabled;
  }
  if (input.historic.ok) {
    statePatch.last_signal_at = firstWhen?.iso ?? null;
    statePatch.last_signal_class = firstClass;
    statePatch.last_signal_description = firstHistoric?.description?.slice(0, 400) ?? null;
  }

  const { error: stateError } = await admin.from("lanvac_account_state").upsert(statePatch);
  if (stateError) {
    console.error("[portal] station state write failed:", stateError);
    return { ok: false, error: "Could not save the station refresh." };
  }

  if (input.zones.ok) {
    const incomingNumbers = new Set(input.zones.data.map((zone) => zone.zoneNumber));
    const { data: current, error: currentError } = await admin
      .from("lanvac_zones")
      .select("zone_number")
      .eq("profile_id", input.profileId);
    if (currentError) {
      console.error("[portal] station zone read failed:", currentError);
      return { ok: false, error: "Could not save the station zones." };
    }
    const staleNumbers = (current ?? [])
      .map((row) => row.zone_number)
      .filter((number) => !incomingNumbers.has(number));
    if (staleNumbers.length > 0) {
      const { error: deleteError } = await admin
        .from("lanvac_zones")
        .delete()
        .eq("profile_id", input.profileId)
        .in("zone_number", staleNumbers);
      if (deleteError) {
        console.error("[portal] station zone delete failed:", deleteError);
        return { ok: false, error: "Could not save the station zones." };
      }
    }
    if (input.zones.data.length > 0) {
      const graceCutoff = new Date(Date.now() - LANVAC_ON_TEST_PULL_GRACE_MS).toISOString();
      const { data: graceEvents, error: graceError } = await admin
        .from("lanvac_station_events")
        .select("created_at, event_type, detail")
        .eq("profile_id", input.profileId)
        .in("event_type", ["on_test", "off_test"])
        .gte("created_at", graceCutoff);
      if (graceError) {
        console.error("[portal] station on-test pull grace failed:", graceError);
      }
      const intents = (graceEvents ?? []).map((row) => {
        const detail =
          row.detail && typeof row.detail === "object" && !Array.isArray(row.detail)
            ? (row.detail as { scope?: unknown; zoneNumber?: unknown })
            : {};
        return {
          createdAt: row.created_at,
          eventType: row.event_type,
          scope: typeof detail.scope === "string" ? detail.scope : null,
          zoneNumber: typeof detail.zoneNumber === "number" ? detail.zoneNumber : null,
        };
      });
      const { error: upsertError } = await admin.from("lanvac_zones").upsert(
        input.zones.data.map((zone) => ({
          profile_id: input.profileId,
          zone_number: zone.zoneNumber,
          description: zone.description,
          zone_type: zone.zoneType,
          on_test: applyOnTestPullGrace(
            zone.onTest,
            recentLanvacZoneTestIntent(intents, zone.zoneNumber),
          ),
          last_synced_at: input.syncedAt,
        })),
        { onConflict: "profile_id,zone_number" },
      );
      if (upsertError) {
        console.error("[portal] station zone upsert failed:", upsertError);
        return { ok: false, error: "Could not save the station zones." };
      }
    }
  }

  if (input.historic.ok) {
    const { error: wipeError } = await admin
      .from("lanvac_signals")
      .delete()
      .eq("profile_id", input.profileId);
    if (wipeError) {
      console.error("[portal] station signal wipe failed:", wipeError);
      return { ok: false, error: "Could not save the station signals." };
    }
    if (input.historic.data.length > 0) {
      const { error: insertError } = await admin.from("lanvac_signals").insert(
        input.historic.data.map((row, index) => {
          const when = parseLanvacHistoricDate(row.date);
          return {
            profile_id: input.profileId,
            occurred_at: when.iso,
            occurred_at_text: when.display,
            signal: row.signal,
            description: row.description,
            signal_class: classifyLanvacSignal(row),
            sort_index: index,
            last_synced_at: input.syncedAt,
          };
        }),
      );
      if (insertError) {
        console.error("[portal] station signal insert failed:", insertError);
        return { ok: false, error: "Could not save the station signals." };
      }
    }
  }

  const { error: eventError } = await admin.from("lanvac_station_events").insert({
    profile_id: input.profileId,
    lanvac_account_code: input.code,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    event_type: failed.length > 0 ? "pull_failed" : "pull",
    detail: {
      accountOk: input.account.ok,
      zoneCount: input.zones.ok ? input.zones.data.length : null,
      historicCount: input.historic.ok ? input.historic.data.length : null,
    },
  });
  if (eventError) {
    console.error("[portal] station event write failed:", eventError);
  }

  return failed.length > 0 ? { ok: false, error: publicError } : { ok: true };
}

export async function persistLanvacZoneCache(input: {
  profileId: string;
  code: string;
  actorUserId: string | null;
  actorEmail: string | null;
  zoneNumber: number;
  description: string;
  zoneType: string;
  useCallList: boolean;
  delay: number;
  notifyList: string[];
  signalCode: string | null;
  restoreCode: string | null;
  reason: string;
  action: "create" | "update";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPortalAdminConfigured()) {
    return { ok: false, error: "The station cache is not configured." };
  }
  const admin = getPortalAdminClient();
  const syncedAt = new Date().toISOString();
  const { error: zoneError } = await admin.from("lanvac_zones").upsert(
    {
      profile_id: input.profileId,
      zone_number: input.zoneNumber,
      description: input.description,
      zone_type: input.zoneType,
      use_call_list: input.useCallList,
      last_synced_at: syncedAt,
    },
    { onConflict: "profile_id,zone_number" },
  );
  if (zoneError) {
    console.error("[portal] station zone write cache failed:", zoneError);
    return { ok: false, error: "Could not save the station zone." };
  }
  const { error: writeError } = await admin.from("lanvac_zone_write").upsert({
    profile_id: input.profileId,
    zone_number: input.zoneNumber,
    delay: input.delay,
    notify_list: input.notifyList,
    signal_code: input.signalCode,
    restore_code: input.restoreCode,
  });
  if (writeError) {
    console.error("[portal] station zone write fields failed:", writeError);
    return { ok: false, error: "Could not save the station zone." };
  }
  await admin.from("lanvac_station_events").insert({
    profile_id: input.profileId,
    lanvac_account_code: input.code,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    event_type: "zone_write",
    detail: {
      action: input.action,
      zoneNumber: input.zoneNumber,
      description: input.description,
      zoneType: input.zoneType,
      reason: input.reason,
    },
  });
  return { ok: true };
}

export async function persistLanvacZoneDelete(input: {
  profileId: string;
  code: string;
  actorUserId: string | null;
  actorEmail: string | null;
  zoneNumber: number;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPortalAdminConfigured()) {
    return { ok: false, error: "The station cache is not configured." };
  }
  const admin = getPortalAdminClient();
  const { error } = await admin
    .from("lanvac_zones")
    .delete()
    .eq("profile_id", input.profileId)
    .eq("zone_number", input.zoneNumber);
  if (error) {
    console.error("[portal] station zone delete cache failed:", error);
    return { ok: false, error: "Could not save the station zone." };
  }
  await admin.from("lanvac_station_events").insert({
    profile_id: input.profileId,
    lanvac_account_code: input.code,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    event_type: "zone_write",
    detail: { action: "delete", zoneNumber: input.zoneNumber, reason: input.reason },
  });
  return { ok: true };
}

export async function persistLanvacOnTest(input: {
  profileId: string;
  code: string;
  actorUserId: string | null;
  actorEmail: string | null;
  scope: "account" | "zone";
  zoneNumber: number | null;
  minutes: number | null;
  onTest: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPortalAdminConfigured()) {
    return { ok: false, error: "The station cache is not configured." };
  }
  const admin = getPortalAdminClient();
  if (input.scope === "account") {
    const { error } = await admin.from("lanvac_account_state").upsert({
      profile_id: input.profileId,
      on_test_until: input.onTest && input.minutes
        ? new Date(Date.now() + input.minutes * 60_000).toISOString()
        : null,
    });
    if (error) {
      console.error("[portal] station account on-test cache failed:", error);
      return { ok: false, error: "Could not save the on-test state." };
    }
  } else if (input.zoneNumber != null) {
    const { error } = await admin
      .from("lanvac_zones")
      .update({ on_test: input.onTest })
      .eq("profile_id", input.profileId)
      .eq("zone_number", input.zoneNumber);
    if (error) {
      console.error("[portal] station zone on-test cache failed:", error);
      return { ok: false, error: "Could not save the on-test state." };
    }
  }
  await admin.from("lanvac_station_events").insert({
    profile_id: input.profileId,
    lanvac_account_code: input.code,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    event_type: input.onTest ? "on_test" : "off_test",
    detail: {
      scope: input.scope,
      zoneNumber: input.zoneNumber,
      minutes: input.minutes,
    },
  });
  return { ok: true };
}
