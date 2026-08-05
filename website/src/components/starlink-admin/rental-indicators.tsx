"use client";

import {
  CircleDollarSign,
  Coins,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import {
  RENTAL_STATUSES,
  STATUS_META,
  type RentalStatus,
  type RentalWithUnit,
} from "@/lib/starlink/types";
import { isPaidInFull } from "@/lib/starlink/billing";
import { cn } from "@/lib/utils";
import { STATUS_ICON, TONE_TEXT_CLASS } from "./status-badge";

/**
 * Compact at-a-glance icons for a rental: lifecycle status, deposit state, and
 * whether it's paid in full. Designed to sit on calendar chips and list rows.
 */
export function RentalIndicators({
  rental,
  size = 12,
  className,
}: {
  rental: RentalWithUnit;
  size?: number;
  className?: string;
}) {
  const status = rental.status as RentalStatus;
  const meta = STATUS_META[status];
  const StatusIcon = STATUS_ICON[status] ?? STATUS_ICON.requested;

  const paid = isPaidInFull(rental);

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      <StatusIcon
        size={size}
        strokeWidth={2.25}
        className={meta ? TONE_TEXT_CLASS[meta.tone] : "text-slate-300"}
        aria-label={`Status: ${meta?.label ?? status}`}
      />
      {rental.deposit_returned ? (
        <RotateCcw
          size={size}
          strokeWidth={2.25}
          className="text-slate-300"
          aria-label="Deposit returned"
        />
      ) : rental.deposit_received ? (
        <Coins
          size={size}
          strokeWidth={2.25}
          className="text-sky-300"
          aria-label="Deposit held"
        />
      ) : null}
      {paid ? (
        <CircleDollarSign
          size={size}
          strokeWidth={2.25}
          className="text-emerald-300"
          aria-label="Paid in full"
        />
      ) : null}
    </span>
  );
}

export function RentalIndicatorLegend({ className }: { className?: string }) {
  // Built from the same map the badges use, so the legend cannot drift out of
  // step with the glyphs it is explaining.
  const items: { icon: LucideIcon; label: string; cls: string }[] = [
    ...RENTAL_STATUSES.filter((s) => s !== "cancelled").map((status) => ({
      icon: STATUS_ICON[status],
      label: STATUS_META[status].label,
      cls: TONE_TEXT_CLASS[STATUS_META[status].tone],
    })),
    { icon: Coins, label: "Deposit held", cls: "text-sky-300" },
    { icon: RotateCcw, label: "Deposit back", cls: "text-slate-300" },
    { icon: CircleDollarSign, label: "Paid in full", cls: "text-emerald-300" },
  ];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
      {items.map(({ icon: Icon, label, cls }) => (
        <span key={label} className="flex items-center gap-1 text-[0.7rem] text-white/55">
          <Icon size={12} strokeWidth={2.25} className={cls} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}
