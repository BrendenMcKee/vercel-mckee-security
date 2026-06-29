"use client";

import { useMemo } from "react";
import {
  CalendarClock,
  DollarSign,
  Inbox,
  PiggyBank,
  Satellite,
  Wallet,
} from "lucide-react";
import type { RentalWithUnit } from "@/lib/starlink/types";
import { formatCurrency } from "@/lib/starlink/format";

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

export function StarlinkStatsBar({
  rentals,
  todayIso,
}: {
  rentals: RentalWithUnit[];
  todayIso: string;
}) {
  const stats = useMemo(() => {
    const notCancelled = rentals.filter((r) => r.status !== "cancelled");

    const outNow = rentals.filter((r) => r.status === "active").length;
    const upcoming = rentals.filter(
      (r) => r.status === "confirmed" && r.return_date >= todayIso,
    ).length;
    const requests = rentals.filter((r) => r.status === "requested").length;

    const revenue = sum(notCancelled.map((r) => r.amount_received));

    const outstanding = sum(
      rentals
        .filter((r) => r.status === "confirmed" || r.status === "active")
        .map((r) => {
          const quoted = r.quoted_price ?? 0;
          const paid = r.amount_received ?? 0;
          const due = quoted - paid;
          return due > 0 ? due : 0;
        }),
    );

    const depositsHeld = sum(
      rentals
        .filter((r) => r.deposit_received && !r.deposit_returned)
        .map((r) => r.deposit_amount),
    );

    return { outNow, upcoming, requests, revenue, outstanding, depositsHeld };
  }, [rentals, todayIso]);

  const cards = [
    {
      label: "Kits out now",
      value: String(stats.outNow),
      icon: Satellite,
      tone: "text-emerald-300",
    },
    {
      label: "Upcoming confirmed",
      value: String(stats.upcoming),
      icon: CalendarClock,
      tone: "text-blue-300",
    },
    {
      label: "New requests",
      value: String(stats.requests),
      icon: Inbox,
      tone: "text-amber-300",
      highlight: stats.requests > 0,
    },
    {
      label: "Revenue collected",
      value: formatCurrency(stats.revenue),
      icon: DollarSign,
      tone: "text-emerald-300",
    },
    {
      label: "Outstanding balance",
      value: formatCurrency(stats.outstanding),
      icon: Wallet,
      tone: "text-orange-300",
    },
    {
      label: "Deposits held",
      value: formatCurrency(stats.depositsHeld),
      icon: PiggyBank,
      tone: "text-sky-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-xl border bg-surface/60 p-3.5 transition-colors ${
              card.highlight
                ? "border-amber-500/40"
                : "border-white/10"
            }`}
          >
            <div className="mb-1.5 flex items-center gap-1.5">
              <Icon className={`h-4 w-4 ${card.tone}`} aria-hidden="true" />
              <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-white/45">
                {card.label}
              </span>
            </div>
            <p className="text-lg font-bold text-white sm:text-xl">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
