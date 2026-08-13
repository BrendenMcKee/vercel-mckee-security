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
  addDaysIso,
  daysBetweenInclusive,
  daysInMonthIso,
  endOfIsoWeek,
  endOfMonthIso,
  isoDateInToronto,
  isValidIsoDate,
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
  /** Current subscription as of today, for the editor. */
  currentCost: UnitCost | null;
  /** Next scheduled rate if one is waiting in the future. */
  upcomingCost: UnitCost | null;
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

function sortedByEffectiveFrom(costs: UnitCost[]): UnitCost[] {
  return costs.slice().sort((a, b) => a.effective_from.localeCompare(b.effective_from));
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
  const current = costAsOf(costs, day);
  return current ? asMoney(current.monthly_cost) : 0;
}

/** Last rate whose `effective_from` is on or before `day`. */
export function costAsOf(costs: UnitCost[], day: string): UnitCost | null {
  let current: UnitCost | null = null;
  for (const row of sortedByEffectiveFrom(costs)) {
    if (row.effective_from > day) break;
    current = row;
  }
  return current;
}

/** First rate that has not started yet as of `day`. */
export function upcomingCost(costs: UnitCost[], day: string): UnitCost | null {
  return sortedByEffectiveFrom(costs).find((row) => row.effective_from > day) ?? null;
}

/**
 * Subscription dollars for every day in `start`..`end` at a single monthly
 * rate. Walks month by month so a 10-year all-time view is a few dozen steps,
 * not a few thousand date strings.
 */
function costAtRateAcross(start: string, end: string, monthly: number): number {
  if (
    monthly === 0 ||
    end < start ||
    !isValidIsoDate(start) ||
    !isValidIsoDate(end)
  ) {
    return 0;
  }
  let total = 0;
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 2400) {
    const monthEnd = endOfMonthIso(cursor);
    const sliceEnd = monthEnd < end ? monthEnd : end;
    const days = daysBetweenInclusive(cursor, sliceEnd);
    const dim = daysInMonthIso(cursor);
    if (dim > 0) total += (monthly / dim) * days;
    cursor = addDaysIso(sliceEnd, 1);
    guard += 1;
  }
  return total;
}

/**
 * Subscription cost for `period`. Each historical rate covers the days from
 * its `effective_from` until the day before the next one. `notBefore` is the
 * kit's creation date, so a backdated rate cannot invent a bill for months
 * the dish did not exist.
 */
export function unitCostInPeriod(
  costs: UnitCost[],
  period: ProfitPeriod,
  notBefore?: string | null,
): number {
  if (costs.length === 0) return 0;
  const start =
    notBefore && notBefore > period.start ? notBefore : period.start;
  if (period.end < start) return 0;

  const ordered = sortedByEffectiveFrom(costs);
  let total = 0;
  for (let i = 0; i < ordered.length; i += 1) {
    const rowStart = ordered[i].effective_from;
    const rowEnd =
      i + 1 < ordered.length
        ? addDaysIso(ordered[i + 1].effective_from, -1)
        : period.end;
    const sliceStart = rowStart > start ? rowStart : start;
    const sliceEnd = rowEnd < period.end ? rowEnd : period.end;
    if (sliceEnd < sliceStart) continue;
    total += costAtRateAcross(
      sliceStart,
      sliceEnd,
      asMoney(ordered[i].monthly_cost),
    );
  }
  return total;
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
  const spans: Array<[string, string]> = [];
  for (const rental of rentals) {
    if (!rentalEarnsRevenue(rental.status)) continue;
    const start =
      rental.pickup_date > period.start ? rental.pickup_date : period.start;
    const end =
      rental.return_date < period.end ? rental.return_date : period.end;
    if (end < start) continue;
    spans.push([start, end]);
  }
  if (spans.length === 0) return 0;
  spans.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

  // Merge touching/overlapping spans so two back-to-back bookings on the same
  // kit count as one run of days, and a silent 5000-day cap cannot truncate a
  // long all-time view.
  let total = 0;
  let [curStart, curEnd] = spans[0];
  for (let i = 1; i < spans.length; i += 1) {
    const [nextStart, nextEnd] = spans[i];
    if (nextStart <= addDaysIso(curEnd, 1)) {
      if (nextEnd > curEnd) curEnd = nextEnd;
    } else {
      total += daysBetweenInclusive(curStart, curEnd);
      curStart = nextStart;
      curEnd = nextEnd;
    }
  }
  total += daysBetweenInclusive(curStart, curEnd);
  const periodDays = daysBetweenInclusive(period.start, period.end);
  return periodDays > 0 ? Math.min(total, periodDays) : 0;
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
  const period = periodForGrain(
    grain,
    isValidIsoDate(anchorIso) ? anchorIso : todayIso,
    allTime,
  );
  const periodDays = Math.max(1, daysBetweenInclusive(period.start, period.end));

  const costsByUnit = new Map<string, UnitCost[]>();
  for (const row of costs) {
    const list = costsByUnit.get(row.unit_id);
    if (list) list.push(row);
    else costsByUnit.set(row.unit_id, [row]);
  }

  const unitRows: UnitProfit[] = units.map((unit) => {
    const unitCosts = costsByUnit.get(unit.id) ?? [];
    const created = isoDateInToronto(unit.created_at);
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
    const cost = roundCents(unitCostInPeriod(unitCosts, period, created));
    const occupiedDays = occupiedDaysInPeriod(unitRentals, period);
    return {
      unitId: unit.id,
      name: unit.name,
      color: unit.color,
      active: unit.active,
      currentCost: costAsOf(unitCosts, todayIso),
      upcomingCost: upcomingCost(unitCosts, todayIso),
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
