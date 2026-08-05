import { eachDateIso, rangesOverlapInclusive } from "./dates";
import { BLOCKING_STATUSES, type RentalStatus } from "./types";

export type DateRange = { pickup_date: string; return_date: string };

export type ConflictCandidate = DateRange & {
  id: string;
  unit_id: string | null;
  status: string;
  customer_name: string;
};

/** True for the statuses that hold a unit and so can collide with each other. */
export function isBlockingStatus(status: string): boolean {
  return BLOCKING_STATUSES.includes(status as RentalStatus);
}

/**
 * Bookings that already hold each unit across [pickupIso, returnIso], keyed by
 * unit id. This mirrors the `rentals_no_overlap` exclusion constraint in
 * migration 20260629204234 exactly — inclusive dates on both ends, only
 * confirmed/active bookings, only rows with a unit — so what the booking form
 * shows is what the database will accept.
 */
export function findUnitConflicts(params: {
  rentals: ConflictCandidate[];
  pickupIso: string;
  returnIso: string;
  /** The booking being edited, which cannot collide with itself. */
  excludeRentalId?: string | null;
}): Map<string, ConflictCandidate[]> {
  const { rentals, pickupIso, returnIso, excludeRentalId } = params;
  const byUnit = new Map<string, ConflictCandidate[]>();
  if (!pickupIso || !returnIso || returnIso < pickupIso) return byUnit;

  for (const rental of rentals) {
    if (!rental.unit_id) continue;
    if (rental.id === excludeRentalId) continue;
    if (!isBlockingStatus(rental.status)) continue;
    if (
      !rangesOverlapInclusive(
        pickupIso,
        returnIso,
        rental.pickup_date,
        rental.return_date,
      )
    ) {
      continue;
    }
    const existing = byUnit.get(rental.unit_id);
    if (existing) existing.push(rental);
    else byUnit.set(rental.unit_id, [rental]);
  }
  return byUnit;
}

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
