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
  if (
    description.includes("ON-TEST") ||
    description.includes("STOP TESTING") ||
    ON_TEST_SIGNALS.has(signal)
  ) {
    return "on_test";
  }
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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type LanvacHistoricParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** Parse Lanvac `MM-DD-YYYY HH:mm:ss` as written. Do not shift time zones. */
export function parseLanvacHistoricParts(raw: string): LanvacHistoricParts | null {
  const match = raw.trim().match(
    /^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return null;
  return {
    month: Number(match[1]),
    day: Number(match[2]),
    year: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? "0"),
  };
}

export function formatHourMinute(hour: number, minute: number): string {
  const suffix = hour >= 12 ? "p.m." : "a.m.";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatLanvacHistoricTime(raw: string): string | null {
  const parts = parseLanvacHistoricParts(raw);
  return parts ? formatHourMinute(parts.hour, parts.minute) : null;
}

export function formatLanvacHistoricWhen(raw: string): string {
  const parts = parseLanvacHistoricParts(raw);
  if (!parts) return raw.trim();
  const month = MONTH_NAMES[parts.month - 1];
  if (!month) return raw.trim();
  return `${month} ${parts.day}, ${parts.year}, ${formatHourMinute(parts.hour, parts.minute)}`;
}

/** Abbreviated date plus time, for the right side of a Historic card. */
export function formatLanvacHistoricShortWhen(raw: string): string {
  const parts = parseLanvacHistoricParts(raw);
  if (!parts) return raw.trim();
  const month = MONTH_SHORT[parts.month - 1];
  if (!month) return raw.trim();
  return `${month} ${parts.day} · ${formatHourMinute(parts.hour, parts.minute)}`;
}

export function formatLanvacHistoricDay(raw: string): { key: string; label: string } | null {
  const parts = parseLanvacHistoricParts(raw);
  if (!parts) return null;
  const month = MONTH_NAMES[parts.month - 1];
  if (!month) return null;
  const weekday = WEEKDAY_NAMES[new Date(parts.year, parts.month - 1, parts.day).getDay()];
  return {
    key: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    label: `${weekday}, ${month} ${parts.day}, ${parts.year}`,
  };
}

/** Lanvac Historic dates are `MM-DD-YYYY HH:mm:ss`. Keep a stable sort key. */
export function parseLanvacHistoricDate(raw: string): {
  iso: string;
  display: string;
} {
  const trimmed = raw.trim();
  const parts = parseLanvacHistoricParts(trimmed);
  if (!parts) {
    const fallback = new Date(trimmed);
    return {
      iso: Number.isNaN(fallback.getTime())
        ? new Date(0).toISOString()
        : fallback.toISOString(),
      display: trimmed,
    };
  }
  const stamp = `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")}`;
  return {
    iso: `${stamp}.000Z`,
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
  if (input.lastSignalClass === "restore") {
    return { kind: "ok", label: "Last signal: restore" };
  }
  return { kind: "unknown", label: "Last signal" };
}

export function signalRowTone(signalClass: LanvacSignalClass): string {
  switch (signalClass) {
    case "alarm":
      return "border-red-500/40 bg-red-500/10 text-red-100";
    case "restore":
      return "border-emerald-500/20 bg-emerald-500/5 text-white/80";
    case "on_test":
      return "border-amber-500/35 bg-amber-500/10 text-amber-100";
    default:
      return "border-white/10 bg-background text-white/70";
  }
}

export function chipTone(kind: StationChipKind): string {
  switch (kind) {
    case "disabled":
      return "bg-white/10 text-white/70 ring-1 ring-white/15";
    case "on_test":
      return "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/40";
    case "alarm":
      return "bg-red-500 text-white";
    case "ok":
      return "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40";
    case "empty":
    case "unknown":
      return "bg-white/10 text-white/65 ring-1 ring-white/15";
  }
}
