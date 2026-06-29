"use client";

import { useMemo } from "react";
import type { RentalWithUnit } from "@/lib/starlink/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return `rgba(148,163,184,${alpha})`;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

type DayCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  rentals: RentalWithUnit[];
};

export function CalendarMonth({
  monthDate,
  rentals,
  todayIso,
  onSelectRental,
}: {
  monthDate: Date;
  rentals: RentalWithUnit[];
  todayIso: string;
  onSelectRental: (rental: RentalWithUnit) => void;
}) {
  const cells = useMemo<DayCell[]>(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = firstOfMonth.getDay();
    const gridStart = new Date(year, month, 1 - startWeekday);

    const visible = rentals.filter((r) => r.status !== "cancelled");

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const iso = toIso(d);
      const dayRentals = visible
        .filter((r) => r.pickup_date <= iso && iso <= r.return_date)
        .sort((a, b) => (a.unit?.name ?? "~").localeCompare(b.unit?.name ?? "~"));
      return {
        iso,
        day: d.getDate(),
        inMonth: d.getMonth() === month,
        isToday: iso === todayIso,
        rentals: dayRentals,
      };
    });
  }, [monthDate, rentals, todayIso]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-surface/40">
      <div className="grid grid-cols-7 border-b border-white/10 bg-black/20">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="px-2 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-white/40"
          >
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => (
          <div
            key={cell.iso}
            className={cn(
              "min-h-[5.5rem] border-b border-r border-white/5 p-1.5 align-top",
              idx % 7 === 6 && "border-r-0",
              !cell.inMonth && "bg-black/20",
            )}
          >
            <div className="mb-1 flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                  cell.inMonth ? "text-white/70" : "text-white/25",
                  cell.isToday && "bg-primary font-bold text-white",
                )}
              >
                {cell.day}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {cell.rentals.slice(0, 3).map((r) => {
                const color = r.unit?.color ?? null;
                const firstName = r.customer_name.split(" ")[0] ?? r.customer_name;
                const isStart = r.pickup_date === cell.iso;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectRental(r)}
                    title={`${r.customer_name} · ${r.unit?.name ?? "Unassigned"}`}
                    className={cn(
                      "flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[0.7rem] font-medium transition-opacity hover:opacity-80",
                      !color &&
                        "border border-dashed border-amber-400/50 bg-amber-400/10 text-amber-200",
                      r.status === "requested" && "opacity-80",
                    )}
                    style={
                      color
                        ? {
                            backgroundColor: hexToRgba(color, 0.22),
                            borderLeft: `3px solid ${color}`,
                            color: "#fff",
                          }
                        : undefined
                    }
                  >
                    <span className="truncate">
                      {isStart ? firstName : `· ${firstName}`}
                    </span>
                  </button>
                );
              })}
              {cell.rentals.length > 3 ? (
                <button
                  type="button"
                  onClick={() => onSelectRental(cell.rentals[3])}
                  className="px-1.5 text-left text-[0.7rem] font-medium text-white/50 hover:text-white"
                >
                  +{cell.rentals.length - 3} more
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
