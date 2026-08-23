import {
  formatHourMinute,
  formatLanvacHistoricDay,
  formatLanvacHistoricTime,
  formatLanvacHistoricWhen,
  parseLanvacHistoricParts,
  type LanvacSignalClass,
} from "@/lib/portal/lanvac-signals";

export const LANVAC_HISTORIC_PAGE_SIZE = 50;
export const LANVAC_HISTORIC_MAX_PAGES = 6;

export type HistoricKind =
  | "alarm"
  | "restore"
  | "on_test"
  | "off_test"
  | "viewed"
  | "email"
  | "open_close"
  | "other";

export type HistoricFilterId = "all" | HistoricKind;

export const HISTORIC_FILTERS: Array<{ id: HistoricFilterId; label: string }> = [
  { id: "all", label: "All events" },
  { id: "alarm", label: "Alarms" },
  { id: "restore", label: "Restores" },
  { id: "on_test", label: "On test" },
  { id: "off_test", label: "Off test" },
  { id: "viewed", label: "File viewed" },
  { id: "email", label: "Emails" },
  { id: "open_close", label: "Open / close" },
  { id: "other", label: "Other" },
];

export type HistoricSource = {
  occurredAtText: string;
  signal: string;
  description: string;
  signalClass: LanvacSignalClass;
};

export type HistoricEvent = {
  id: string;
  kind: HistoricKind;
  title: string;
  summary: string | null;
  details: string[];
  timeLabel: string;
  whenLabel: string;
  dayKey: string;
  dayLabel: string;
  signals: string[];
};

export type HistoricDayGroup = {
  dayKey: string;
  dayLabel: string;
  events: HistoricEvent[];
};

const BURST_MS = 20_000;

export function isHistoricSeparator(description: string): boolean {
  const trimmed = description.trim();
  return /^[-_=.]{6,}$/.test(trimmed);
}

export function historicKind(input: {
  description: string;
  signalClass: string;
}): HistoricKind | "separator" {
  const text = input.description.trim().toUpperCase();
  if (isHistoricSeparator(text)) return "separator";
  if (text.includes("CUSTOMER FILE VIEWED") || text.includes("FILE VIEWED")) {
    return "viewed";
  }
  if (
    text.includes("STOP TESTING") ||
    text.includes("STOP/FINISH") ||
    text.includes("ON-TEST END")
  ) {
    return "off_test";
  }
  if (text.includes("ON-TEST") || text.includes("ON TEST")) return "on_test";
  if (text.includes("[E-MAIL]") || text.startsWith("[E-MAIL]")) return "email";
  if (input.signalClass === "alarm") return "alarm";
  if (input.signalClass === "restore") return "restore";
  if (input.signalClass === "open_close") return "open_close";
  return "other";
}

function historicStamp(raw: string): number | null {
  const parts = parseLanvacHistoricParts(raw);
  if (!parts) return null;
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function titleCaseName(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function rewriteEmbeddedWhen(value: string): string {
  return value
    .replace(
      /\b(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?\b/g,
      (full) => formatLanvacHistoricWhen(full),
    )
    .replace(
      /\b(\d{1,2}):(\d{2})\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})\b/g,
      (_full, hour, minute, mon, day, year) => {
        const months: Record<string, number> = {
          jan: 1,
          feb: 2,
          mar: 3,
          apr: 4,
          may: 5,
          jun: 6,
          jul: 7,
          aug: 8,
          sep: 9,
          oct: 10,
          nov: 11,
          dec: 12,
        };
        const month = months[String(mon).toLowerCase()];
        if (!month) return _full;
        return formatLanvacHistoricWhen(
          `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}-${year} ${String(hour).padStart(2, "0")}:${minute}:00`,
        );
      },
    )
    .replace(/\b(\d{1,2})\s*Hour\s*(\d{1,2})\s*Min\b/gi, (_full, hour, minute) =>
      formatHourMinute(Number(hour), Number(minute)),
    )
    .replace(/\s*\[EST\]\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanPerson(value: string): string | null {
  const match = value.match(/\b(?:BY[:\s]+)?(?:MOBI|WEB)\s+(.+)$/i);
  if (match) {
    const channel = value.toUpperCase().includes("WEB") ? "Web" : "Mobi";
    return `${titleCaseName(match[1])} (${channel})`;
  }
  const by = value.match(/\bBY[:\s]+(.+)$/i);
  return by ? titleCaseName(by[1]) : null;
}

function zoneFrom(value: string): string | null {
  const match = value.match(/\bZONE[:\s]*0*(\d+)/i);
  return match ? `Zone ${Number(match[1])}` : null;
}

function rewriteLine(description: string): string | null {
  const raw = description.trim();
  if (!raw || isHistoricSeparator(raw)) return null;
  const upper = raw.toUpperCase();
  if (/^\[E-MAIL\]\s*>>\s*\[EMAIL\]$/.test(upper)) return "Station email sent";
  if (upper.includes("CUSTOMER FILE VIEWED") || upper.includes("FILE VIEWED")) {
    const person = cleanPerson(raw);
    return person ? `File viewed by ${person}` : "File viewed at the station";
  }
  if (upper.includes("STOP TESTING")) {
    const person = cleanPerson(raw);
    return person ? `Stopped by ${person}` : "Test ended";
  }
  if (/^\d{3,}\s*>>\s*[A-Z0-9]+$/.test(upper.replace(/^\[ON-TEST\]\s*/i, "").trim())) {
    return null;
  }

  const reference = raw.match(/REFERENCE#?\s*>>?\s*([A-Z0-9-]+)/i);
  if (reference) return `Reference ${reference[1]}`;

  const person = cleanPerson(raw);
  if (person && (upper.includes("BY:") || upper.includes(" BY "))) {
    return `By ${person}`;
  }

  if (upper.includes("[E-MAIL]") && (upper.includes("SENT") || upper.includes("ALER"))) {
    if (upper.includes("ON-TEST END")) return "Station emailed that the test ended";
    if (upper.includes("ON-TEST BEGIN")) return "Station emailed that the test started";
    if (upper.includes("MODIFICATION")) return "Modification email sent";
    if (upper.includes("ALER")) return "Alert email sent";
    return "Station email sent";
  }

  let text = raw
    .replace(/^\[ON-TEST\]\s*>?\s*/i, "")
    .replace(/^\[E-MAIL\]\s*>?\s*/i, "")
    .replace(/\bSTOP\/FINISH\s*>?\s*/gi, "")
    .replace(/\s*>+\s*/g, " · ")
    .replace(/\s{2,}/g, " ")
    .trim();
  text = rewriteEmbeddedWhen(text);

  const zone = zoneFrom(raw);
  if (zone && /^ZONE[:\s]*0*\d+$/i.test(text.replace(/^·\s*/, ""))) return zone;
  if (/^TO[:\s]/i.test(text)) return `Until ${text.replace(/^TO[:\s]+/i, "")}`;
  if (/^FROM[:\s]/i.test(text)) return `From ${text.replace(/^FROM[:\s]+/i, "")}`;
  if (/^AT[:\s]/i.test(text)) return `At ${text.replace(/^AT[:\s]+/i, "")}`;

  const alarm = raw.match(/ALARM\(\(([^)]+)\)\)/i);
  if (alarm) {
    return `${titleCaseName(alarm[1])} alarm${zone ? ` · ${zone}` : ""}`;
  }
  if (/^RESTORE\b/i.test(text)) {
    return `Restore${zone ? ` · ${zone}` : ""}`;
  }

  return text || null;
}

function pickTitle(kind: HistoricKind, details: string[]): string {
  switch (kind) {
    case "alarm":
      return details.find((line) => /alarm/i.test(line)) ?? "Alarm";
    case "restore":
      return details.find((line) => /restore/i.test(line)) ?? "Restore";
    case "on_test":
      return "On test";
    case "off_test":
      return "Off test";
    case "viewed":
      return "File viewed";
    case "email":
      return "Station email";
    case "open_close":
      return "Open / close";
    default:
      return details[0] ?? "Station event";
  }
}

function pickSummary(kind: HistoricKind, details: string[]): string | null {
  const person = details.find((line) => /^(Stopped by|By |File viewed by)/i.test(line));
  const zone = details.find((line) => /^Zone \d+$/i.test(line));
  if (kind === "on_test" || kind === "off_test") {
    return [zone, person].filter(Boolean).join(" · ") || null;
  }
  if (kind === "viewed") {
    return details.find((line) => line.startsWith("File viewed")) ?? person ?? null;
  }
  if (kind === "email") return details[0] ?? null;
  if (kind === "alarm" || kind === "restore") return zone ?? null;
  return details[1] ?? null;
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(value);
  }
  return next;
}

export function historicEventTone(kind: HistoricKind): string {
  switch (kind) {
    case "alarm":
      return "border-red-500/40 bg-red-500/10";
    case "restore":
      return "border-emerald-500/30 bg-emerald-500/10";
    case "on_test":
      return "border-amber-500/35 bg-amber-500/10";
    case "off_test":
      return "border-orange-500/30 bg-orange-500/10";
    case "viewed":
      return "border-violet-500/25 bg-violet-500/10";
    case "email":
      return "border-white/15 bg-white/5";
    case "open_close":
      return "border-sky-500/20 bg-sky-500/5";
    default:
      return "border-white/10 bg-background";
  }
}

export function historicKindLabel(kind: HistoricKind): string {
  switch (kind) {
    case "alarm":
      return "Alarm";
    case "restore":
      return "Restore";
    case "on_test":
      return "On test";
    case "off_test":
      return "Off test";
    case "viewed":
      return "Viewed";
    case "email":
      return "Email";
    case "open_close":
      return "Open / close";
    default:
      return "Other";
  }
}

function buildEvent(rows: HistoricSource[], startIndex: number): HistoricEvent | null {
  const first = rows[0];
  if (!first) return null;
  const kinds = rows
    .map((row) => historicKind(row))
    .filter((kind): kind is HistoricKind => kind !== "separator");
  if (kinds.length === 0) return null;
  const kind = kinds.find((item) => item !== "email") ?? kinds[0];
  const details = unique(rows.map((row) => rewriteLine(row.description)).filter((line): line is string => Boolean(line)));
  const day = formatLanvacHistoricDay(first.occurredAtText);
  const title = pickTitle(kind, details);
  const summary = pickSummary(kind, details);
  const leftover = details.filter((line) => {
    if (line === title || line === summary) return false;
    if (
      line === "Station email sent" &&
      details.some((other) => other !== line && /email/i.test(other))
    ) {
      return false;
    }
    return true;
  });
  return {
    id: `${first.occurredAtText}-${first.signal}-${startIndex}`,
    kind,
    title,
    summary,
    details: leftover,
    timeLabel: formatLanvacHistoricTime(first.occurredAtText) ?? formatLanvacHistoricWhen(first.occurredAtText),
    whenLabel: formatLanvacHistoricWhen(first.occurredAtText),
    dayKey: day?.key ?? first.occurredAtText.slice(0, 10),
    dayLabel: day?.label ?? first.occurredAtText,
    signals: unique(rows.map((row) => row.signal).filter(Boolean)),
  };
}

export function presentHistoricSignals(rows: HistoricSource[]): HistoricEvent[] {
  const events: HistoricEvent[] = [];
  let burst: HistoricSource[] = [];
  let burstKind: HistoricKind | null = null;
  let burstStamp: number | null = null;
  let startIndex = 0;

  function flush() {
    const event = buildEvent(burst, startIndex);
    if (event) events.push(event);
    burst = [];
    burstKind = null;
    burstStamp = null;
  }

  rows.forEach((row, index) => {
    const kind = historicKind(row);
    if (kind === "separator") return;
    const stamp = historicStamp(row.occurredAtText);
    const attachEmail = kind === "email" && burst.length > 0 && burstKind != null && burstKind !== "email";
    const sameBurst =
      burst.length > 0 &&
      burstKind != null &&
      (kind === burstKind || attachEmail) &&
      stamp != null &&
      burstStamp != null &&
      Math.abs(stamp - burstStamp) <= BURST_MS;

    if (!sameBurst && burst.length > 0) flush();
    if (burst.length === 0) startIndex = index;
    burst.push(row);
    if (burstKind == null || burstKind === "email") burstKind = kind;
    if (stamp != null) burstStamp = burstStamp ?? stamp;
  });

  flush();
  return events;
}

export function groupHistoricEventsByDay(events: HistoricEvent[]): HistoricDayGroup[] {
  const groups: HistoricDayGroup[] = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last && last.dayKey === event.dayKey) {
      last.events.push(event);
    } else {
      groups.push({
        dayKey: event.dayKey,
        dayLabel: event.dayLabel,
        events: [event],
      });
    }
  }
  return groups;
}

export function filterHistoricEvents(
  events: HistoricEvent[],
  filter: HistoricFilterId,
  dayKey: string | "all",
): HistoricEvent[] {
  return events.filter((event) => {
    if (filter !== "all" && event.kind !== filter) return false;
    if (dayKey !== "all" && event.dayKey !== dayKey) return false;
    return true;
  });
}
