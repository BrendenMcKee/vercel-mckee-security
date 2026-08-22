/**
 * Historic color map from the 2026-08-22 O5985 snapshot
 * (docs/LANVAC_STATION.md). Description keywords first, then signal prefix.
 * Unknown stays gray, never green.
 */

export const LANVAC_SIGNAL_CLASSES = [
  "alarm",
  "restore",
  "comm_restore",
  "open_close",
  "on_test",
  "ops",
  "unknown",
] as const;

export type LanvacSignalClass = (typeof LANVAC_SIGNAL_CLASSES)[number];

const OPS_SIGNALS = new Set(["-X0019", "-X0071", "-X0011", "-X0070"]);
const ON_TEST_SIGNALS = new Set(["-X0076", "-X0030", "-X0043"]);

export function asLanvacSignalClass(
  value: string | null | undefined,
): LanvacSignalClass | null {
  if (!value) return null;
  return (LANVAC_SIGNAL_CLASSES as readonly string[]).includes(value)
    ? (value as LanvacSignalClass)
    : "unknown";
}

export function classifyLanvacSignal(input: {
  description?: string | null;
  signal?: string | null;
}): LanvacSignalClass {
  const description = (input.description ?? "").toUpperCase();
  const signal = (input.signal ?? "").trim().toUpperCase();
  const isRestoreText =
    description.includes("RESTORE") || description.includes("AFTER ALARM");
  const isAlarmText =
    description.includes("ALARM((") ||
    (description.includes("ALARM") && !isRestoreText);

  if (isAlarmText) return "alarm";
  if (description.includes("ON-TEST") || ON_TEST_SIGNALS.has(signal)) return "on_test";
  if (description.includes("COMMUNICATION RESTORE") || signal.startsWith("350")) {
    return "comm_restore";
  }
  if (isRestoreText || signal.startsWith("406")) return "restore";
  if (
    signal.startsWith("401") ||
    signal.startsWith("408") ||
    description.includes("OPENING") ||
    description.includes("CLOSING")
  ) {
    return "open_close";
  }
  if (
    OPS_SIGNALS.has(signal) ||
    description.includes("LANTEL") ||
    description.includes("BUFF60") ||
    signal.startsWith("230") ||
    signal.startsWith("285")
  ) {
    return "ops";
  }
  return "unknown";
}

/** Lanvac Historic dates are `MM-DD-YYYY HH:mm:ss`. Display the raw text. */
export function parseLanvacHistoricDate(raw: string): {
  iso: string;
  display: string;
} {
  const trimmed = raw.trim();
  const match = trimmed.match(
    /^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!match) {
    const fallback = new Date(trimmed);
    return {
      iso: Number.isNaN(fallback.getTime())
        ? new Date(0).toISOString()
        : fallback.toISOString(),
      display: trimmed,
    };
  }
  const [, month, day, year, hour, minute, second] = match;
  return {
    iso: `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`,
    display: trimmed,
  };
}

export type StationChipKind =
  | "disabled"
  | "on_test"
  | "alarm"
  | "ok"
  | "empty"
  | "unknown";

export type StationChip = {
  kind: StationChipKind;
  label: string;
};

export function stationStatusChip(input: {
  isDisabled: boolean;
  onTestUntil: string | null;
  anyZoneOnTest: boolean;
  lastSignalClass: LanvacSignalClass | null;
  lastSignalAt: string | null;
  now?: Date;
}): StationChip {
  if (input.isDisabled) {
    return { kind: "disabled", label: "Station disabled" };
  }

  const now = input.now ?? new Date();
  const onTestUntil = input.onTestUntil ? new Date(input.onTestUntil) : null;
  const onTestActive =
    input.anyZoneOnTest ||
    (onTestUntil != null && !Number.isNaN(onTestUntil.getTime()) && onTestUntil > now);
  if (onTestActive) {
    const until =
      onTestUntil && onTestUntil > now
        ? onTestUntil.toLocaleString("en-CA", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : null;
    return {
      kind: "on_test",
      label: until ? `On test until ${until}` : "On test",
    };
  }

  if (!input.lastSignalClass || !input.lastSignalAt) {
    return { kind: "empty", label: "No signals on file" };
  }
  if (input.lastSignalClass === "alarm") {
    return { kind: "alarm", label: "Last signal: alarm" };
  }
  if (input.lastSignalClass === "unknown") {
    return { kind: "unknown", label: "Last signal" };
  }
  if (input.lastSignalClass === "restore") {
    return { kind: "ok", label: "Last signal: restore" };
  }
  return { kind: "ok", label: "Last signal" };
}

export function signalRowTone(signalClass: LanvacSignalClass): string {
  switch (signalClass) {
    case "alarm":
      return "border-red-500/40 bg-red-500/10 text-red-100";
    case "restore":
      return "border-emerald-500/20 bg-emerald-500/5 text-white/80";
    case "on_test":
      return "border-sky-500/30 bg-sky-500/10 text-sky-100";
    default:
      return "border-white/10 bg-background text-white/70";
  }
}

export function chipTone(kind: StationChipKind): string {
  switch (kind) {
    case "disabled":
      return "bg-white/10 text-white/70 ring-1 ring-white/15";
    case "on_test":
      return "bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/40";
    case "alarm":
      return "bg-red-500 text-white";
    case "ok":
      return "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40";
    case "empty":
    case "unknown":
      return "bg-white/10 text-white/65 ring-1 ring-white/15";
  }
}
