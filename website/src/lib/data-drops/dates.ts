import type { SignatureStatus } from "./types";

const MONTH_TO_NUM: Record<string, string> = {
  January: "01",
  February: "02",
  March: "03",
  April: "04",
  May: "05",
  June: "06",
  July: "07",
  August: "08",
  September: "09",
  October: "10",
  November: "11",
  December: "12",
};

/** Today as "YYYY-MM-DD". */
export function todayYmd(): string {
  return new Date().toISOString().split("T")[0];
}

/** Normalize a "YYYY-M-D" string (tolerating trailing commas) to "YYYY-MM-DD". */
export function toYmd(dateStr: string): string {
  const clean = dateStr.replace(/,+$/, "");
  const parts = clean.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return clean;
}

/** "2025-01-23" -> "January 23, 2025" (UTC-safe to avoid off-by-one shifts). */
export function ymdToLong(ymd: string): string {
  const date = new Date(`${toYmd(ymd)}T12:00:00Z`);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "January 23, 2025" -> "2025-01-23". Returns the input untouched if it does not match. */
export function longToYmd(long: string): string {
  const parts = long.replace(/,/g, "").split(" ");
  if (parts.length !== 3) return long;
  const [month, day, year] = parts;
  const num = MONTH_TO_NUM[month];
  if (!num) return long;
  return `${year}-${num}-${day.padStart(2, "0")}`;
}

/** Parse any drop.date ("YYYY-MM-DD" or ISO) to "YYYY-MM-DD", or null if invalid. */
export function anyToYmd(dateStr: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

export function signedStatus(
  tech: string | null | undefined,
  admin: string | null | undefined,
): SignatureStatus {
  const hasTech = Boolean(tech);
  const hasAdmin = Boolean(admin);
  if (hasTech && hasAdmin) return 2;
  if (hasTech || hasAdmin) return 1;
  return 0;
}
