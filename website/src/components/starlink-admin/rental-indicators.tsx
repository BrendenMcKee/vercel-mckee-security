"use client";

import {
  CircleCheck,
  CircleDollarSign,
  Clock3,
  Coins,
  PackageCheck,
  RotateCcw,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { RentalStatus, RentalWithUnit } from "@/lib/starlink/types";
import { cn } from "@/lib/utils";

const STATUS_ICON: Record<RentalStatus, LucideIcon> = {
  requested: Clock3,
  confirmed: CircleCheck,
  active: Zap,
  returned: PackageCheck,
  cancelled: XCircle,
};

const STATUS_ICON_CLASS: Record<RentalStatus, string> = {
  requested: "text-amber-300",
  confirmed: "text-blue-300",
  active: "text-emerald-300",
  returned: "text-slate-300",
  cancelled: "text-red-300",
};

export function isPaidInFull(rental: RentalWithUnit): boolean {
  return (
    rental.quoted_price != null &&
    rental.quoted_price > 0 &&
    rental.amount_received != null &&
    rental.amount_received >= rental.quoted_price
  );
}

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
  const StatusIcon = STATUS_ICON[status] ?? Clock3;

  const paid = isPaidInFull(rental);

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      <StatusIcon
        size={size}
        strokeWidth={2.25}
        className={STATUS_ICON_CLASS[status] ?? "text-slate-300"}
        aria-label={`Status: ${status}`}
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
  const items: { icon: LucideIcon; label: string; cls: string }[] = [
    { icon: Clock3, label: "Requested", cls: "text-amber-300" },
    { icon: CircleCheck, label: "Confirmed", cls: "text-blue-300" },
    { icon: Zap, label: "Out (active)", cls: "text-emerald-300" },
    { icon: PackageCheck, label: "Returned", cls: "text-slate-300" },
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
