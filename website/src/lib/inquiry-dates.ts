/** Office pickup hours (Mon–Fri, 8 AM to 4 PM). */
export const RENTAL_PICKUP_TIME_SLOTS = [
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

/** @deprecated Use RENTAL_PICKUP_TIME_SLOTS */
export const RENTAL_TIME_SLOTS = RENTAL_PICKUP_TIME_SLOTS;

export type RentalTimeSlot = (typeof RENTAL_PICKUP_TIME_SLOTS)[number];

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
  return `${dateLabel} · pickup time not selected yet`;
}

/** Return drop-off: any day, any time (porch/garage). */
export function formatRentalReturnDate(isoDate: string): string {
  const dateLabel = formatRentalDateLong(isoDate) ?? isoDate;
  return `${dateLabel} · drop off anytime`;
}

export function isWeekdayIso(isoDate: string): boolean {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return false;

  const dayOfWeek = new Date(year, month - 1, day).getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}
