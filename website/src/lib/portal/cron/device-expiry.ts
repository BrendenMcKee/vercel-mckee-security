import "server-only";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { deviceExpiryDate, isDeviceExpired } from "@/lib/portal/devices";
import { sendDeviceExpiryAdminAlert, sendDeviceExpiryClientNotice } from "@/lib/portal/emails";

export type DeviceExpirySummary = {
  expired: number;
  alerted: number;
};

/**
 * R14 daily job (PORTAL_PLAN.md 9.4): devices past their computed service
 * life (installed_on + lifetime_years) where expiry_alerted_at is null get
 * one admin alert + one client notice, then the guard is stamped. Changing
 * the install date or interval (a replacement) clears the guard for the next
 * cycle.
 */
export async function runDeviceExpiryJob(): Promise<DeviceExpirySummary> {
  const admin = getPortalAdminClient();

  const { data: devices, error } = await admin
    .from("devices")
    .select("id, label, lifetime_years, installed_on, expiry_alerted_at, profiles(id, first_name, last_name, email)")
    .not("installed_on", "is", null)
    .is("expiry_alerted_at", null);

  if (error) throw new Error(`device-expiry query failed: ${error.message}`);

  const expiredDevices = (devices ?? []).filter(
    (d) => d.installed_on && isDeviceExpired(d.installed_on, d.lifetime_years),
  );

  let alerted = 0;
  for (const device of expiredDevices) {
    const profile = device.profiles;
    if (!profile || !device.installed_on) continue;

    const deviceLabel = device.label;
    const expiredOn = deviceExpiryDate(device.installed_on, device.lifetime_years)
      .toISOString()
      .slice(0, 10);

    const adminSent = await sendDeviceExpiryAdminAlert({
      clientName: `${profile.first_name} ${profile.last_name}`,
      clientEmail: profile.email,
      deviceLabel,
      installedOn: device.installed_on,
      expiredOn,
      profileId: profile.id,
    });

    if (profile.email) {
      await sendDeviceExpiryClientNotice({
        to: profile.email,
        firstName: profile.first_name,
        deviceLabel,
        installedOn: device.installed_on,
      });
    }

    // Stamp only when the admin alert went out, so a failed send retries on
    // the next run instead of silently losing the expiry event.
    if (adminSent) {
      const { error: stampError } = await admin
        .from("devices")
        .update({ expiry_alerted_at: new Date().toISOString() })
        .eq("id", device.id);
      if (stampError) {
        console.error("[portal] expiry_alerted_at stamp failed:", stampError);
      } else {
        alerted += 1;
      }
    }
  }

  return { expired: expiredDevices.length, alerted };
}
