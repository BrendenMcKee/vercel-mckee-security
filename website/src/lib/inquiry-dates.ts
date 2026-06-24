/** Office pickup/return hours (Mon–Fri). */
export const RENTAL_TIME_SLOTS = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
] as const;

export type RentalTimeSlot = (typeof RENTAL_TIME_SLOTS)[number];

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatRentalDateLong(isoDate: string | undefined): string | null {
  if (!isoDate) return null;

  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRentalSchedule(isoDate: string, time?: string): string {
  const dateLabel = formatRentalDateLong(isoDate) ?? isoDate;
  if (time?.trim()) {
    return `${dateLabel} · around ${time.trim()}`;
  }
  return dateLabel;
}
