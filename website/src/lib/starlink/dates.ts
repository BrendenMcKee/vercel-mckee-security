/**
 * Date helpers for the Starlink rental system. All booking math operates on
 * `YYYY-MM-DD` strings (calendar dates, no time-of-day) to avoid timezone drift.
 */

const TORONTO_TZ = "America/Toronto";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's calendar date in America/Toronto as `YYYY-MM-DD`. */
export function todayIsoToronto(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isValidIsoDate(iso: string | undefined | null): iso is string {
  if (!iso || !ISO_DATE_RE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Add (or subtract) whole days to a `YYYY-MM-DD` string. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Inclusive list of dates from `startIso` to `endIso`. Capped for safety. */
export function eachDateIso(
  startIso: string,
  endIso: string,
  maxDays = 1000,
): string[] {
  const out: string[] = [];
  if (!isValidIsoDate(startIso) || !isValidIsoDate(endIso)) return out;
  if (endIso < startIso) return out;
  let cursor = startIso;
  let guard = 0;
  while (cursor <= endIso && guard < maxDays) {
    out.push(cursor);
    cursor = addDaysIso(cursor, 1);
    guard += 1;
  }
  return out;
}

/** Number of nights/days between two inclusive dates (>= 1). */
export function daysBetweenInclusive(startIso: string, endIso: string): number {
  if (!isValidIsoDate(startIso) || !isValidIsoDate(endIso)) return 0;
  const a = Date.parse(`${startIso}T00:00:00Z`);
  const b = Date.parse(`${endIso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000) + 1;
}

/** True when two inclusive date ranges overlap. */
export function rangesOverlapInclusive(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** Monday–Friday check for a `YYYY-MM-DD` date (uses UTC to stay stable). */
export function isWeekdayIsoUtc(iso: string): boolean {
  if (!isValidIsoDate(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day >= 1 && day <= 5;
}
