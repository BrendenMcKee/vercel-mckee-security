/**
 * Shared write-gate and zone-type map (R54). Safe in client components.
 * Carbon monoxide write codes stay unproven. Do not guess on a live write.
 */

export const LANVAC_WRITE_TEST_ACCOUNT = "O5985";
export const LANVAC_ZONE_DESCRIPTION_MAX = 65;
export const LANVAC_ON_TEST_MINUTES = [15, 30, 60, 120] as const;
export const LANVAC_ON_TEST_DEFAULT_MINUTES = 60;
export const LANVAC_CLIENT_TEST_COOLDOWN_MS = 120_000;
export const LANVAC_ON_TEST_PULL_GRACE_MS = 45_000;
export const STATION_WRITES_NOT_LIVE = "Station writes are not live on this account.";

export const PROVEN_ZONE_WRITE_TYPES = ["FIR", "BUR", "LOW"] as const;
export type ProvenZoneWriteType = (typeof PROVEN_ZONE_WRITE_TYPES)[number];

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
  anyZoneOnTest: boolean;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  const until = input.onTestUntil ? new Date(input.onTestUntil) : null;
  return (
    input.anyZoneOnTest ||
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

export function parseNotifyList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}
