// Exercises the profitability math: deposits stay out, a booking that straddles
// two months is split, a rate change mid-month is honoured, and cancelled
// requests do not count as income.
//
// Run: node --import ./scripts/register-ts-alias.mjs scripts/profit-check.mjs

import { buildProfitReport } from "@/lib/starlink/profit.ts";
import {
  DEFAULT_RATE_TIERS,
  quoteForDays,
  validateRateTiers,
} from "@/lib/starlink/pricing.ts";

const failures = [];
function check(ok, label, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

function close(actual, expected, cents = 2) {
  return Math.abs(actual - expected) < 10 ** -cents / 2 + 0.005;
}

const unitA = {
  id: "unit-a",
  name: "Starlink 1",
  color: "#c91818",
  notes: null,
  active: true,
  created_at: "2026-06-29T21:06:34.000Z",
};
const unitB = {
  id: "unit-b",
  name: "Starlink 2",
  color: "#16a34a",
  notes: null,
  active: true,
  created_at: "2026-07-08T00:10:04.000Z",
};

function rental(overrides) {
  return {
    id: "rental-1",
    unit_id: "unit-a",
    status: "returned",
    source: "admin",
    customer_name: "Test",
    customer_email: "test@example.ca",
    customer_phone: null,
    customer_address: null,
    usage_location: null,
    pickup_date: "2026-08-01",
    pickup_time: null,
    return_date: "2026-08-10",
    daily_rate: null,
    quoted_price: 310,
    deposit_amount: 300,
    deposit_received: true,
    deposit_received_at: null,
    deposit_returned: false,
    deposit_returned_at: null,
    deposit_returned_amount: null,
    amount_received: 310,
    comments: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    unit: { id: "unit-a", name: "Starlink 1", color: "#c91818", active: true },
    ...overrides,
  };
}

const costs = [
  {
    id: "c1",
    unit_id: "unit-a",
    monthly_cost: 200,
    plan_name: "Roam - Unlimited",
    effective_from: "2026-06-29",
    created_at: "2026-06-29T00:00:00.000Z",
  },
  {
    id: "c2",
    unit_id: "unit-b",
    monthly_cost: 110,
    plan_name: "Roam - 300GB",
    effective_from: "2026-07-07",
    created_at: "2026-07-08T00:00:00.000Z",
  },
];

console.log("\n=== profitability math");

{
  const report = buildProfitReport(
    [unitA],
    [rental()],
    costs,
    "month",
    "2026-08-13",
    "2026-08-13",
  );
  const row = report.units[0];
  // Aug 1–10 inclusive is the whole rental, so all $310 lands in August.
  check(close(row.revenue, 310), "a rental fully inside the month counts in full", `${row.revenue}`);
  check(
    close(row.cost, 200),
    "August at $200/mo costs $200",
    `${row.cost}`,
  );
  check(close(row.profit, 110), "profit is income minus the subscription", `${row.profit}`);
}

{
  const report = buildProfitReport(
    [unitA],
    [
      rental({
        deposit_amount: 300,
        deposit_received: true,
        amount_received: 310,
      }),
    ],
    costs,
    "month",
    "2026-08-13",
    "2026-08-13",
  );
  check(
    close(report.units[0].revenue, 310),
    "a $300 deposit on the booking does not add to income",
    `${report.units[0].revenue}`,
  );
}

{
  // 10-day rental, last 3 days in August and first 7 in September.
  const straddling = rental({
    pickup_date: "2026-08-29",
    return_date: "2026-09-07",
    amount_received: 200,
    quoted_price: 200,
  });
  const aug = buildProfitReport(
    [unitA],
    [straddling],
    costs,
    "month",
    "2026-08-13",
    "2026-08-13",
  );
  const sep = buildProfitReport(
    [unitA],
    [straddling],
    costs,
    "month",
    "2026-09-01",
    "2026-09-01",
  );
  check(close(aug.units[0].revenue, 60), "August gets 3/10 of a straddling rental", `${aug.units[0].revenue}`);
  check(close(sep.units[0].revenue, 140), "September gets 7/10 of a straddling rental", `${sep.units[0].revenue}`);
}

{
  const cancelled = rental({ status: "cancelled", amount_received: 310 });
  const requested = rental({
    id: "r2",
    status: "requested",
    amount_received: null,
    quoted_price: null,
  });
  const report = buildProfitReport(
    [unitA],
    [cancelled, requested],
    costs,
    "month",
    "2026-08-13",
    "2026-08-13",
  );
  check(report.units[0].revenue === 0, "cancelled and requested bookings are not income");
}

{
  const withRateChange = [
    costs[0],
    {
      id: "c1b",
      unit_id: "unit-a",
      monthly_cost: 220,
      plan_name: "Roam - Unlimited",
      effective_from: "2026-08-16",
      created_at: "2026-08-16T00:00:00.000Z",
    },
  ];
  const report = buildProfitReport(
    [unitA],
    [],
    withRateChange,
    "month",
    "2026-08-13",
    "2026-08-13",
  );
  // Aug 1–15 at 200/31, Aug 16–31 at 220/31.
  const expected = (15 * 200) / 31 + (16 * 220) / 31;
  check(
    close(report.units[0].cost, expected),
    "a mid-month rate change is split across the days",
    `${report.units[0].cost} vs ${expected.toFixed(2)}`,
  );
}

{
  const unassigned = rental({
    unit_id: null,
    unit: null,
    amount_received: 197.75,
    quoted_price: 197.75,
  });
  const report = buildProfitReport(
    [unitA, unitB],
    [unassigned],
    costs,
    "month",
    "2026-08-13",
    "2026-08-13",
  );
  check(
    close(report.unassignedRevenue, 197.75),
    "unassigned income is kept off the kit cards",
    `${report.unassignedRevenue}`,
  );
  check(
    report.units.every((row) => row.revenue === 0),
    "unassigned income does not land on a kit",
  );
  check(
    close(report.fleet.revenue, 197.75),
    "unassigned income is still in the fleet total",
    `${report.fleet.revenue}`,
  );
}

{
  const week = buildProfitReport(
    [unitA],
    [],
    costs,
    "week",
    "2026-08-13",
    "2026-08-13",
  );
  // 2026-08-13 is a Thursday; ISO week is Mon 10 – Sun 16 = 7 days of 200/31.
  const expected = (7 * 200) / 31;
  check(week.period.start === "2026-08-10", "week starts Monday", week.period.start);
  check(week.period.end === "2026-08-16", "week ends Sunday", week.period.end);
  check(
    close(week.units[0].cost, expected),
    "a week is charged 7/31 of the August rate",
    `${week.units[0].cost} vs ${expected.toFixed(2)}`,
  );
}

{
  const all = buildProfitReport(
    [unitA],
    [rental()],
    costs,
    "all",
    "2026-08-13",
    "2026-08-13",
  );
  check(all.period.end === "2026-08-13", "all-time stops at today, not next month");
  check(all.period.start <= "2026-06-29", "all-time starts at the kit's creation");
}

{
  const withFutureRate = [
    costs[0],
    {
      id: "c1-future",
      unit_id: "unit-a",
      monthly_cost: 220,
      plan_name: "Roam - Unlimited",
      effective_from: "2026-08-16",
      created_at: "2026-08-13T00:00:00.000Z",
    },
  ];
  const report = buildProfitReport(
    [unitA],
    [],
    withFutureRate,
    "month",
    "2026-08-13",
    "2026-08-13",
  );
  const row = report.units[0];
  check(
    row.currentCost?.monthly_cost === 200,
    "a future rate is not shown as the current plan",
    `${row.currentCost?.monthly_cost}`,
  );
  check(
    row.upcomingCost?.effective_from === "2026-08-16",
    "the next scheduled rate is exposed as upcoming",
    `${row.upcomingCost?.effective_from}`,
  );
  check(
    row.currentCost?.effective_from === "2026-06-29",
    "current plan is still the rate in force today",
  );
}

{
  const overlapping = [
    rental({
      pickup_date: "2026-08-01",
      return_date: "2026-08-10",
      amount_received: 100,
    }),
    rental({
      id: "rental-2",
      pickup_date: "2026-08-05",
      return_date: "2026-08-15",
      amount_received: 100,
    }),
  ];
  const report = buildProfitReport(
    [unitA],
    overlapping,
    costs,
    "month",
    "2026-08-13",
    "2026-08-13",
  );
  check(
    report.units[0].occupiedDays === 15,
    "overlapping bookings on one kit count unique days",
    `${report.units[0].occupiedDays}`,
  );
  check(
    report.units[0].occupiedDays <= report.units[0].periodDays,
    "occupancy never exceeds the days in the period",
  );
}

{
  const lateKit = {
    ...unitA,
    created_at: "2026-08-15T16:00:00.000Z",
  };
  const backdated = [
    {
      id: "c-back",
      unit_id: "unit-a",
      monthly_cost: 200,
      plan_name: "Roam - Unlimited",
      effective_from: "2026-01-01",
      created_at: "2026-08-15T00:00:00.000Z",
    },
  ];
  const report = buildProfitReport(
    [lateKit],
    [],
    backdated,
    "month",
    "2026-08-13",
    "2026-08-13",
  );
  // Created Aug 15 Toronto; Aug 15–31 is 17 days of 200/31.
  const expected = (17 * 200) / 31;
  check(
    close(report.units[0].cost, expected),
    "a backdated rate does not bill days before the kit existed",
    `${report.units[0].cost} vs ${expected.toFixed(2)}`,
  );
}

console.log("\n=== base rental rates");

{
  check(quoteForDays(DEFAULT_RATE_TIERS, 1) === 150, "1 day is $150");
  check(quoteForDays(DEFAULT_RATE_TIERS, 3) === 150, "3 days is $150");
  check(quoteForDays(DEFAULT_RATE_TIERS, 4) === 200, "4 days is $200");
  check(quoteForDays(DEFAULT_RATE_TIERS, 11) === 250, "11 days is $250 (8–11 band)");
  check(quoteForDays(DEFAULT_RATE_TIERS, 12) === 300, "12 days is $300");
  check(quoteForDays(DEFAULT_RATE_TIERS, 21) === 400, "21 days is $400");
  check(quoteForDays(DEFAULT_RATE_TIERS, 30) === 500, "30 days is $500");
  check(quoteForDays(DEFAULT_RATE_TIERS, 31) === null, "31 days has no band");
  check(
    validateRateTiers([
      { min_days: 1, max_days: 3, amount: 150 },
      { min_days: 3, max_days: 7, amount: 200 },
    ]) !== null,
    "overlapping day ranges are rejected",
  );
}

console.log("\n=== advertising spend");

const adRates = [
  {
    id: "ad-250",
    daily_cost: 2.5,
    effective_from: "2026-06-01",
    created_at: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "ad-500",
    daily_cost: 5,
    effective_from: "2026-08-08",
    created_at: "2026-08-08T00:00:00.000Z",
  },
];

{
  const report = buildProfitReport(
    [unitA],
    [rental()],
    costs,
    "month",
    "2026-08-13",
    "2026-08-13",
    adRates,
  );
  // Aug 1–7 at $2.50, Aug 8–31 at $5. One kit takes the whole daily amount.
  const expected = 7 * 2.5 + 24 * 5;
  check(
    close(report.fleet.adSpend, expected),
    "August splits $2.50 through the 7th and $5 from the 8th",
    `${report.fleet.adSpend} vs ${expected}`,
  );
  check(
    close(report.units[0].adSpend, expected),
    "a lone kit carries the whole daily spend",
    `${report.units[0].adSpend}`,
  );
  check(
    close(report.fleet.profit, 310 - 200 - expected),
    "profit is income minus Starlink minus ads",
    `${report.fleet.profit}`,
  );
}

{
  const report = buildProfitReport(
    [unitA, unitB],
    [],
    costs,
    "month",
    "2026-07-15",
    "2026-07-15",
    adRates,
  );
  // July: $2.50/day. unitA existed all 31 days; unitB created Jul 7 Toronto
  // (2026-07-08T00:10:04Z is still Jul 7 in Toronto).
  const unitBCreated = "2026-07-07";
  const daysBeforeB = 6; // Jul 1–6
  const daysWithBoth = 31 - daysBeforeB;
  const expectedFleet = 31 * 2.5;
  const expectedA = daysBeforeB * 2.5 + daysWithBoth * (2.5 / 2);
  const expectedB = daysWithBoth * (2.5 / 2);
  check(
    close(report.fleet.adSpend, expectedFleet),
    "July ads are $2.50 every day",
    `${report.fleet.adSpend} vs ${expectedFleet}`,
  );
  check(
    close(report.units[0].adSpend, expectedA),
    "the older kit carries solo days, then half",
    `${report.units[0].adSpend} vs ${expectedA.toFixed(2)}`,
  );
  check(
    close(report.units[1].adSpend, expectedB),
    "a kit added mid-month only shares from its creation day",
    `${report.units[1].adSpend} vs ${expectedB.toFixed(2)}`,
  );
  check(unitBCreated === "2026-07-07", "fixture: unit B created Jul 7 Toronto");
}

{
  const report = buildProfitReport(
    [unitA],
    [rental()],
    costs,
    "month",
    "2026-08-13",
    "2026-08-13",
  );
  check(report.fleet.adSpend === 0, "missing ad rates do not invent spend");
  check(close(report.fleet.profit, 110), "without ads, profit matches the old math");
}

console.log("\n----------------------------------------");
if (failures.length) {
  console.log(`${failures.length} FAILED:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log("All profit checks passed.");
}
