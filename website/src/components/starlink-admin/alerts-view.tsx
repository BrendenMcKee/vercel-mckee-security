"use client";

import { Bell } from "lucide-react";
import {
  ACTION_PRIORITY_UI,
  type RentalActionGroup,
} from "@/lib/starlink/outstanding";
import type { RentalWithUnit } from "@/lib/starlink/types";
import { cn } from "@/lib/utils";

export function AlertsView({
  groups,
  onSelectRental,
}: {
  groups: RentalActionGroup[];
  onSelectRental: (rental: RentalWithUnit) => void;
}) {
  if (groups.length === 0) {
    return (
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-8 text-center sm:px-6">
        <Bell className="mx-auto h-8 w-8 text-emerald-300" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-bold text-white">Nothing needs doing</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-white/60">
          Deposits are back, kits are assigned, and nobody is waiting. This list
          fills itself from the bookings — when something needs you, it shows
          up here and in the morning email.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">
        Same jobs as the morning email. Open a booking, do the thing, and it
        drops off this list on its own.
      </p>
      {groups.map((group) => (
        <ActionGroupCard
          key={group.id}
          group={group}
          onSelectRental={onSelectRental}
        />
      ))}
    </div>
  );
}

function ActionGroupCard({
  group,
  onSelectRental,
}: {
  group: RentalActionGroup;
  onSelectRental: (rental: RentalWithUnit) => void;
}) {
  const tone = ACTION_PRIORITY_UI[group.priority];
  return (
    <section className={cn("rounded-2xl border p-4 sm:p-5", tone.card)}>
      <p className={cn("text-sm font-semibold", tone.bandText)}>{tone.band}</p>
      <h2 className="mt-1 text-lg font-bold text-white">
        <span aria-hidden="true" className="mr-1.5">
          {group.icon}
        </span>
        {group.action}
      </h2>
      <p className="mt-1 text-sm text-white/70">{group.instruction}</p>
      <ul className="mt-4 space-y-2">
        {group.items.map((item) => (
          <li key={`${group.id}:${item.rentalId}`}>
            <button
              type="button"
              onClick={() => onSelectRental(item.rental)}
              className="flex min-h-11 w-full flex-col gap-1 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-left transition-colors hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-white">
                  {item.customerName}
                </span>
                <span className="mt-0.5 block text-sm text-white/65">
                  {item.detail}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {item.flag ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      tone.flag,
                    )}
                  >
                    {item.flag}
                  </span>
                ) : null}
                <span className="text-sm font-semibold text-white/80">Open</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
