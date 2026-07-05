import type { Database } from "@/lib/portal/database.types";

export type DeviceType = Database["public"]["Enums"]["device_type"];

export const DEVICE_LABELS: Record<DeviceType, string> = {
  battery: "Alarm Backup Battery",
  smoke_detector: "Smoke Detector",
};

/** Handover 6.5: battery lasts 5 years, smoke detector 10. Expiry is computed, never stored. */
export const DEVICE_LIFETIME_YEARS: Record<DeviceType, number> = {
  battery: 5,
  smoke_detector: 10,
};

export function deviceExpiryDate(deviceType: DeviceType, installedOn: string): Date {
  const d = new Date(`${installedOn}T00:00:00`);
  d.setFullYear(d.getFullYear() + DEVICE_LIFETIME_YEARS[deviceType]);
  return d;
}

export function isDeviceExpired(deviceType: DeviceType, installedOn: string): boolean {
  return deviceExpiryDate(deviceType, installedOn).getTime() <= Date.now();
}
