// Devices are an admin-managed equipment list. The name is free text so a
// hallway detector can be "Hallway smoke 1" while the Devices tab filters
// by category only. Categories are the maintenance kind, not the product
// marketing name: system batteries, device batteries (every wireless
// sensor battery, including a smoke/CO battery), smoke/CO detector units,
// and other. A wireless smoke detector is two rows — the detector and its
// battery — because they expire on different clocks. Expiry is computed
// from installed_on + lifetime_years, never stored.

export const DEVICE_CATEGORIES = [
  "system_battery",
  "device_battery",
  "detector",
  "other",
] as const;

export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

export const DEVICE_CATEGORY_LABELS: Record<DeviceCategory, string> = {
  system_battery: "System Battery",
  device_battery: "Device Battery",
  detector: "Smoke / CO Detector",
  other: "Other",
};

/** Common starting names. Typing a custom label is equally valid. */
export const DEVICE_PRESETS: { label: string; category: DeviceCategory; years: number }[] = [
  { label: "4Ah Security System Battery", category: "system_battery", years: 5 },
  { label: "7Ah Security System Battery", category: "system_battery", years: 5 },
  { label: "Smoke Detector", category: "detector", years: 10 },
  { label: "Carbon Monoxide Detector", category: "detector", years: 7 },
  { label: "Device Battery", category: "device_battery", years: 5 },
  { label: "Wireless Motion Sensor Battery", category: "device_battery", years: 5 },
  { label: "Wireless Door Contact Battery", category: "device_battery", years: 5 },
  { label: "Smoke / CO Detector Battery", category: "device_battery", years: 5 },
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
