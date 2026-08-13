/**
 * Profitability for the Starlink fleet.
 *
 * Revenue is rental money actually received (`amount_received`). Deposits are
 * never included: they are the customer's, and they go back. Cost is each
 * kit's Starlink subscription, stored as a monthly rate that can change over
 * time, spread across the days of the period being looked at.
 *
 * A ten-day rental that straddles two months contributes to both, in
 * proportion. A kit that costs $200 in a 31-day month costs 200/31 per day.
 */

import {
  daysBetweenInclusive,
  daysInMonthIso,
  eachDateIso,
  endOfIsoWeek,
  endOfMonthIso,
  isoDateInToronto,
  overlapDaysInclusive,
  startOfIsoWeek,
  startOfMonthIso,
} from "./dates";
import type { RentalWithUnit, Unit, UnitCost } from "./types";

export type ProfitGrain = "week" | "month" | "all";

export type ProfitPeriod = {
  start: string;
  end: string;
};

export type UnitProfit = {
  unitId: string;
  name: string;
  color: string;
  active: boolean;
  /** Current subscription, for the editor — not necessarily the rate in-period. */
  currentCost: UnitCost | null;
  revenue: number;
  cost: number;
  profit: number;
  /** Occupied days / days in the period, 0–1. */
  occupancy: number;
  occupiedDays: number;
  periodDays: number;
  rentals: number;
};

export type ProfitReport = {
  period: ProfitPeriod;
  grain: ProfitGrain;
  units: UnitProfit[];
  fleet: {
    revenue: number;
    cost: number;
    profit: number;
    occupancy: number;
    occupiedDays: number;
    periodDays: number;
    rentals: number;
  };
  /** Paid bookings with no kit assigned. In the fleet total, not on a card. */
  unassignedRevenue: number;
  unassignedRentals: number;
};

const EARNING_STATUS = new Set(["confirmed", "active", "returned"]);

function asMoney(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Statuses whose rental payment counts as revenue. Requested and cancelled do not. */
export function rentalEarnsRevenue(status: string): boolean {
  return EARNING_STATUS.has(status);
}

/**
 * Slice of a booking's rental payment that falls inside `period`. Deposits are
 * not on `amount_received`, so they cannot leak in here.
 */
export function rentalRevenueInPeriod(
  rental: Pick<
    RentalWithUnit,
    "status" | "amount_received" | "pickup_date" | "return_date"
  >,
  period: ProfitPeriod,
): number {
  if (!rentalEarnsRevenue(rental.status)) return 0;
  const received = asMoney(rental.amount_received);
  if (received <= 0) return 0;
  const rentalDays = daysBetweenInclusive(rental.pickup_date, rental.return_date);
  if (rentalDays <= 0) return 0;
  const overlap = overlapDaysInclusive(
    rental.pickup_date,
    rental.return_date,
    period.start,
    period.end,
  );
  if (overlap <= 0) return 0;
  return received * (overlap / rentalDays);
}

/** The rate in force on `day` for a kit, or 0 if none has been set yet. */
export function monthlyCostOnDay(costs: UnitCost[], day: string): number {
  let current = 0;
  for (const row of costs) {
    if (row.effective_from > day) break;
    current = asMoney(row.monthly_cost);
  }
  return current;
}

/**
 * Subscription cost for `period`, using each day's own monthly rate divided
 * by that day's calendar-month length so a week in February is not charged
 * the same as a week in January.
 */
export function unitCostInPeriod(costs: UnitCost[], period: ProfitPeriod): number {
  if (costs.length === 0) return 0;
  const days = eachDateIso(period.start, period.end, 5000);
  let total = 0;
  for (const day of days) {
    total += monthlyCostOnDay(costs, day) / daysInMonthIso(day);
  }
  return total;
}

export function latestCost(costs: UnitCost[]): UnitCost | null {
  return costs.length > 0 ? costs[costs.length - 1] : null;
}

export function costsForUnit(all: UnitCost[], unitId: string): UnitCost[] {
  return all
    .filter((row) => row.unit_id === unitId)
    .slice()
    .sort((a, b) => a.effective_from.localeCompare(b.effective_from));
}

export function periodForGrain(
  grain: ProfitGrain,
  anchorIso: string,
  allTime: ProfitPeriod,
): ProfitPeriod {
  if (grain === "week") {
    return { start: startOfIsoWeek(anchorIso), end: endOfIsoWeek(anchorIso) };
  }
  if (grain === "month") {
    return { start: startOfMonthIso(anchorIso), end: endOfMonthIso(anchorIso) };
  }
  return allTime;
}

/**
 * Earliest kit creation or booking, through today. Future scheduled days are
 * left out of all-time so next month's subscription is not treated as already
 * spent.
 */
export function allTimeBounds(
  units: Pick<Unit, "created_at">[],
  rentals: Pick<RentalWithUnit, "pickup_date">[],
  todayIso: string,
): ProfitPeriod {
  let start = todayIso;
  for (const unit of units) {
    const created = isoDateInToronto(unit.created_at);
    if (created && created < start) start = created;
  }
  for (const rental of rentals) {
    if (rental.pickup_date < start) start = rental.pickup_date;
  }
  return { start, end: todayIso };
}

function occupiedDaysInPeriod(
  rentals: RentalWithUnit[],
  period: ProfitPeriod,
): number {
  const days = new Set<string>();
  for (const rental of rentals) {
    if (!rentalEarnsRevenue(rental.status)) continue;
    const overlapStart =
      rental.pickup_date > period.start ? rental.pickup_date : period.start;
    const overlapEnd =
      rental.return_date < period.end ? rental.return_date : period.end;
    if (overlapEnd < overlapStart) continue;
    for (const day of eachDateIso(overlapStart, overlapEnd, 5000)) {
      days.add(day);
    }
  }
  return days.size;
}

export function buildProfitReport(
  units: Unit[],
  rentals: RentalWithUnit[],
  costs: UnitCost[],
  grain: ProfitGrain,
  anchorIso: string,
  todayIso: string,
): ProfitReport {
  const allTime = allTimeBounds(units, rentals, todayIso);
  const period = periodForGrain(grain, anchorIso, allTime);
  const periodDays = Math.max(1, daysBetweenInclusive(period.start, period.end));

  const unitRows: UnitProfit[] = units.map((unit) => {
    const unitCosts = costsForUnit(costs, unit.id);
    const unitRentals = rentals.filter((r) => r.unit_id === unit.id);
    const earning = unitRentals.filter((r) => rentalEarnsRevenue(r.status));
    const inPeriod = earning.filter(
      (r) =>
        overlapDaysInclusive(
          r.pickup_date,
          r.return_date,
          period.start,
          period.end,
        ) > 0,
    );
    const revenue = roundCents(
      inPeriod.reduce((sum, r) => sum + rentalRevenueInPeriod(r, period), 0),
    );
    const cost = roundCents(unitCostInPeriod(unitCosts, period));
    const occupiedDays = occupiedDaysInPeriod(unitRentals, period);
    return {
      unitId: unit.id,
      name: unit.name,
      color: unit.color,
      active: unit.active,
      currentCost: latestCost(unitCosts),
      revenue,
      cost,
      profit: roundCents(revenue - cost),
      occupancy: occupiedDays / periodDays,
      occupiedDays,
      periodDays,
      rentals: inPeriod.length,
    };
  });

  const unassigned = rentals.filter(
    (r) => r.unit_id == null && rentalEarnsRevenue(r.status),
  );
  const unassignedInPeriod = unassigned.filter(
    (r) =>
      overlapDaysInclusive(r.pickup_date, r.return_date, period.start, period.end) >
      0,
  );
  const unassignedRevenue = roundCents(
    unassignedInPeriod.reduce(
      (sum, r) => sum + rentalRevenueInPeriod(r, period),
      0,
    ),
  );

  const revenue = roundCents(
    unitRows.reduce((sum, row) => sum + row.revenue, 0) + unassignedRevenue,
  );
  const cost = roundCents(unitRows.reduce((sum, row) => sum + row.cost, 0));
  const occupiedDays = unitRows.reduce((sum, row) => sum + row.occupiedDays, 0);
  // Fleet occupancy is occupied kit-days over available kit-days, not unique
  // calendar days — three kits out on the same day is three days of work.
  const fleetPeriodDays = periodDays * Math.max(units.length, 1);

  return {
    period,
    grain,
    units: unitRows,
    fleet: {
      revenue,
      cost,
      profit: roundCents(revenue - cost),
      occupancy: occupiedDays / fleetPeriodDays,
      occupiedDays,
      periodDays: fleetPeriodDays,
      rentals:
        unitRows.reduce((sum, row) => sum + row.rentals, 0) +
        unassignedInPeriod.length,
    },
    unassignedRevenue,
    unassignedRentals: unassignedInPeriod.length,
  };
}

/** The last `count` calendar months, oldest first, ending on `todayIso`'s month. */
export function recentMonthAnchors(todayIso: string, count = 6): string[] {
  const anchors: string[] = [];
  let cursor = startOfMonthIso(todayIso);
  for (let i = 0; i < count; i += 1) {
    anchors.unshift(cursor);
    const [y, m] = cursor.split("-").map(Number);
    const prev = m === 1 ? Date.UTC(y - 1, 11, 1) : Date.UTC(y, m - 2, 1);
    cursor = new Date(prev).toISOString().slice(0, 10);
  }
  return anchors;
}
