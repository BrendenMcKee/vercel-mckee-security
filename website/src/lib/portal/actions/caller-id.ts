"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_ERROR_MESSAGE, tryRequireAdmin, tryRequireUser } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { normalizePhone } from "@/lib/portal/phone";
import {
  sendCallerIdAdminAlert,
  sendCallerIdClientNotification,
  type CallerIdDiffEntry,
} from "@/lib/portal/emails";

/** D6/Q16 defaults (pending stakeholder confirmation): 1..15 contacts. */
const MIN_CONTACTS = 1;
const MAX_CONTACTS = 15;

const contactSchema = z.object({
  phone: z.string().trim().min(1, "Phone number is required"),
  label: z.string().trim().min(1, "Name is required").max(80, "Name is too long (80 max)"),
  // The word this person gives the monitoring station to prove who they are.
  passcode: z
    .string()
    .trim()
    .min(1, "Each contact needs their passcode. It's how the monitoring station verifies them.")
    .max(40, "Passcode is too long (40 max)"),
});

const AUTHORIZED_VIA = ["client_email", "client_verbal", "client_in_person", "mckee_initiated"] as const;

export type SaveCallerIdResult =
  | { ok: true; noChange: boolean; added: CallerIdDiffEntry[]; removed: CallerIdDiffEntry[]; adminEmailSent: boolean; clientEmailSent: boolean | null }
  | { ok: false; error: string };

type NormalizedList = { contacts: CallerIdDiffEntry[] } | { error: string };

function normalizeList(raw: { phone: string; label: string; passcode: string }[]): NormalizedList {
  if (raw.length < MIN_CONTACTS) {
    return { error: "The list needs at least one contact. The monitoring station must have someone to call." };
  }
  if (raw.length > MAX_CONTACTS) {
    return { error: `The list is capped at ${MAX_CONTACTS} contacts.` };
  }
  const contacts: CallerIdDiffEntry[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const parsed = contactSchema.safeParse(entry);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid contact." };
    }
    const phone = normalizePhone(parsed.data.phone);
    if (!phone) {
      return { error: `"${parsed.data.phone}" is not a valid North American phone number.` };
    }
    if (seen.has(phone)) {
      return { error: `${parsed.data.phone} appears more than once. Each number can only be listed once.` };
    }
    seen.add(phone);
    contacts.push({ phone, label: parsed.data.label, passcode: parsed.data.passcode });
  }
  return { contacts };
}

type RpcDiff = { no_change?: boolean; change_id?: string; added?: CallerIdDiffEntry[]; removed?: CallerIdDiffEntry[] };

/**
 * Shared core (R23): both dashboards run the same transactional RPC
 * (replace + diff + append-only history row), then dispatch the notification
 * emails. Email failures never roll back the save (Section 8).
 */
async function runSave(opts: {
  profileId: string;
  contacts: CallerIdDiffEntry[];
  changedVia: "client_dashboard" | "admin_dashboard";
  changedByEmail: string | null;
  authorizedVia?: string;
  changeReason?: string;
  clientName: string;
  clientEmail: string | null;
  clientFirstName: string;
  changedByDescription: string;
}): Promise<SaveCallerIdResult> {
  const supabase = await createPortalServerClient();

  const { data, error } = await supabase.rpc("save_caller_id_list", {
    p_profile_id: opts.profileId,
    p_contacts: opts.contacts,
    p_changed_via: opts.changedVia,
    p_changed_by_email: opts.changedByEmail ?? "",
    p_authorized_via: opts.authorizedVia,
    p_change_reason: opts.changeReason,
  });

  if (error) {
    console.error("[portal] save_caller_id_list failed:", error);
    if (error.code === "42501" || error.code === "23514") {
      return { ok: false, error: "Not authorized to save this list." };
    }
    return { ok: false, error: "Could not save the list. Please try again." };
  }

  const diff = (data ?? {}) as RpcDiff;
  if (diff.no_change) {
    return { ok: true, noChange: true, added: [], removed: [], adminEmailSent: false, clientEmailSent: null };
  }

  const added = diff.added ?? [];
  const removed = diff.removed ?? [];

  const adminEmailSent = await sendCallerIdAdminAlert({
    clientName: opts.clientName,
    clientEmail: opts.clientEmail,
    changedByDescription: opts.changedByDescription,
    added,
    removed,
    authorizedVia: opts.authorizedVia,
    changeReason: opts.changeReason,
    profileId: opts.profileId,
  });

  // R24: admin-made changes always notify the client; the send is stamped on
  // the history row via service role (the table has no UPDATE policy at all).
  let clientEmailSent: boolean | null = null;
  if (opts.changedVia === "admin_dashboard") {
    clientEmailSent = false;
    if (opts.clientEmail) {
      clientEmailSent = await sendCallerIdClientNotification({
        to: opts.clientEmail,
        firstName: opts.clientFirstName,
        added,
        removed,
        authorizedVia: opts.authorizedVia!,
        changeReason: opts.changeReason!,
      });
      if (clientEmailSent && diff.change_id) {
        const { error: stampError } = await getPortalAdminClient()
          .from("caller_id_changes")
          .update({ client_notified_at: new Date().toISOString() })
          .eq("id", diff.change_id);
        if (stampError) {
          console.error("[portal] client_notified_at stamp failed:", stampError);
        }
      }
    }
  }

  revalidatePath("/user-dashboard");
  revalidatePath("/admin-dashboard", "layout");
  return { ok: true, noChange: false, added, removed, adminEmailSent, clientEmailSent };
}

/** Client saves their own list (handover 6.4). The session is the authorization. */
export async function saveMyCallerIdList(input: {
  contacts: { phone: string; label: string; passcode: string }[];
}): Promise<SaveCallerIdResult> {
  const auth = await tryRequireUser();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  const { user, profile } = auth;
  if (profile.role !== "client") {
    return { ok: false, error: "Admins edit lists from the client's detail page." };
  }

  const normalized = normalizeList(input.contacts ?? []);
  if ("error" in normalized) return { ok: false, error: normalized.error };

  return runSave({
    profileId: profile.id,
    contacts: normalized.contacts,
    changedVia: "client_dashboard",
    changedByEmail: user.email,
    clientName: `${profile.first_name} ${profile.last_name}`,
    clientEmail: profile.email,
    clientFirstName: profile.first_name,
    changedByDescription: `The client themselves (${user.email ?? "signed-in session"}) via the client dashboard`,
  });
}

const adminSaveSchema = z.object({
  profileId: z.uuid(),
  authorizedVia: z.enum(AUTHORIZED_VIA),
  changeReason: z.string().trim().min(10, "Describe the client's request (at least 10 characters) so the change can be reconciled later."),
});

/**
 * Admin saves a client's list (R23) with recorded authorization + reason
 * (R24). Validation here AND a DB CHECK enforce that an admin change can
 * never be recorded without them.
 */
export async function saveClientCallerIdList(input: {
  profileId: string;
  contacts: { phone: string; label: string; passcode: string }[];
  authorizedVia: string;
  changeReason: string;
}): Promise<SaveCallerIdResult> {
  const auth = await tryRequireAdmin();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  const { user } = auth;

  const parsed = adminSaveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const normalized = normalizeList(input.contacts ?? []);
  if ("error" in normalized) return { ok: false, error: normalized.error };

  const supabase = await createPortalServerClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, email")
    .eq("id", parsed.data.profileId)
    .maybeSingle();
  if (!target || target.role !== "client") {
    return { ok: false, error: "Client not found." };
  }

  return runSave({
    profileId: target.id,
    contacts: normalized.contacts,
    changedVia: "admin_dashboard",
    changedByEmail: user.email,
    authorizedVia: parsed.data.authorizedVia,
    changeReason: parsed.data.changeReason,
    clientName: `${target.first_name} ${target.last_name}`,
    clientEmail: target.email,
    clientFirstName: target.first_name,
    changedByDescription: `McKee admin ${user.email ?? user.id} via the admin dashboard`,
  });
}

// ---------------------------------------------------------------------------
// Devices (handover 6.5): admin sets install dates; a date change clears the
// expiry alert guard (R14) so the next expiry re-alerts.
// ---------------------------------------------------------------------------

export type DeviceActionResult = { ok: true } | { ok: false; error: string };

const deviceSchema = z.object({
  profileId: z.uuid(),
  deviceType: z.enum(["battery", "smoke_detector"]),
  installedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
});

export async function setDeviceInstallDate(input: {
  profileId: string;
  deviceType: "battery" | "smoke_detector";
  installedOn: string;
}): Promise<DeviceActionResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = deviceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { profileId, deviceType, installedOn } = parsed.data;

  if (new Date(installedOn).getTime() > Date.now()) {
    return { ok: false, error: "Install date cannot be in the future." };
  }

  const supabase = await createPortalServerClient();
  const { error } = await supabase
    .from("devices")
    .upsert(
      // R14: a date change resets the alert guard.
      { profile_id: profileId, device_type: deviceType, installed_on: installedOn, expiry_alerted_at: null },
      { onConflict: "profile_id,device_type" },
    );

  if (error) {
    console.error("[portal] setDeviceInstallDate failed:", error);
    return { ok: false, error: "Could not save the device. Please try again." };
  }

  revalidatePath("/user-dashboard");
  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}
