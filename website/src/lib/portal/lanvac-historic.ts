import {
  formatHourMinute,
  formatLanvacHistoricDay,
  formatLanvacHistoricShortWhen,
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
  | "call_list"
  | "dispatch"
  | "override"
  | "other";

export type HistoricFilterId = "all" | HistoricKind;

export const HISTORIC_FILTERS: Array<{ id: HistoricFilterId; label: string }> = [
  { id: "all", label: "All Events" },
  { id: "alarm", label: "Alarms" },
  { id: "restore", label: "Restores" },
  { id: "on_test", label: "On Test" },
  { id: "off_test", label: "Off Test" },
  { id: "viewed", label: "File Viewed" },
  { id: "email", label: "Emails" },
  { id: "open_close", label: "Open / Close" },
  { id: "call_list", label: "Call List" },
  { id: "dispatch", label: "Station Calls" },
  { id: "override", label: "Override" },
  { id: "other", label: "Other" },
];

export type HistoricSource = {
  occurredAtText: string;
  signal: string;
  description: string;
  signalClass: LanvacSignalClass;
};

export type HistoricZoneHint = {
  zoneNumber: number;
  description: string;
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
const NEARBY_MS = 5_000;

const LOOSE_ANCHOR_KINDS = new Set<HistoricKind>([
  "call_list",
  "on_test",
  "off_test",
  "viewed",
  "override",
  "dispatch",
  "email",
]);

const OVERRIDE_CODES: Record<string, string> = {
  FA: "Fire alarm",
  BUR: "Burglar alarm",
  OPN: "Opening",
  CLS: "Closing",
  ADV: "Advise",
  PAN: "Panic",
  CO: "Carbon monoxide",
  SUP: "Supervisory",
};

export function isHistoricSeparator(description: string): boolean {
  const trimmed = description.trim();
  return /^[-_=.]{6,}$/.test(trimmed);
}

function isLooseDetail(description: string): boolean {
  const trimmed = description.trim();
  const upper = trimmed.toUpperCase();
  if (/^\[E-MAIL\]\s*>>\s*\[EMAIL\]$/.test(upper)) return true;
  if (/^\d{3,}\s*>>\s*[A-Z0-9]+$/.test(upper.replace(/^\[ON-TEST\]\s*/i, "").trim())) {
    return true;
  }
  if (/^ZONE[:\s]*0*\d+$/i.test(trimmed)) return true;
  if (/^(TO|FROM|AT)[:\s]/i.test(trimmed)) return true;
  if (/^BY[\s:]/i.test(trimmed) && !/FILE VIEWED|STOP TESTING|ON-TEST|UPDATE CALL/i.test(upper)) {
    return true;
  }
  return false;
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
  if (text.includes("UPDATE CALL-LIST") || text.includes("UPDATE CALL LIST")) {
    return "call_list";
  }
  if (
    text.includes("OVERIDE") ||
    text.includes("OVERRIDE") ||
    text.includes("SENT TO SUPERVISOR")
  ) {
    return "override";
  }
  if (
    text.includes("REFERENCE CALL") ||
    text.includes("CALLING PREMISES") ||
    text.includes("CALL TO PREMISES") ||
    text.includes("SPOKE TO") ||
    /RING:\s*\d+/i.test(input.description)
  ) {
    return "dispatch";
  }
  if (text.includes("[E-MAIL]") || text.startsWith("[E-MAIL]")) return "email";
  if (text.includes("SUMMARY") && /LAST\s+\d+\s*HRS?/.test(text)) return "email";
  if (text.includes("SIGNAL COMING FROM") && text.includes("ALARMNET")) return "alarm";
  if (input.signalClass === "alarm") return "alarm";
  if (input.signalClass === "restore" || input.signalClass === "comm_restore") {
    return "restore";
  }
  if (
    text.includes("COMMUNICATION RESTORE") ||
    text.includes("AFTER ALARM") ||
    /^RESTORE\b/.test(text)
  ) {
    return "restore";
  }
  if (input.signalClass === "on_test") return "on_test";
  if (input.signalClass === "open_close") return "open_close";
  if (text.includes("OPENING") || text.includes("CLOSING")) return "open_close";
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
    .map((word) => {
      if (/^[a-z]\.$/i.test(word)) return word.toUpperCase();
      const lower = word.toLowerCase();
      if (/^mc[a-z]/.test(lower) && lower.length > 3) {
        return `Mc${lower.charAt(2).toUpperCase()}${lower.slice(3)}`;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
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

function stripDealerNumber(value: string): string {
  return value.replace(/\b\d{4,5}\s+(?=[A-Za-z])/g, "").trim();
}

function cleanPerson(value: string): string | null {
  const supervisor = value.match(/\b(?:BY\s+)?SUPERVISOR\s*:?\s*(.+)$/i);
  if (supervisor) return `Supervisor ${titleCaseName(supervisor[1])}`;
  const operator = value.match(/\b(?:BY\s+)?OPR\s*:?\s*(.+)$/i);
  if (operator) return `Operator ${titleCaseName(operator[1])}`;

  const match = value.match(/\b(?:BY[:\s]+)?(?:MOBI|WEB)\s+(.+)$/i);
  if (match) {
    const channel = value.toUpperCase().includes("WEB") ? "Web" : "Mobi";
    return `${titleCaseName(stripDealerNumber(match[1]))} (${channel})`;
  }
  const by = value.match(/\bBY[:\s]+(.+)$/i);
  if (!by) return null;
  const rest = stripDealerNumber(by[1].replace(/\s*\((MOBI|WEB)\)\s*$/i, "").trim());
  const channel = /\bWEB\b/i.test(value) ? "Web" : /\bMOBI\b/i.test(value) ? "Mobi" : null;
  const name = titleCaseName(rest);
  return channel ? `${name} (${channel})` : name;
}

function zoneNumberFrom(value: string): number | null {
  const match = value.match(/\bZONE[:\s#]*0*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function zoneFrom(value: string, zones?: HistoricZoneHint[]): string | null {
  const number = zoneNumberFrom(value);
  if (number == null) return null;
  const hint = zones?.find((zone) => zone.zoneNumber === number);
  const name = hint?.description.trim();
  return name ? `Zone ${number} · ${titleCaseName(name)}` : `Zone ${number}`;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw.trim();
}

function formatTalkTime(minutes: number, seconds: number): string {
  if (minutes <= 0) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  if (seconds === 0) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return `${minutes} min ${seconds} sec`;
}

function formatCallMeta(text: string): string | null {
  if (!/RING\s*:|CALL\s*DUR|OP\s*:/i.test(text)) return null;
  const ring = text.match(/RING\s*:\s*(\d+)/i);
  const dur = text.match(/CALL\s*DUR(?:ATION)?\s*:\s*(\d{1,2}):(\d{2})/i);
  const op = text.match(/\bOP\s*:\s*(?:\d+\s*)?([A-Za-z][A-Za-z .'-]*)/i);
  const parts: string[] = [];
  if (ring) parts.push(`Ring ${ring[1]}`);
  if (dur) parts.push(formatTalkTime(Number(dur[1]), Number(dur[2])));
  if (op) parts.push(`Operator ${titleCaseName(op[1].trim())}`);
  return parts.join(" · ") || null;
}

function decodeOverrideToken(token: string): string {
  const upper = token.toUpperCase();
  return OVERRIDE_CODES[upper] ?? titleCaseName(token);
}

function decodeOverrideCodes(value: string): string | null {
  const match = value.match(
    /(?:OVERIDE|OVERRIDE)\s*:?\s*(.+)$/i,
  );
  if (!match) return null;
  const tokens = match[1]
    .replace(/[·>•]/g, " ")
    .trim()
    .split(/[\s/,]+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.map(decodeOverrideToken).join(" · ");
}

function alarmTypeFrom(value: string): string | null {
  const typed = value.match(/ALARM\(\(([^)]+)\)\)/i);
  if (typed) return `${titleCaseName(typed[1])} Alarm`;
  if (/\bFIRE\b/i.test(value) && /ALARM/i.test(value)) return "Fire Alarm";
  if (/\bBUR(?:GLAR)?\b/i.test(value) && /ALARM/i.test(value)) return "Burglar Alarm";
  if (/\bPANIC\b/i.test(value)) return "Panic Alarm";
  if (/\bSUPERVISORY\b/i.test(value)) return "Supervisory";
  return null;
}

function userAreaFrom(value: string): string | null {
  const user = value.match(/\bUSER\s*:?\s*0*(\d+)/i);
  const area = value.match(/\bAREA\s*:?\s*0*(\d+)/i);
  const parts: string[] = [];
  if (user && Number(user[1]) > 0) parts.push(`User ${Number(user[1])}`);
  if (area) parts.push(`Area ${Number(area[1])}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function rewriteLine(description: string, zones?: HistoricZoneHint[]): string | null {
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

  const callMeta = formatCallMeta(raw);
  if (callMeta) return callMeta;

  if (upper.includes("UPDATE CALL-LIST") || upper.includes("UPDATE CALL LIST")) {
    const slot = raw.match(/#\s*(\d+)/);
    return slot ? `Call List Updated · Contact #${slot[1]}` : "Call List Updated";
  }

  if (upper.includes("REFERENCE CALL")) {
    const number = raw.match(/REFERENCE\s*CALL\s*NUMBER\s*[·:>\s]*([A-Z0-9-]+)/i);
    return number
      ? `Station Call · Reference ${number[1]}`
      : "Station Call";
  }
  if (upper.includes("CALLING PREMISES")) {
    const phone = raw.match(/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
    return phone
      ? `Calling the property · ${formatPhone(phone[1])}`
      : "Calling the property";
  }
  if (upper.includes("CALL TO PREMISES") && upper.includes("END")) {
    const phone = raw.match(/(\d{10,11})/);
    return phone
      ? `Call to the property ended · ${formatPhone(phone[1])}`
      : "Call to the property ended";
  }
  if (upper.includes("SPOKE TO")) {
    const who = raw.replace(/^.*SPOKE TO\s*[·:>\s]*/i, "").trim();
    return who ? `Spoke with ${titleCaseName(who)}` : "Spoke with someone on the call list";
  }

  if (upper.includes("SENT TO SUPERVISOR")) {
    const codes = decodeOverrideCodes(raw);
    return codes
      ? `Sent to supervisor for override · ${codes}`
      : "Sent to supervisor for override";
  }
  if (/^\s*OVERIDE\s*:?\s*$/i.test(raw) || /^\s*OVERRIDE\s*:?\s*$/i.test(raw)) {
    return "Supervisor override";
  }
  if (upper.includes("OVERIDE") || upper.includes("OVERRIDE")) {
    const codes = decodeOverrideCodes(raw);
    return codes ? `Supervisor override · ${codes}` : "Supervisor override";
  }

  if (upper.includes("CUSTOMER RESPONDING") || upper.includes("COMMUNICATION RESTORE")) {
    return "Communication Restore";
  }

  if (/SIGNAL COMING FROM\s+ALARMNET/i.test(raw)) {
    return "Came in through AlarmNet";
  }

  const reference = raw.match(/REFERENCE#?\s*>>?\s*([A-Z0-9-]+)/i);
  if (reference) return `Reference ${reference[1]}`;

  const person = cleanPerson(raw);
  if (person && (upper.includes("BY:") || upper.includes(" BY ") || /^BY\s/i.test(raw))) {
    return `By ${person}`;
  }

  if (upper.includes("[E-MAIL]") && (upper.includes("SENT") || upper.includes("ALER"))) {
    if (upper.includes("ON-TEST END")) return "Station emailed that the test ended";
    if (upper.includes("ON-TEST BEGIN")) return "Station emailed that the test started";
    if (upper.includes("MODIFICATION")) return "Modification email sent";
    if (upper.includes("ALER")) return "Alert email sent";
    return "Station email sent";
  }

  if (upper.includes("SUMMARY") && upper.includes("LAST") && /HRS?/.test(upper)) {
    const hours = raw.match(/LAST\s+(\d+)\s*HRS?/i);
    const at = raw.match(/ALARM\s+AT\s+(\d{1,2}):(\d{2})/i);
    const when = at ? formatHourMinute(Number(at[1]), Number(at[2])) : null;
    return [
      hours ? `${hours[1]}-hour summary email` : "Summary email",
      when ? `Alarm at ${when}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  let text = raw
    .replace(/^\[ON-TEST\]\s*>?\s*/i, "")
    .replace(/^\[E-MAIL\]\s*>?\s*/i, "")
    .replace(/\bSTOP\/FINISH\s*>?\s*/gi, "")
    .replace(/^[A-Z]\d{3,}\s*[·>]\s*/i, "")
    .replace(/\s*>+\s*/g, " · ")
    .replace(/\s{2,}/g, " ")
    .trim();
  text = rewriteEmbeddedWhen(text);

  const zone = zoneFrom(raw, zones);
  if (zone && /^ZONE[:\s]*0*\d+$/i.test(text.replace(/^·\s*/, ""))) return zone;
  if (/^TO[:\s]/i.test(text)) return `Until ${text.replace(/^TO[:\s]+/i, "")}`;
  if (/^FROM[:\s]/i.test(text)) return `From ${text.replace(/^FROM[:\s]+/i, "")}`;
  if (/^AT[:\s]/i.test(text)) return `At ${text.replace(/^AT[:\s]+/i, "")}`;

  const alarm = alarmTypeFrom(raw);
  if (alarm) return zone ? `${alarm} · ${zone}` : alarm;

  if (/^RESTORE\b/i.test(text) || /^AFTER ALARM\b/i.test(text)) {
    const after = /^AFTER ALARM\b/i.test(text);
    const who = userAreaFrom(raw);
    return [after ? "After alarm" : "Restore", zone, who].filter(Boolean).join(" · ");
  }

  if (/\bOPENING\b/i.test(text)) {
    return ["System Opened (Disarmed)", userAreaFrom(raw)].filter(Boolean).join(" · ");
  }
  if (/\bCLOSING\b/i.test(text)) {
    return ["System Closed (Armed)", userAreaFrom(raw)].filter(Boolean).join(" · ");
  }

  if (/\bSUPERVISORY\b/i.test(text)) {
    return zone ? `Supervisory · ${zone}` : "Supervisory";
  }

  return text || null;
}

function pickTitle(kind: HistoricKind, details: string[]): string {
  switch (kind) {
    case "alarm": {
      const typed = details.find(
        (line) =>
          /alarm|supervisory/i.test(line) &&
          !/received through|alarmnet/i.test(line),
      );
      if (typed) return typed;
      const zone = details.find((line) => /Zone \d+/i.test(line));
      if (details.some((line) => /alarmnet/i.test(line))) {
        return zone ? `Alarm via AlarmNet · ${zone}` : "AlarmNet Communicator";
      }
      return zone ? `Alarm · ${zone}` : "Alarm";
    }
    case "restore": {
      const communication = details.find((line) => /communication restore/i.test(line));
      if (communication) return communication;
      const after = details.find((line) => /after alarm/i.test(line));
      if (after) return after;
      const zoned = details.find((line) => /restore/i.test(line) && /zone \d+/i.test(line));
      if (zoned) return zoned;
      const zone = details.find((line) => /Zone \d+/i.test(line));
      if (zone) return `Restore · ${zone}`;
      return "Communication Restore";
    }
    case "on_test":
      return "On Test";
    case "off_test":
      return "Off Test";
    case "viewed":
      return "File Viewed";
    case "email":
      return "Station Email";
    case "open_close":
      return (
        details.find((line) => /system opened|system closed/i.test(line)) ??
        "Open / Close"
      );
    case "call_list":
      return details.find((line) => /call list/i.test(line)) ?? "Call List Updated";
    case "dispatch":
      return (
        details.find((line) => /station call|calling the property|spoke with/i.test(line)) ??
        "Station Call"
      );
    case "override":
      return (
        details.find((line) => /override|supervisor/i.test(line)) ??
        "Supervisor Override"
      );
    default:
      return details[0] ?? "Station Event";
  }
}

function pickSummary(kind: HistoricKind, details: string[], title: string): string | null {
  const person = details.find((line) => /^(Stopped by|By |File viewed by)/i.test(line));
  const zone = details.find((line) => /^Zone \d+/i.test(line));
  if (kind === "on_test" || kind === "off_test") {
    return [zone, person].filter(Boolean).join(" · ") || null;
  }
  if (kind === "viewed") {
    return details.find((line) => line.startsWith("File viewed")) ?? person ?? null;
  }
  if (kind === "call_list") {
    return person ?? "The station contact list was changed.";
  }
  if (kind === "dispatch") {
    if (/spoke with/i.test(title)) return "The station reached someone on the call list.";
    const extra = details.find(
      (line) =>
        line !== title && /ring |operator |spoke |call to the property/i.test(line),
    );
    return extra ?? "The monitoring station placed a call.";
  }
  if (kind === "override") {
    return "A station supervisor approved how this signal was handled.";
  }
  if (kind === "open_close") {
    if (/opened/i.test(title)) return "Someone turned the system off (disarmed).";
    if (/closed/i.test(title)) return "Someone turned the system on (armed).";
    return "Opening is disarmed. Closing is armed.";
  }
  if (kind === "restore") {
    if (/communication restore/i.test(title) || !zone) {
      return "The communicator checked in again. The station can reach the system.";
    }
    return `${zone} returned to normal after an alarm.`;
  }
  if (kind === "alarm") {
    if (/supervisory/i.test(title)) {
      return "A monitored device is off-normal. This is not a full alarm.";
    }
    if (/alarmnet communicator/i.test(title) || (details.some((line) => /alarmnet/i.test(line)) && !zone && !/zone \d+/i.test(title))) {
      return "No zone was listed. This is a communicator report, not a sensor.";
    }
    const path = details.find((line) => /alarmnet/i.test(line));
    return [zone && !title.includes(zone) ? zone : null, path].filter(Boolean).join(" · ") || path || zone || null;
  }
  if (kind === "email") return details[0] ?? null;
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

function compactOnTestDetails(details: string[]): string[] {
  const from = details.find((line) => /^From /i.test(line));
  const until = details.find((line) => /^Until /i.test(line));
  if (!from || !until) return details;
  return details
    .filter((line) => line !== from && line !== until)
    .concat(`${from} to ${until.replace(/^Until /i, "")}`);
}

function leftoverDetails(
  kind: HistoricKind,
  title: string,
  summary: string | null,
  details: string[],
): string[] {
  const haystack = `${title} ${summary ?? ""}`.toLowerCase();
  const compact = kind === "on_test" || kind === "off_test" ? compactOnTestDetails(details) : details;
  return compact.filter((line) => {
    const lower = line.toLowerCase();
    if (lower === title.toLowerCase() || (summary && lower === summary.toLowerCase())) return false;
    if (
      line === "Station email sent" &&
      details.some((other) => other !== line && /email/i.test(other))
    ) {
      return false;
    }
    if (/^zone \d+/i.test(line) && haystack.includes(lower)) return false;
    if (/^by /i.test(line) && haystack.includes(line.replace(/^by /i, "").toLowerCase())) {
      return false;
    }
    if (kind === "override" && /supervisor override$/i.test(line)) return false;
    return true;
  });
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
    case "call_list":
      return "border-fuchsia-500/20 bg-fuchsia-500/5";
    case "dispatch":
      return "border-indigo-400/25 bg-indigo-500/10";
    case "override":
      return "border-amber-400/25 bg-amber-500/5";
    default:
      return "border-white/10 bg-background";
  }
}

export function historicFilterChipTone(id: HistoricFilterId, active: boolean): string {
  if (id === "all") {
    return active
      ? "border-white/45 bg-white/15 text-white"
      : "border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/5";
  }
  switch (id) {
    case "alarm":
      return active
        ? "border-red-400/70 bg-red-500/25 text-red-50"
        : "border-red-500/15 bg-red-500/5 text-red-100/45 hover:bg-red-500/10";
    case "restore":
      return active
        ? "border-emerald-400/70 bg-emerald-500/25 text-emerald-50"
        : "border-emerald-500/15 bg-emerald-500/5 text-emerald-100/45 hover:bg-emerald-500/10";
    case "on_test":
      return active
        ? "border-amber-400/70 bg-amber-500/25 text-amber-50"
        : "border-amber-500/15 bg-amber-500/5 text-amber-100/45 hover:bg-amber-500/10";
    case "off_test":
      return active
        ? "border-orange-400/70 bg-orange-500/25 text-orange-50"
        : "border-orange-500/15 bg-orange-500/5 text-orange-100/45 hover:bg-orange-500/10";
    case "viewed":
      return active
        ? "border-violet-400/70 bg-violet-500/25 text-violet-50"
        : "border-violet-500/15 bg-violet-500/5 text-violet-100/45 hover:bg-violet-500/10";
    case "email":
      return active
        ? "border-white/40 bg-white/15 text-white"
        : "border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/5";
    case "open_close":
      return active
        ? "border-sky-400/70 bg-sky-500/25 text-sky-50"
        : "border-sky-500/15 bg-sky-500/5 text-sky-100/45 hover:bg-sky-500/10";
    case "call_list":
      return active
        ? "border-fuchsia-400/70 bg-fuchsia-500/25 text-fuchsia-50"
        : "border-fuchsia-500/15 bg-fuchsia-500/5 text-fuchsia-100/45 hover:bg-fuchsia-500/10";
    case "dispatch":
      return active
        ? "border-indigo-400/70 bg-indigo-500/25 text-indigo-50"
        : "border-indigo-400/15 bg-indigo-500/5 text-indigo-100/45 hover:bg-indigo-500/10";
    case "override":
      return active
        ? "border-yellow-400/70 bg-yellow-500/20 text-yellow-50"
        : "border-yellow-500/15 bg-yellow-500/5 text-yellow-100/45 hover:bg-yellow-500/10";
    default:
      return active
        ? "border-white/40 bg-white/15 text-white"
        : "border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/5";
  }
}

export function historicKindLabel(kind: HistoricKind): string {
  switch (kind) {
    case "alarm":
      return "Alarm";
    case "restore":
      return "Restore";
    case "on_test":
      return "On Test";
    case "off_test":
      return "Off Test";
    case "viewed":
      return "File Viewed";
    case "email":
      return "Email";
    case "open_close":
      return "Open / Close";
    case "call_list":
      return "Call List";
    case "dispatch":
      return "Station Call";
    case "override":
      return "Override";
    default:
      return "Other";
  }
}

function nearbyZoneText(
  rows: HistoricSource[],
  center: HistoricSource,
  zones?: HistoricZoneHint[],
): { zone: string | null; alarm: string | null } {
  const centerStamp = historicStamp(center.occurredAtText);
  const sameTime: HistoricSource[] = [];
  const near: HistoricSource[] = [];
  for (const row of rows) {
    if (row === center) continue;
    const kind = historicKind(row);
    if (kind === "on_test" || kind === "off_test" || kind === "separator") continue;
    if (!/ZONE[:\s#]*0*\d+/i.test(row.description)) continue;
    if (!/ALARM|RESTORE|AFTER ALARM/i.test(row.description)) continue;
    if (row.occurredAtText === center.occurredAtText) {
      sameTime.push(row);
      continue;
    }
    const stamp = historicStamp(row.occurredAtText);
    if (centerStamp == null || stamp == null || Math.abs(stamp - centerStamp) > NEARBY_MS) {
      continue;
    }
    near.push(row);
  }
  let zone: string | null = null;
  let alarm: string | null = null;
  for (const row of [...sameTime, ...near]) {
    zone ??= zoneFrom(row.description, zones);
    alarm ??= alarmTypeFrom(row.description);
  }
  return { zone, alarm };
}

function buildEvent(
  rows: HistoricSource[],
  allRows: HistoricSource[],
  startIndex: number,
  zones?: HistoricZoneHint[],
): HistoricEvent | null {
  const first = rows[0];
  if (!first) return null;
  const kinds = rows
    .map((row) => historicKind(row))
    .filter((kind): kind is HistoricKind => kind !== "separator");
  if (kinds.length === 0) return null;
  const kind =
    kinds.find((item) => item !== "email" && item !== "other") ??
    kinds.find((item) => item !== "other") ??
    kinds[0];
  const details = unique(
    rows
      .map((row) => rewriteLine(row.description, zones))
      .filter((line): line is string => Boolean(line)),
  );
  const nearby = nearbyZoneText(allRows, first, zones);
  if (kind === "alarm") {
    if (nearby.alarm && !details.some((line) => /alarm/i.test(line) && !/alarmnet|received through/i.test(line))) {
      details.unshift(nearby.zone ? `${nearby.alarm} · ${nearby.zone}` : nearby.alarm);
    } else if (nearby.zone && !details.some((line) => /^Zone \d+/i.test(line) || /Zone \d+/i.test(line))) {
      details.push(nearby.zone);
    }
  }
  const day = formatLanvacHistoricDay(first.occurredAtText);
  const title = pickTitle(kind, details);
  const summary = pickSummary(kind, details, title);
  return {
    id: `${first.occurredAtText}-${first.signal}-${startIndex}`,
    kind,
    title,
    summary,
    details: leftoverDetails(kind, title, summary, details),
    timeLabel: formatLanvacHistoricShortWhen(first.occurredAtText),
    whenLabel: formatLanvacHistoricWhen(first.occurredAtText),
    dayKey: day?.key ?? first.occurredAtText.slice(0, 10),
    dayLabel: day?.label ?? first.occurredAtText,
    signals: unique(rows.map((row) => row.signal).filter(Boolean)),
  };
}

export function presentHistoricSignals(
  rows: HistoricSource[],
  options?: { zones?: HistoricZoneHint[] },
): HistoricEvent[] {
  const events: HistoricEvent[] = [];
  let burst: HistoricSource[] = [];
  let burstKind: HistoricKind | null = null;
  let burstStamp: number | null = null;
  let startIndex = 0;
  const zones = options?.zones;

  function flush() {
    const event = buildEvent(burst, rows, startIndex, zones);
    if (event) events.push(event);
    burst = [];
    burstKind = null;
    burstStamp = null;
  }

  function peekAnchorKind(fromIndex: number, stamp: number | null): HistoricKind | null {
    for (let index = fromIndex + 1; index < rows.length && index <= fromIndex + 6; index += 1) {
      const next = rows[index];
      const nextKind = historicKind(next);
      if (nextKind === "separator" || isLooseDetail(next.description)) continue;
      const nextStamp = historicStamp(next.occurredAtText);
      if (stamp != null && nextStamp != null && Math.abs(nextStamp - stamp) > BURST_MS) break;
      if (nextKind !== "other" && LOOSE_ANCHOR_KINDS.has(nextKind)) return nextKind;
    }
    return null;
  }

  rows.forEach((row, index) => {
    const rawKind = historicKind(row);
    if (rawKind === "separator") return;
    const stamp = historicStamp(row.occurredAtText);
    const inheritBurst =
      burst.length > 0 &&
      burstKind != null &&
      LOOSE_ANCHOR_KINDS.has(burstKind) &&
      stamp != null &&
      burstStamp != null &&
      Math.abs(stamp - burstStamp) <= BURST_MS;
    const kind = isLooseDetail(row.description)
      ? peekAnchorKind(index, stamp) ?? (inheritBurst ? burstKind : null) ?? rawKind
      : rawKind;
    const attachEmail = kind === "email" && burst.length > 0 && burstKind != null && burstKind !== "email";
    const sameTestFamily =
      (kind === "on_test" || kind === "off_test") &&
      (burstKind === "on_test" || burstKind === "off_test");
    const sameBurst =
      burst.length > 0 &&
      burstKind != null &&
      (kind === burstKind || attachEmail || sameTestFamily) &&
      stamp != null &&
      burstStamp != null &&
      Math.abs(stamp - burstStamp) <= BURST_MS;

    if (!sameBurst && burst.length > 0) flush();
    if (burst.length === 0) startIndex = index;
    burst.push(row);
    if (burstKind == null || burstKind === "email" || (burstKind === "on_test" && kind === "off_test")) {
      burstKind = kind;
    }
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
