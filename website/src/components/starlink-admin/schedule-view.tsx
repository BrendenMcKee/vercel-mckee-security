"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RentalWithUnit, Unit } from "@/lib/starlink/types";
import { formatDateMedium } from "@/lib/starlink/format";
import { CalendarMonth } from "./calendar-month";
import { StatusBadge } from "./status-badge";
import { RentalIndicatorLegend, RentalIndicators } from "./rental-indicators";
import { cn } from "@/lib/utils";

const MONTH_LABEL = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  year: "numeric",
});

export function ScheduleView({
  rentals,
  units,
  todayIso,
  onSelectRental,
}: {
  rentals: RentalWithUnit[];
  units: Unit[];
  todayIso: string;
  onSelectRental: (rental: RentalWithUnit) => void;
}) {
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const goPrev = () =>
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () =>
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => {
    const now = new Date();
    setMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const agenda = useMemo(
    () =>
      rentals
        .filter((r) => r.status !== "cancelled" && r.return_date >= todayIso)
        .sort((a, b) => a.pickup_date.localeCompare(b.pickup_date)),
    [rentals, todayIso],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-lg border border-white/10 bg-surface/60 p-2 text-white/70 transition-colors hover:bg-white/5"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-[9.5rem] text-center text-base font-bold text-white">
            {MONTH_LABEL.format(monthDate)}
          </h2>
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg border border-white/10 bg-surface/60 p-2 text-white/70 transition-colors hover:bg-white/5"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="rounded-lg border border-white/10 bg-surface/60 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/5"
        >
          Today
        </button>
      </div>

      {units.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {units.map((u) => (
            <span key={u.id} className="flex items-center gap-1.5 text-xs text-white/60">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: u.color }}
                aria-hidden="true"
              />
              {u.name}
              {!u.active ? <span className="text-white/30">(inactive)</span> : null}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-white/60">
            <span
              className="h-3 w-3 rounded-sm border border-dashed border-amber-400/70 bg-amber-400/10"
              aria-hidden="true"
            />
            Requested / unassigned
          </span>
        </div>
      ) : null}

      <RentalIndicatorLegend className="rounded-lg border border-white/10 bg-surface/30 px-3 py-2" />

      {/* Calendar grid on tablet and up */}
      <div className="hidden sm:block">
        <CalendarMonth
          monthDate={monthDate}
          rentals={rentals}
          todayIso={todayIso}
          onSelectRental={onSelectRental}
        />
      </div>

      {/* Agenda list on mobile */}
      <div className="space-y-2 sm:hidden">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
          Current &amp; upcoming
        </h3>
        {agenda.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-surface/40 p-4 text-sm text-white/50">
            No current or upcoming rentals.
          </p>
        ) : (
          agenda.map((r) => {
            const color = r.unit?.color ?? null;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRental(r)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-surface/60 p-3 text-left transition-colors hover:bg-white/5"
              >
                <span
                  className={cn(
                    "h-10 w-1.5 shrink-0 rounded-full",
                    !color && "bg-amber-400/60",
                  )}
                  style={color ? { backgroundColor: color } : undefined}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-white">
                      {r.customer_name}
                    </span>
                    <StatusBadge status={r.status} />
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-white/55">
                    {formatDateMedium(r.pickup_date)} → {formatDateMedium(r.return_date)}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-white/40">
                      {r.unit?.name ?? "Unassigned"}
                    </span>
                    <RentalIndicators rental={r} size={14} className="shrink-0" />
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
