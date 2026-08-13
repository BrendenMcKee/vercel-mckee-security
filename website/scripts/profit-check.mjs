// Exercises the profitability math: deposits stay out, a booking that straddles
// two months is split, a rate change mid-month is honoured, and cancelled
// requests do not count as income.
//
// Run: node --import ./scripts/register-ts-alias.mjs scripts/profit-check.mjs

import { buildProfitReport } from "@/lib/starlink/profit.ts";

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

console.log("\n----------------------------------------");
if (failures.length) {
  console.log(`${failures.length} FAILED:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log("All profit checks passed.");
}
