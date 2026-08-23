/**
 * Shared write-gate and zone-type map (R54). Safe in client components.
 * Carbon monoxide write codes stay unproven. Do not guess on a live write.
 */

import { formatLanvacHistoricWhen } from "@/lib/portal/lanvac-signals";

export const LANVAC_WRITE_TEST_ACCOUNT = "O5985";
export const LANVAC_ZONE_DESCRIPTION_MAX = 65;
export const LANVAC_ON_TEST_MINUTES = [30, 60, 120, 240, 480, 720, 1440] as const;
export const LANVAC_ON_TEST_DEFAULT_MINUTES = 60;
export const LANVAC_ON_TEST_MIN_MINUTES = 5;
export const LANVAC_ON_TEST_MAX_MINUTES = 3600;
export const LANVAC_CLIENT_TEST_COOLDOWN_MS = 120_000;
export const LANVAC_ON_TEST_PULL_GRACE_MS = 45_000;
export const STATION_WRITES_NOT_LIVE = "Station writes are not live on this account.";

export const PROVEN_ZONE_WRITE_TYPES = ["FIR", "BUR", "LOW"] as const;
export type ProvenZoneWriteType = (typeof PROVEN_ZONE_WRITE_TYPES)[number];

/** McKee does not use station delay, per-zone notify, or event codes. */
export const MCKEE_ZONE_WRITE_DEFAULTS = {
  delay: 1,
  useCallList: true,
  emailsAndPhoneNumbers: [] as string[],
} as const;

const GET_TYPE_TO_WRITE: Record<string, ProvenZoneWriteType> = {
  FIRE: "FIR",
  FIR: "FIR",
  BURGLAR: "BUR",
  BUR: "BUR",
  "LOW TEMPERATURE": "LOW",
  LOW: "LOW",
};

const WRITE_TYPE_LABEL: Record<ProvenZoneWriteType, string> = {
  FIR: "Fire",
  BUR: "Burglar",
  LOW: "Low temperature",
};

export function clampOnTestMinutes(minutes: number): number | null {
  if (!Number.isFinite(minutes)) return null;
  const rounded = Math.round(minutes);
  if (rounded < LANVAC_ON_TEST_MIN_MINUTES || rounded > LANVAC_ON_TEST_MAX_MINUTES) {
    return null;
  }
  return rounded;
}

export function minutesFromDaysAndHours(days: number, hours: number): number | null {
  return clampOnTestMinutes(days * 1440 + hours * 60);
}

export function formatStationDateTime(date: Date): string {
  return date.toLocaleString("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function onTestDurationLabel(minutes: number): string {
  if (minutes === 30) return "30 min";
  if (minutes === 1440) return "24 hours";
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

export function onTestPresetLabel(minutes: number): string {
  if (minutes === 30) return "30 min";
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return onTestDurationLabel(minutes);
}

export function lastHistoricOnTestText(
  signals: Array<{ occurredAtText: string; description: string; signalClass: string }>,
): string | null {
  const row = signals.find((signal) => {
    if (signal.signalClass !== "on_test") return false;
    const text = signal.description.toUpperCase();
    return (
      text.includes("ON-TEST") &&
      !text.includes("STOP TESTING") &&
      !text.includes("STOP/FINISH") &&
      !text.includes("ON-TEST END")
    );
  });
  return row ? formatLanvacHistoricWhen(row.occurredAtText) : null;
}

export function formatOnTestRemaining(until: Date, now = new Date()): string {
  const ms = until.getTime() - now.getTime();
  if (ms <= 0) return "ending now";
  const totalMin = Math.max(1, Math.round(ms / 60_000));
  if (totalMin < 60) return `${totalMin} min left`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const rest = hours % 24;
    return rest ? `${days}d ${rest}h left` : `${days}d left`;
  }
  return mins ? `${hours}h ${mins}m left` : `${hours}h left`;
}

export function lanvacWritesLive(account: string | null | undefined): boolean {
  return (account ?? "").trim().toUpperCase() === LANVAC_WRITE_TEST_ACCOUNT;
}

export function isCarbonMonoxideZoneType(value: string): boolean {
  const normalized = value.trim().toUpperCase();
  return (
    normalized === "CARBON MONOXIDE" ||
    normalized === "CO*" ||
    normalized === "CO1" ||
    normalized === "CO2"
  );
}

export function mapZoneTypeToWrite(
  value: string,
): { ok: true; code: ProvenZoneWriteType } | { ok: false; error: string } {
  const normalized = value.trim().toUpperCase();
  if (isCarbonMonoxideZoneType(normalized)) {
    return {
      ok: false,
      error: "Carbon monoxide write codes are not proven yet. Do not change this zone type.",
    };
  }
  const code = GET_TYPE_TO_WRITE[normalized];
  if (!code) {
    return {
      ok: false,
      error: "That zone type cannot be written yet. Use fire, burglar, or low temperature.",
    };
  }
  return { ok: true, code };
}

export function zoneWriteTypeLabel(code: ProvenZoneWriteType): string {
  return WRITE_TYPE_LABEL[code];
}

export function isStationOnTest(input: {
  onTestUntil: string | null | undefined;
  anyZoneOnTest?: boolean;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  const until = input.onTestUntil ? new Date(input.onTestUntil) : null;
  return (
    Boolean(input.anyZoneOnTest) ||
    (until != null && !Number.isNaN(until.getTime()) && until > now)
  );
}

/**
 * GET /Zone onTest can lag. While a zone is on test Lanvac pads the
 * description and appends `+`. Strip that mark for display and treat it as
 * on test.
 */
export function interpretLanvacZoneRead(input: {
  onTest?: boolean;
  description?: string | null;
}): { onTest: boolean; description: string } {
  const raw = (input.description ?? "").replace(/\s+$/, "");
  const marked = raw.endsWith("+");
  const description = marked ? raw.replace(/\s*\+$/, "").replace(/\s+$/, "") : raw;
  return {
    onTest: Boolean(input.onTest) || marked,
    description,
  };
}

export function recentLanvacZoneTestIntent(
  events: {
    createdAt: string;
    eventType: string;
    scope?: string | null;
    zoneNumber?: number | null;
  }[],
  zoneNumber: number,
): "on" | "off" | null {
  const matching = events
    .filter((event) => event.scope === "zone" && event.zoneNumber === zoneNumber)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const last = matching[0];
  if (!last) return null;
  if (last.eventType === "on_test") return "on";
  if (last.eventType === "off_test") return "off";
  return null;
}

export function applyOnTestPullGrace(
  incomingOnTest: boolean,
  recentIntent: "on" | "off" | null,
): boolean {
  if (recentIntent === "on") return true;
  if (recentIntent === "off") return false;
  return incomingOnTest;
}

/** Historic rows can include a call-list email. Clients SELECT this cache. */
export function redactLanvacHistoricText(value: string): string {
  return value.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]");
}

export function parseNotifyList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function unusedZoneNumbers(used: Iterable<number>, through = 64): number[] {
  const taken = new Set(used);
  const highest = taken.size ? Math.max(...taken) : 0;
  const limit = Math.min(999, Math.max(through, highest + 8));
  const unused: number[] = [];
  for (let number = 1; number <= limit; number += 1) {
    if (!taken.has(number)) unused.push(number);
  }
  return unused;
}

export function zoneOccupiedMessage(zoneNumber: number, description: string): string {
  const label = description.trim() || "a zone";
  return `Zone ${zoneNumber} is already ${label}. Delete it first or pick another number.`;
}

export function zoneWriteReason(
  action: "create" | "update" | "delete",
  zoneNumber: number,
  description: string,
): string {
  const label = description.trim() || "zone";
  const verb = action === "create" ? "Added" : action === "delete" ? "Deleted" : "Updated";
  return `${verb} zone #${zoneNumber} ${label}`.slice(0, 300);
}
