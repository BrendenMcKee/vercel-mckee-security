// Curated device presets and color logic for Data Drops.
// Device is always optional. Custom (free-form) devices are supported everywhere
// and get a deterministic color from the same palette so they look consistent.

export const DEVICE_PRESETS = [
  "Jack",
  "Camera",
  "Door Access",
  "Card Reader",
  "Access Point",
  "Phone",
  "Telemetry",
  "Patient Monitor",
  "Monitor",
  "TV",
  "Computer",
  "Printer",
  "Speaker",
  "Nurse Call",
  "Intercom",
  "Clock",
  "Network Switch",
  "Wireless Bridge",
  "Starlink",
  "Other",
] as const;

// Intentional colors for the common devices (chosen for contrast on the dark UI).
const PRESET_COLORS: Record<string, string> = {
  Jack: "#94a3b8",
  Camera: "#3b82f6",
  "Door Access": "#f59e0b",
  "Card Reader": "#f97316",
  "Access Point": "#22c55e",
  Phone: "#14b8a6",
  Telemetry: "#a855f7",
  "Patient Monitor": "#ec4899",
  Monitor: "#0ea5e9",
  TV: "#eab308",
  Computer: "#6366f1",
  Printer: "#84cc16",
  Speaker: "#d946ef",
  "Nurse Call": "#e11d48",
  Intercom: "#06b6d4",
  Clock: "#64748b",
  "Network Switch": "#8b5cf6",
  "Wireless Bridge": "#10b981",
  Starlink: "#818cf8",
  Other: "#9ca3af",
};

// Fixed, dark-bg-accessible palette used to color custom devices deterministically.
const PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#f97316",
  "#a855f7",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
  "#84cc16",
  "#eab308",
  "#06b6d4",
  "#8b5cf6",
  "#10b981",
  "#d946ef",
  "#0ea5e9",
  "#f43f5e",
];

const FALLBACK = "#9ca3af";

/** Returns a stable color for a device name (preset color, or hashed palette color for custom). */
export function deviceColor(name?: string | null): string {
  if (!name) return FALLBACK;
  const preset = PRESET_COLORS[name];
  if (preset) return preset;
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/** Normalize a device string for comparison (case-insensitive, trimmed). */
export function normalizeDevice(name?: string | null): string {
  return (name ?? "").trim().toLowerCase();
}
