// Devices are an open, admin-managed equipment list (stakeholder round 3):
// each device has a custom name and its own replacement interval in years.
// Round 4 added fixed categories so expiring equipment can be filtered by
// kind (all smoke detectors, all system batteries) while names stay free
// text. Expiry is always computed from installed_on + lifetime_years,
// never stored.

export const DEVICE_CATEGORIES = [
  "system_battery",
  "device_battery",
  "detector",
  "wireless_device",
  "other",
] as const;

export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

export const DEVICE_CATEGORY_LABELS: Record<DeviceCategory, string> = {
  system_battery: "System Battery",
  device_battery: "Device Battery",
  detector: "Smoke / CO Detector",
  wireless_device: "Wireless Device",
  other: "Other",
};

/** Quick-add suggestions for the admin form; free text is equally valid. */
export const DEVICE_PRESETS: { label: string; category: DeviceCategory; years: number }[] = [
  { label: "4Ah Security System Battery", category: "system_battery", years: 5 },
  { label: "7Ah Security System Battery", category: "system_battery", years: 5 },
  { label: "Smoke Detector", category: "detector", years: 10 },
  { label: "Carbon Monoxide Detector", category: "detector", years: 7 },
  { label: "Device Battery", category: "device_battery", years: 5 },
  { label: "Wireless Motion Sensor", category: "wireless_device", years: 10 },
  { label: "Wireless Door Contact", category: "wireless_device", years: 10 },
];

export function deviceCategoryLabel(category: string): string {
  return DEVICE_CATEGORY_LABELS[category as DeviceCategory] ?? DEVICE_CATEGORY_LABELS.other;
}

export function deviceExpiryDate(installedOn: string, lifetimeYears: number): Date {
  const d = new Date(`${installedOn}T00:00:00`);
  d.setFullYear(d.getFullYear() + lifetimeYears);
  return d;
}

export function isDeviceExpired(installedOn: string, lifetimeYears: number): boolean {
  return deviceExpiryDate(installedOn, lifetimeYears).getTime() <= Date.now();
}
