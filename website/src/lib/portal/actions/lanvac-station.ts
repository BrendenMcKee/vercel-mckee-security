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
  fetchLanvacAccount,
  fetchLanvacHistoric,
  fetchLanvacZones,
} from "@/lib/portal/lanvac-api";
import { persistLanvacPull } from "@/lib/portal/lanvac-station-store";

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
  const { data: existing } = await admin
    .from("lanvac_account_state")
    .select("last_synced_at, last_error")
    .eq("profile_id", input.profileId)
    .maybeSingle();

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
    fetchLanvacHistoric(access.code),
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
