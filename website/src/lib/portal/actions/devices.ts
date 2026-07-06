"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_ERROR_MESSAGE, tryRequireAdmin } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";

// ---------------------------------------------------------------------------
// Device tracking (stakeholder round 3): accounts start with no devices and
// admins add whatever equipment they want replacement reminders for, with a
// custom name and a per-device replacement interval. Clients see the list
// read-only; every write here is admin-only via RLS.
// ---------------------------------------------------------------------------

export type DeviceActionResult = { ok: true } | { ok: false; error: string };

const labelSchema = z
  .string()
  .trim()
  .min(1, "Give the device a name.")
  .max(80, "Keep the name under 80 characters.");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const yearsSchema = z
  .number()
  .int("Replacement interval must be whole years.")
  .min(1, "Replacement interval must be at least 1 year.")
  .max(50, "Replacement interval looks too large.");

function validateInstallDate(installedOn: string): string | null {
  if (new Date(installedOn).getTime() > Date.now()) {
    return "Install date cannot be in the future.";
  }
  return null;
}

const addSchema = z.object({
  profileId: z.uuid(),
  label: labelSchema,
  installedOn: dateSchema,
  lifetimeYears: yearsSchema,
});

export async function addDeviceAction(input: {
  profileId: string;
  label: string;
  installedOn: string;
  lifetimeYears: number;
}): Promise<DeviceActionResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const dateError = validateInstallDate(parsed.data.installedOn);
  if (dateError) return { ok: false, error: dateError };

  const supabase = await createPortalServerClient();
  const { error } = await supabase.from("devices").insert({
    profile_id: parsed.data.profileId,
    label: parsed.data.label,
    installed_on: parsed.data.installedOn,
    lifetime_years: parsed.data.lifetimeYears,
  });

  if (error) {
    console.error("[portal] addDevice failed:", error);
    return { ok: false, error: "Could not add the device. Please try again." };
  }

  revalidatePath("/user-dashboard");
  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}

const updateSchema = z.object({
  deviceId: z.uuid(),
  label: labelSchema,
  installedOn: dateSchema,
  lifetimeYears: yearsSchema,
});

export async function updateDeviceAction(input: {
  deviceId: string;
  label: string;
  installedOn: string;
  lifetimeYears: number;
}): Promise<DeviceActionResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const dateError = validateInstallDate(parsed.data.installedOn);
  if (dateError) return { ok: false, error: dateError };

  const supabase = await createPortalServerClient();
  const { data: existing } = await supabase
    .from("devices")
    .select("id, installed_on, lifetime_years")
    .eq("id", parsed.data.deviceId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Device not found." };

  // R14: a new date or interval re-arms the expiry alert; a plain rename
  // keeps the guard so an already-alerted device is not re-alerted.
  const rearm =
    existing.installed_on !== parsed.data.installedOn ||
    existing.lifetime_years !== parsed.data.lifetimeYears;

  const { error } = await supabase
    .from("devices")
    .update({
      label: parsed.data.label,
      installed_on: parsed.data.installedOn,
      lifetime_years: parsed.data.lifetimeYears,
      ...(rearm ? { expiry_alerted_at: null } : {}),
    })
    .eq("id", parsed.data.deviceId);

  if (error) {
    console.error("[portal] updateDevice failed:", error);
    return { ok: false, error: "Could not save the device. Please try again." };
  }

  revalidatePath("/user-dashboard");
  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}

export async function deleteDeviceAction(deviceId: string): Promise<DeviceActionResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  if (!z.uuid().safeParse(deviceId).success) return { ok: false, error: "Invalid device." };

  const supabase = await createPortalServerClient();
  const { data, error } = await supabase
    .from("devices")
    .delete()
    .eq("id", deviceId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[portal] deleteDevice failed:", error);
    return { ok: false, error: "Could not remove the device. Please try again." };
  }

  revalidatePath("/user-dashboard");
  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}
