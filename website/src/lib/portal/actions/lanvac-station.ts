"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  SESSION_ERROR_MESSAGE,
  tryRequireAdmin,
  tryRequireUser,
} from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { getPortalAdminClient, isPortalAdminConfigured } from "@/lib/portal/supabase/admin";
import { hasCurrentMonitoring } from "@/lib/portal/service-labels";
import {
  createLanvacZone,
  deleteLanvacZone,
  fetchLanvacAccount,
  fetchLanvacHistoric,
  fetchLanvacHistoricPages,
  fetchLanvacZones,
  LANVAC_HISTORIC_MAX_PAGES,
  LANVAC_HISTORIC_PAGE_SIZE,
  putLanvacAccountOffTest,
  putLanvacAccountOnTest,
  updateLanvacZone,
} from "@/lib/portal/lanvac-api";
import {
  persistLanvacHistoricAppend,
  persistLanvacOnTest,
  persistLanvacPull,
  persistLanvacZoneCache,
  persistLanvacZoneDelete,
} from "@/lib/portal/lanvac-station-store";
import {
  LANVAC_CLIENT_TEST_COOLDOWN_MS,
  LANVAC_ZONE_DESCRIPTION_MAX,
  MCKEE_ZONE_WRITE_DEFAULTS,
  STATION_WRITES_NOT_LIVE,
  lanvacWritesLive,
  mapZoneTypeToWrite,
  zoneOccupiedMessage,
  zoneWriteReason,
} from "@/lib/portal/lanvac-writes";
import {
  sendStationOnTestAdminAlert,
  sendStationZoneWriteAdminAlert,
} from "@/lib/portal/emails";

const profileIdSchema = z.string().uuid();

const PULL_COOLDOWN_MS = 8000;

export type RefreshLanvacStationResult =
  | { ok: true; pulledAt: string }
  | { ok: false; error: string; stale?: boolean };

type StationActor = {
  role: "admin" | "client";
  userId: string;
  email: string | null;
};

async function requireStationAccess(
  profileId: string,
): Promise<
  | { ok: true; actor: StationActor; code: string }
  | { ok: false; error: string }
> {
  const parsed = profileIdSchema.safeParse(profileId);
  if (!parsed.success) return { ok: false, error: "That site could not be found." };

  const admin = await tryRequireAdmin();
  const user = admin ? null : await tryRequireUser();
  if (!admin && !user) return { ok: false, error: SESSION_ERROR_MESSAGE };

  if (user && user.profile.id !== parsed.data) {
    return { ok: false, error: "You cannot open another site's station." };
  }

  const supabase = await createPortalServerClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, lanvac_account_code")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!target || (admin && target.role !== "client")) {
    return { ok: false, error: "Client not found." };
  }

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("service_type, status")
    .eq("profile_id", parsed.data);
  if (servicesError) {
    console.error("[portal] station access services failed:", servicesError);
    return { ok: false, error: "Could not load this site's monitoring plan." };
  }
  if (!hasCurrentMonitoring(services ?? [])) {
    return { ok: false, error: "Station data is only available on a current monitoring plan." };
  }
  if (!target.lanvac_account_code) {
    return { ok: false, error: "This site does not have a Lanvac account number yet." };
  }

  return {
    ok: true,
    actor: admin
      ? { role: "admin", userId: admin.user.id, email: admin.user.email }
      : { role: "client", userId: user!.user.id, email: user!.user.email },
    code: target.lanvac_account_code,
  };
}

export async function refreshLanvacStationAction(input: {
  profileId: string;
}): Promise<RefreshLanvacStationResult> {
  const access = await requireStationAccess(input.profileId);
  if (!access.ok) return { ok: false, error: access.error };
  if (!isPortalAdminConfigured()) {
    return { ok: false, error: "The station cache is not configured." };
  }

  const admin = getPortalAdminClient();
  const [{ data: existing }, { count: signalCount }] = await Promise.all([
    admin
      .from("lanvac_account_state")
      .select("last_synced_at, last_error")
      .eq("profile_id", input.profileId)
      .maybeSingle(),
    admin
      .from("lanvac_signals")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", input.profileId),
  ]);
  const historicPages = Math.min(
    LANVAC_HISTORIC_MAX_PAGES,
    Math.max(1, Math.ceil((signalCount ?? 0) / LANVAC_HISTORIC_PAGE_SIZE)),
  );

  if (existing?.last_synced_at) {
    const age = Date.now() - new Date(existing.last_synced_at).getTime();
    if (age >= 0 && age < PULL_COOLDOWN_MS) {
      if (existing.last_error) {
        return { ok: false, error: existing.last_error, stale: true };
      }
      return { ok: true, pulledAt: existing.last_synced_at };
    }
  }

  const claimedAt = new Date().toISOString();
  const { error: claimError } = await admin.from("lanvac_account_state").upsert({
    profile_id: input.profileId,
    last_synced_at: claimedAt,
  });
  if (claimError) {
    console.error("[portal] station pull claim failed:", claimError);
  }

  const [account, zones, historic] = await Promise.all([
    fetchLanvacAccount(access.code),
    fetchLanvacZones(access.code),
    fetchLanvacHistoricPages(access.code, historicPages),
  ]);

  const syncedAt = new Date().toISOString();
  const persisted = await persistLanvacPull({
    profileId: input.profileId,
    code: access.code,
    actorUserId: access.actor.userId,
    actorEmail: access.actor.email,
    syncedAt,
    account,
    zones,
    historic,
  });

  revalidatePath("/admin-dashboard", "layout");
  revalidatePath("/user-dashboard", "layout");

  if (!persisted.ok) {
    return {
      ok: false,
      error: persisted.error,
      stale: Boolean(existing?.last_synced_at) || account.ok || zones.ok || historic.ok,
    };
  }

  return { ok: true, pulledAt: syncedAt };
}

export async function loadMoreLanvacHistoricAction(input: {
  profileId: string;
}): Promise<{ ok: true; added: number; hasMore: boolean } | { ok: false; error: string }> {
  const parsed = profileIdSchema.safeParse(input.profileId);
  if (!parsed.success) return { ok: false, error: "That site could not be found." };
  const access = await requireStationAccess(parsed.data);
  if (!access.ok) return { ok: false, error: access.error };
  if (!isPortalAdminConfigured()) {
    return { ok: false, error: "The station cache is not configured." };
  }

  const admin = getPortalAdminClient();
  const { count, error: countError } = await admin
    .from("lanvac_signals")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", parsed.data);
  if (countError) {
    console.error("[portal] station historic count failed:", countError);
    return { ok: false, error: "Could not load older signals." };
  }

  const nextPage = Math.floor((count ?? 0) / LANVAC_HISTORIC_PAGE_SIZE) + 1;
  if (nextPage > LANVAC_HISTORIC_MAX_PAGES) return { ok: true, added: 0, hasMore: false };

  const historic = await fetchLanvacHistoric(access.code, { currentPage: nextPage });
  if (!historic.ok) return { ok: false, error: historic.error };

  const persisted = await persistLanvacHistoricAppend({
    profileId: parsed.data,
    rows: historic.data,
    syncedAt: new Date().toISOString(),
  });
  if (!persisted.ok) return persisted;

  revalidateStation();
  return {
    ok: true,
    added: persisted.added,
    hasMore:
      historic.data.length >= LANVAC_HISTORIC_PAGE_SIZE &&
      nextPage < LANVAC_HISTORIC_MAX_PAGES,
  };
}

type StationActionResult = { ok: true } | { ok: false; error: string };

const WRITE_TYPE_DISPLAY: Record<string, string> = {
  FIR: "FIRE",
  BUR: "BURGLAR",
  LOW: "LOW TEMPERATURE",
};

function revalidateStation() {
  revalidatePath("/admin-dashboard", "layout");
  revalidatePath("/user-dashboard", "layout");
}

async function requireWriteAccess(
  profileId: string,
  who: "admin" | "any",
): Promise<
  | { ok: true; actor: StationActor; code: string }
  | { ok: false; error: string }
> {
  const access = await requireStationAccess(profileId);
  if (!access.ok) return access;
  if (who === "admin" && access.actor.role !== "admin") {
    return { ok: false, error: "Only staff can change zones." };
  }
  if (!lanvacWritesLive(access.code)) {
    return { ok: false, error: STATION_WRITES_NOT_LIVE };
  }
  return access;
}

async function loadClientName(profileId: string): Promise<{
  name: string;
  email: string | null;
}> {
  const admin = getPortalAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", profileId)
    .maybeSingle();
  return {
    name: data ? `${data.first_name} ${data.last_name}`.trim() : "Client",
    email: data?.email ?? null,
  };
}

const zoneWriteSchema = z.object({
  profileId: z.string().uuid(),
  zoneNumber: z.number().int().min(1).max(999),
  description: z.string().trim().min(1).max(LANVAC_ZONE_DESCRIPTION_MAX),
  zoneType: z.string().trim().min(1).max(80),
  mode: z.enum(["create", "update"]),
});

export async function upsertLanvacZoneAction(input: z.infer<typeof zoneWriteSchema>): Promise<StationActionResult> {
  const parsed = zoneWriteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the zone details and try again." };
  const access = await requireWriteAccess(parsed.data.profileId, "admin");
  if (!access.ok) return access;

  const mapped = mapZoneTypeToWrite(parsed.data.zoneType);
  if (!mapped.ok) return mapped;

  const payload = {
    zoneNumber: parsed.data.zoneNumber,
    description: parsed.data.description,
    zoneType: mapped.code,
    useCallList: MCKEE_ZONE_WRITE_DEFAULTS.useCallList,
    delay: MCKEE_ZONE_WRITE_DEFAULTS.delay,
    emailsAndPhoneNumbers: [...MCKEE_ZONE_WRITE_DEFAULTS.emailsAndPhoneNumbers],
  };

  const adminClient = getPortalAdminClient();
  const existing = await adminClient
    .from("lanvac_zones")
    .select("zone_number, description")
    .eq("profile_id", parsed.data.profileId)
    .eq("zone_number", parsed.data.zoneNumber)
    .maybeSingle();
  if (parsed.data.mode === "create" && existing.data) {
    return {
      ok: false,
      error: zoneOccupiedMessage(parsed.data.zoneNumber, existing.data.description),
    };
  }
  if (parsed.data.mode === "update" && !existing.data) {
    return { ok: false, error: "That zone is not on file." };
  }
  const action = parsed.data.mode;
  const reason = zoneWriteReason(action, parsed.data.zoneNumber, parsed.data.description);
  const written =
    action === "create"
      ? await createLanvacZone(access.code, payload)
      : await updateLanvacZone(access.code, payload);
  if (!written.ok) return { ok: false, error: written.error };

  const persisted = await persistLanvacZoneCache({
    profileId: parsed.data.profileId,
    code: access.code,
    actorUserId: access.actor.userId,
    actorEmail: access.actor.email,
    zoneNumber: parsed.data.zoneNumber,
    description: parsed.data.description,
    zoneType: WRITE_TYPE_DISPLAY[mapped.code] ?? mapped.code,
    useCallList: payload.useCallList,
    delay: payload.delay,
    notifyList: payload.emailsAndPhoneNumbers,
    signalCode: null,
    restoreCode: null,
    reason,
    action,
  });
  if (!persisted.ok) return persisted;

  const client = await loadClientName(parsed.data.profileId);
  await sendStationZoneWriteAdminAlert({
    clientName: client.name,
    clientEmail: client.email,
    profileId: parsed.data.profileId,
    changedBy: access.actor.email ?? "staff",
    action,
    zoneNumber: parsed.data.zoneNumber,
    description: parsed.data.description,
    zoneType: WRITE_TYPE_DISPLAY[mapped.code] ?? mapped.code,
    reason,
  });
  revalidateStation();
  return { ok: true };
}

export async function deleteLanvacZoneAction(input: {
  profileId: string;
  zoneNumber: number;
}): Promise<StationActionResult> {
  const parsed = z
    .object({
      profileId: z.string().uuid(),
      zoneNumber: z.number().int().min(1).max(999),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the zone number." };
  const access = await requireWriteAccess(parsed.data.profileId, "admin");
  if (!access.ok) return access;

  const existing = await getPortalAdminClient()
    .from("lanvac_zones")
    .select("description")
    .eq("profile_id", parsed.data.profileId)
    .eq("zone_number", parsed.data.zoneNumber)
    .maybeSingle();
  const description = existing.data?.description ?? "";
  const reason = zoneWriteReason("delete", parsed.data.zoneNumber, description);

  const written = await deleteLanvacZone(access.code, parsed.data.zoneNumber);
  if (!written.ok) return { ok: false, error: written.error };

  const persisted = await persistLanvacZoneDelete({
    profileId: parsed.data.profileId,
    code: access.code,
    actorUserId: access.actor.userId,
    actorEmail: access.actor.email,
    zoneNumber: parsed.data.zoneNumber,
    reason,
  });
  if (!persisted.ok) return persisted;

  const client = await loadClientName(parsed.data.profileId);
  await sendStationZoneWriteAdminAlert({
    clientName: client.name,
    clientEmail: client.email,
    profileId: parsed.data.profileId,
    changedBy: access.actor.email ?? "staff",
    action: "delete",
    zoneNumber: parsed.data.zoneNumber,
    description,
    zoneType: "",
    reason,
  });
  revalidateStation();
  return { ok: true };
}

async function clientTestCooldown(
  profileId: string,
  actorUserId: string,
): Promise<string | null> {
  const admin = getPortalAdminClient();
  const { data } = await admin
    .from("lanvac_station_events")
    .select("created_at")
    .eq("profile_id", profileId)
    .eq("actor_user_id", actorUserId)
    .in("event_type", ["on_test", "off_test"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.created_at) return null;
  const age = Date.now() - new Date(data.created_at).getTime();
  if (age >= 0 && age < LANVAC_CLIENT_TEST_COOLDOWN_MS) {
    const wait = Math.ceil((LANVAC_CLIENT_TEST_COOLDOWN_MS - age) / 1000);
    return `Wait ${wait} seconds before changing on-test again.`;
  }
  return null;
}

export async function setLanvacAccountTestAction(input: {
  profileId: string;
  onTest: boolean;
  minutes?: number;
}): Promise<StationActionResult> {
  const parsed = z
    .object({
      profileId: z.string().uuid(),
      onTest: z.boolean(),
      minutes: z.number().int().min(5).max(3600).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the on-test duration." };
  if (parsed.data.onTest && parsed.data.minutes == null) {
    return { ok: false, error: "Choose how long to stay on test." };
  }
  const access = await requireWriteAccess(parsed.data.profileId, "any");
  if (!access.ok) return access;

  if (access.actor.role === "client") {
    const wait = await clientTestCooldown(parsed.data.profileId, access.actor.userId);
    if (wait) return { ok: false, error: wait };
  }

  const written = parsed.data.onTest
    ? await putLanvacAccountOnTest(access.code, parsed.data.minutes!)
    : await putLanvacAccountOffTest(access.code);
  if (!written.ok) return { ok: false, error: written.error };

  const persisted = await persistLanvacOnTest({
    profileId: parsed.data.profileId,
    code: access.code,
    actorUserId: access.actor.userId,
    actorEmail: access.actor.email,
    minutes: parsed.data.minutes ?? null,
    onTest: parsed.data.onTest,
  });
  if (!persisted.ok) return persisted;

  const client = await loadClientName(parsed.data.profileId);
  await sendStationOnTestAdminAlert({
    clientName: client.name,
    clientEmail: client.email,
    profileId: parsed.data.profileId,
    changedBy: access.actor.email ?? access.actor.role,
    onTest: parsed.data.onTest,
    minutes: parsed.data.minutes ?? null,
    startedByClient: access.actor.role === "client",
  });
  revalidateStation();
  return { ok: true };
}
