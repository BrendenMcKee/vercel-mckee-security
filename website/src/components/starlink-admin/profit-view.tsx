"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  Megaphone,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { parseMoneyInput } from "@/lib/starlink/billing";
import { upsertAdSpend, upsertUnitCost } from "@/lib/starlink/client-api";
import {
  addDaysIso,
  isValidIsoDate,
  startOfMonthIso,
  todayIsoToronto,
} from "@/lib/starlink/dates";
import {
  formatCurrency,
  formatDateShort,
  formatMonthYear,
} from "@/lib/starlink/format";
import {
  adSpendAsOf,
  buildProfitReport,
  costAsOf,
  recentMonthAnchors,
  upcomingAdSpend,
  upcomingCost,
  type ProfitGrain,
  type UnitProfit,
} from "@/lib/starlink/profit";
import type {
  AdSpendRate,
  RentalWithUnit,
  Unit,
  UnitCost,
} from "@/lib/starlink/types";
import { cn } from "@/lib/utils";
import { Field, inputClass, Section } from "./form-ui";

const GRAINS: { id: ProfitGrain; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "all", label: "All time" },
];

const PLAN_PRESETS = [
  { plan_name: "Roam - Unlimited", monthly_cost: 200 },
  { plan_name: "Roam - 300GB", monthly_cost: 110 },
] as const;

function shiftMonth(iso: string, delta: number): string {
  const [y, m] = startOfMonthIso(iso).split("-").map(Number);
  const monthIndex = m - 1 + delta;
  const year = y + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

function periodLabel(grain: ProfitGrain, start: string, end: string): string {
  if (grain === "all") return "All time";
  if (grain === "month") return formatMonthYear(start);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return sameYear
    ? `${formatDateShort(start)} – ${formatDateShort(end)}, ${start.slice(0, 4)}`
    : `${formatDateShort(start)} ${start.slice(0, 4)} – ${formatDateShort(end)} ${end.slice(0, 4)}`;
}

function profitTone(profit: number): string {
  if (profit > 0.005) return "text-emerald-300";
  if (profit < -0.005) return "text-red-300";
  return "text-white/70";
}

function marginLabel(revenue: number, profit: number): string {
  if (revenue <= 0) return profit < 0 ? "no rental income" : "—";
  const pct = Math.round((profit / revenue) * 100);
  return `${pct}% margin`;
}

function occupancyLabel(occupied: number, periodDays: number): string {
  return `rented ${occupied} of ${periodDays} day${periodDays === 1 ? "" : "s"}`;
}

function bookingLabel(count: number): string {
  return `${count} booking${count === 1 ? "" : "s"}`;
}

/** Label on the left, amount on the right — for the narrow kit cards. */
function MoneyRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-white/70">{label}</span>
      <span className={cn("text-base font-semibold tabular-nums text-white", tone)}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

/** Label stacked on the amount so a wide card cannot pull them apart. */
function MoneyStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-white/70">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums sm:text-2xl", tone)}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function FleetCard({
  revenue,
  cost,
  adSpend,
  profit,
  occupancy,
  rentals,
  unassignedRevenue,
  unassignedRentals,
}: {
  revenue: number;
  cost: number;
  adSpend: number;
  profit: number;
  occupancy: number;
  occupiedDays: number;
  periodDays: number;
  rentals: number;
  unassignedRevenue: number;
  unassignedRentals: number;
}) {
  const inTheBlack = profit > 0.005;
  const Icon = inTheBlack ? TrendingUp : profit < -0.005 ? TrendingDown : Wallet;
  return (
    <section
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        inTheBlack
          ? "border-emerald-500/30 bg-emerald-500/10"
          : profit < -0.005
            ? "border-red-500/30 bg-red-500/10"
            : "border-white/10 bg-surface/60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white/70">Whole fleet</p>
          <p className={cn("mt-1 text-3xl font-bold tabular-nums sm:text-4xl", profitTone(profit))}>
            {formatCurrency(profit)}
          </p>
          <p className="mt-1 text-sm text-white/65">{marginLabel(revenue, profit)}</p>
        </div>
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            inTheBlack
              ? "bg-emerald-500/20 text-emerald-300"
              : profit < -0.005
                ? "bg-red-500/20 text-red-300"
                : "bg-white/10 text-white/60",
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        <MoneyStat label="Rental income" value={revenue} tone="text-emerald-200" />
        <MoneyStat label="Starlink cost" value={cost} tone="text-orange-200" />
        <MoneyStat label="Ad spend" value={adSpend} tone="text-sky-200" />
        <MoneyStat label="Profit" value={profit} tone={profitTone(profit)} />
      </div>
      <p className="mt-4 text-sm text-white/60">
        {bookingLabel(rentals)} · kits were rented {Math.round(occupancy * 100)}% of
        the time. Customer deposits are not included.
      </p>
      {unassignedRevenue > 0 ? (
        <p className="mt-2 text-sm text-amber-200/90">
          {formatCurrency(unassignedRevenue)} from {unassignedRentals} unassigned
          booking{unassignedRentals === 1 ? "" : "s"} is in the fleet total, not
          on a kit.
        </p>
      ) : null}
    </section>
  );
}

function UnitCard({ row }: { row: UnitProfit }) {
  return (
    <article className="rounded-xl border border-white/10 bg-surface/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden="true"
            />
            <h3 className="truncate text-sm font-bold text-white">{row.name}</h3>
            {row.active ? null : (
              <span className="text-xs font-semibold text-white/50">Inactive</span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/60">
            {row.currentCost
              ? `${row.currentCost.plan_name ?? "Plan"} · ${formatCurrency(row.currentCost.monthly_cost)}/mo`
              : "No monthly rate set"}
          </p>
          {row.upcomingCost ? (
            <p className="mt-0.5 text-sm text-amber-200/90">
              Changes to {formatCurrency(row.upcomingCost.monthly_cost)}/mo on{" "}
              {formatDateShort(row.upcomingCost.effective_from)}
            </p>
          ) : null}
        </div>
        <p className={cn("text-xl font-bold tabular-nums", profitTone(row.profit))}>
          {formatCurrency(row.profit)}
        </p>
      </div>
      <div className="mt-3 space-y-1.5">
        <MoneyRow label="Rental income" value={row.revenue} />
        <MoneyRow label="Starlink cost" value={row.cost} />
        <MoneyRow label="Ad spend" value={row.adSpend} />
      </div>
      <p className="mt-3 text-sm text-white/60">
        {bookingLabel(row.rentals)} · {occupancyLabel(row.occupiedDays, row.periodDays)}
      </p>
    </article>
  );
}

function CostEditor({
  unit,
  costs,
  onSaved,
  onError,
}: {
  unit: Unit;
  costs: UnitCost[];
  onSaved: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const unitCosts = costs.filter((c) => c.unit_id === unit.id);
  const current = costAsOf(unitCosts, todayIsoToronto());
  const upcoming = upcomingCost(unitCosts, todayIsoToronto());
  const [planName, setPlanName] = useState(current?.plan_name ?? "");
  const [costText, setCostText] = useState(
    current ? String(current.monthly_cost) : "",
  );
  const [from, setFrom] = useState(todayIsoToronto());
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const parsed = parseMoneyInput(costText);
      if (!parsed.ok || parsed.value == null) {
        onError("Enter a monthly cost, like 200 or 110.");
        return;
      }
      if (!isValidIsoDate(from)) {
        onError("Pick a real date this rate should start on.");
        return;
      }
      await upsertUnitCost(unit.id, {
        monthly_cost: parsed.value,
        plan_name: planName.trim() || null,
        effective_from: from,
      });
      await onSaved(`Saved ${unit.name}'s rate.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save the rate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-surface/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: unit.color }}
          aria-hidden="true"
        />
        <h3 className="text-sm font-bold text-white">{unit.name}</h3>
      </div>
      {current ? (
        <p className="mb-3 text-sm text-white/60">
          Current: {current.plan_name ?? "Plan"} ·{" "}
          {formatCurrency(current.monthly_cost)}/mo since{" "}
          {formatDateShort(current.effective_from)}
          {upcoming
            ? ` · next: ${formatCurrency(upcoming.monthly_cost)}/mo from ${formatDateShort(upcoming.effective_from)}`
            : ""}
        </p>
      ) : (
        <p className="mb-3 text-sm text-amber-200/90">
          No rate yet — this kit will show as $0 cost until you save one.
        </p>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        {PLAN_PRESETS.map((preset) => (
          <button
            key={preset.plan_name}
            type="button"
            onClick={() => {
              setPlanName(preset.plan_name);
              setCostText(String(preset.monthly_cost));
            }}
            className="min-h-11 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/5 sm:min-h-0 sm:py-1.5"
          >
            {preset.plan_name} · {formatCurrency(preset.monthly_cost)}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Plan name">
          <input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="e.g. Roam - Unlimited"
            maxLength={120}
            className={inputClass}
          />
        </Field>
        <Field label="Monthly cost">
          <input
            value={costText}
            onChange={(e) => setCostText(e.target.value)}
            inputMode="decimal"
            placeholder="200"
            className={inputClass}
          />
        </Field>
        <Field label="Effective from">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 sm:min-h-0 sm:w-auto"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save rate
      </button>
    </div>
  );
}

function AdSpendEditor({
  rates,
  kitCount,
  onSaved,
  onError,
}: {
  rates: AdSpendRate[];
  kitCount: number;
  onSaved: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const current = adSpendAsOf(rates, todayIsoToronto());
  const upcoming = upcomingAdSpend(rates, todayIsoToronto());
  const [costText, setCostText] = useState(
    current ? String(current.daily_cost) : "5",
  );
  const [from, setFrom] = useState(todayIsoToronto());
  const [busy, setBusy] = useState(false);
  const share =
    current && kitCount > 0 ? current.daily_cost / kitCount : null;

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const parsed = parseMoneyInput(costText);
      if (!parsed.ok || parsed.value == null) {
        onError("Enter a daily ad spend, like 5 or 2.50.");
        return;
      }
      if (!isValidIsoDate(from)) {
        onError("Pick a real date this spend should start on.");
        return;
      }
      await upsertAdSpend({
        daily_cost: parsed.value,
        effective_from: from,
      });
      await onSaved("Saved the advertising rate.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save ad spend.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-surface/60 p-4">
      {current ? (
        <p className="mb-3 text-sm text-white/60">
          Current: {formatCurrency(current.daily_cost)}/day since{" "}
          {formatDateShort(current.effective_from)}
          {share != null
            ? ` · ${formatCurrency(share)} per kit today`
            : ""}
          {upcoming
            ? ` · next: ${formatCurrency(upcoming.daily_cost)}/day from ${formatDateShort(upcoming.effective_from)}`
            : ""}
        </p>
      ) : (
        <p className="mb-3 text-sm text-amber-200/90">
          No ad spend recorded yet — profit will not include advertising until
          you save a daily rate.
        </p>
      )}
      {rates.length > 0 ? (
        <ul className="mb-3 space-y-1 text-sm text-white/50">
          {rates
            .slice()
            .sort((a, b) => a.effective_from.localeCompare(b.effective_from))
            .map((row) => (
              <li key={row.id}>
                {formatCurrency(row.daily_cost)}/day from{" "}
                {formatDateShort(row.effective_from)}
                {current?.id === row.id ? " · current" : ""}
              </li>
            ))}
        </ul>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Daily ad spend">
          <input
            value={costText}
            onChange={(e) => setCostText(e.target.value)}
            inputMode="decimal"
            placeholder="5"
            className={inputClass}
          />
        </Field>
        <Field label="Effective from">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 sm:min-h-0 sm:w-auto"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save ad spend
      </button>
    </div>
  );
}

export function ProfitView({
  units,
  rentals,
  costs,
  adSpend,
  todayIso,
  onChanged,
  onError,
  onSuccess,
}: {
  units: Unit[];
  rentals: RentalWithUnit[];
  costs: UnitCost[];
  adSpend: AdSpendRate[];
  todayIso: string;
  onChanged: () => Promise<void> | void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [grain, setGrain] = useState<ProfitGrain>("month");
  const [anchor, setAnchor] = useState(todayIso);

  const report = useMemo(
    () =>
      buildProfitReport(units, rentals, costs, grain, anchor, todayIso, adSpend),
    [units, rentals, costs, grain, anchor, todayIso, adSpend],
  );

  const months = useMemo(() => {
    return recentMonthAnchors(todayIso, 6).map((monthAnchor) => ({
      anchor: monthAnchor,
      report: buildProfitReport(
        units,
        rentals,
        costs,
        "month",
        monthAnchor,
        todayIso,
        adSpend,
      ),
    }));
  }, [units, rentals, costs, adSpend, todayIso]);

  function goPrev() {
    setAnchor((current) =>
      grain === "week" ? addDaysIso(current, -7) : shiftMonth(current, -1),
    );
  }
  function goNext() {
    setAnchor((current) =>
      grain === "week" ? addDaysIso(current, 7) : shiftMonth(current, 1),
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-surface/40 p-1">
          {GRAINS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setGrain(option.id);
                setAnchor(todayIso);
              }}
              className={cn(
                "min-h-11 flex-1 rounded-lg px-3 py-2 text-sm font-semibold sm:min-h-0",
                grain === option.id
                  ? "bg-primary text-white"
                  : "text-white/65 hover:bg-white/5 hover:text-white",
              )}
              aria-pressed={grain === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>
        {grain === "all" ? (
          <p className="text-sm font-semibold text-white">
            {periodLabel("all", report.period.start, report.period.end)}
            <span className="ml-2 font-normal text-white/50">
              {formatDateShort(report.period.start)} – {formatDateShort(report.period.end)}
            </span>
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/5 sm:h-9 sm:w-9"
              aria-label={grain === "week" ? "Previous week" : "Previous month"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-0 flex-1 text-center text-sm font-semibold text-white sm:min-w-[12rem]">
              {periodLabel(grain, report.period.start, report.period.end)}
            </p>
            <button
              type="button"
              onClick={goNext}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/5 sm:h-9 sm:w-9"
              aria-label={grain === "week" ? "Next week" : "Next month"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAnchor(todayIso)}
              className="min-h-11 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/5 sm:min-h-0"
            >
              Today
            </button>
          </div>
        )}
      </div>

      <FleetCard
        {...report.fleet}
        unassignedRevenue={report.unassignedRevenue}
        unassignedRentals={report.unassignedRentals}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {report.units.map((row) => (
          <UnitCard key={row.unitId} row={row} />
        ))}
      </div>

      <Section icon={TrendingUp} title="Month by month">
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-white/[0.03] text-sm font-semibold text-white/60">
              <tr>
                <th className="px-3 py-2.5">Month</th>
                <th className="px-3 py-2.5 text-right">Income</th>
                <th className="px-3 py-2.5 text-right">Starlink</th>
                <th className="px-3 py-2.5 text-right">Ads</th>
                <th className="px-3 py-2.5 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {months.map(({ anchor: monthAnchor, report: monthReport }) => {
                const active =
                  grain === "month" &&
                  startOfMonthIso(anchor) === startOfMonthIso(monthAnchor);
                return (
                  <tr
                    key={monthAnchor}
                    className={cn(
                      "border-t border-white/10",
                      active ? "bg-primary/15" : "hover:bg-white/[0.03]",
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setGrain("month");
                          setAnchor(monthAnchor);
                        }}
                        className="min-h-11 text-left font-semibold text-white sm:min-h-0"
                      >
                        {formatMonthYear(monthAnchor)}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white/80">
                      {formatCurrency(monthReport.fleet.revenue)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white/80">
                      {formatCurrency(monthReport.fleet.cost)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white/80">
                      {formatCurrency(monthReport.fleet.adSpend)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right font-semibold tabular-nums",
                        profitTone(monthReport.fleet.profit),
                      )}
                    >
                      {formatCurrency(monthReport.fleet.profit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section icon={Megaphone} title="Advertising spend">
        <p className="text-sm text-white/55">
          Daily Meta/Google spend for the rental programme, split equally
          across kits that existed that day. Saving a new amount keeps the old
          one on past days — $2.50 through 7 August and $5 from 8 August stay
          on the books as they happened.
        </p>
        <AdSpendEditor
          key={adSpend
            .map((row) => `${row.id}:${row.daily_cost}:${row.effective_from}`)
            .join("|")}
          rates={adSpend}
          kitCount={units.length}
          onSaved={async (message) => {
            onSuccess(message);
            await onChanged();
          }}
          onError={onError}
        />
      </Section>

      <Section icon={CircleDollarSign} title="What each kit costs us">
        <p className="text-sm text-white/55">
          This is the Starlink subscription, not the customer deposit. Saving a
          new amount keeps the old one on past days, so a plan change does not
          rewrite last month&apos;s profit.
        </p>
        <div className="space-y-3">
          {units.map((unit) => (
            <CostEditor
              key={`${unit.id}:${costs
                .filter((c) => c.unit_id === unit.id)
                .map((c) => `${c.id}:${c.monthly_cost}:${c.plan_name}:${c.effective_from}`)
                .join("|")}`}
              unit={unit}
              costs={costs}
              onSaved={async (message) => {
                onSuccess(message);
                await onChanged();
              }}
              onError={onError}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
