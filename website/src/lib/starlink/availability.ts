import { eachDateIso } from "./dates";

export type DateRange = { pickup_date: string; return_date: string };

/**
 * Given the number of active units and the set of blocking (confirmed/active)
 * rentals, return the calendar dates within [startIso, endIso] on which every
 * unit is occupied (i.e. fully booked).
 *
 * If there are no active units we return an empty list rather than graying out
 * the whole calendar; the fleet is seeded before launch and admin handles edge
 * cases. Authoritative availability is always re-checked server-side at confirm
 * time via the DB exclusion constraint.
 */
export function computeFullyBookedDates(params: {
  activeUnitCount: number;
  blockingRentals: DateRange[];
  startIso: string;
  endIso: string;
}): string[] {
  const { activeUnitCount, blockingRentals, startIso, endIso } = params;
  if (activeUnitCount <= 0) return [];

  const counts = new Map<string, number>();
  for (const rental of blockingRentals) {
    for (const date of eachDateIso(rental.pickup_date, rental.return_date)) {
      if (date < startIso || date > endIso) continue;
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }
  }

  const booked: string[] = [];
  for (const [date, count] of counts) {
    if (count >= activeUnitCount) booked.push(date);
  }
  booked.sort();
  return booked;
}

/**
 * Find unit ids that are free across the full [pickup, return] inclusive range,
 * given the blocking rentals already mapped per unit.
 */
export function findFreeUnitIds(params: {
  unitIds: string[];
  blockingByUnit: Map<string, DateRange[]>;
  pickupIso: string;
  returnIso: string;
}): string[] {
  const { unitIds, blockingByUnit, pickupIso, returnIso } = params;
  return unitIds.filter((unitId) => {
    const ranges = blockingByUnit.get(unitId) ?? [];
    return !ranges.some(
      (r) => pickupIso <= r.return_date && r.pickup_date <= returnIso,
    );
  });
}
