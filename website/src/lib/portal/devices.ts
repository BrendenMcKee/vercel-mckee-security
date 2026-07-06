// Devices are an open, admin-managed equipment list (stakeholder round 3):
// each device has a custom name and its own replacement interval in years.
// Expiry is always computed from installed_on + lifetime_years, never stored.

/** Quick-add suggestions for the admin form; free text is equally valid. */
export const DEVICE_PRESETS: { label: string; years: number }[] = [
  { label: "Alarm Backup Battery", years: 5 },
  { label: "Smoke Detector", years: 10 },
  { label: "Carbon Monoxide Detector", years: 7 },
  { label: "Keypad Backup Battery", years: 5 },
];

export function deviceExpiryDate(installedOn: string, lifetimeYears: number): Date {
  const d = new Date(`${installedOn}T00:00:00`);
  d.setFullYear(d.getFullYear() + lifetimeYears);
  return d;
}

export function isDeviceExpired(installedOn: string, lifetimeYears: number): boolean {
  return deviceExpiryDate(installedOn, lifetimeYears).getTime() <= Date.now();
}
