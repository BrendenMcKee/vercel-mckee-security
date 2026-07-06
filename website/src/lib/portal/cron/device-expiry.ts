import "server-only";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { DEVICE_LABELS, deviceExpiryDate, isDeviceExpired } from "@/lib/portal/devices";
import { sendDeviceExpiryAdminAlert, sendDeviceExpiryClientNotice } from "@/lib/portal/emails";

export type DeviceExpirySummary = {
  expired: number;
  alerted: number;
};

/**
 * R14 daily job (PORTAL_PLAN.md 9.4): devices past their computed service
 * life (battery +5y, smoke detector +10y) where expiry_alerted_at is null
 * get one admin alert + one client notice, then the guard is stamped.
 * Changing the install date (a replacement) clears the guard for the next
 * cycle.
 */
export async function runDeviceExpiryJob(): Promise<DeviceExpirySummary> {
  const admin = getPortalAdminClient();

  const { data: devices, error } = await admin
    .from("devices")
    .select("id, device_type, installed_on, expiry_alerted_at, profiles(id, first_name, last_name, email)")
    .not("installed_on", "is", null)
    .is("expiry_alerted_at", null);

  if (error) throw new Error(`device-expiry query failed: ${error.message}`);

  const expiredDevices = (devices ?? []).filter(
    (d) => d.installed_on && isDeviceExpired(d.device_type, d.installed_on),
  );

  let alerted = 0;
  for (const device of expiredDevices) {
    const profile = device.profiles;
    if (!profile || !device.installed_on) continue;

    const deviceLabel = DEVICE_LABELS[device.device_type];
    const expiredOn = deviceExpiryDate(device.device_type, device.installed_on)
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
