"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DEVICE_CATEGORIES,
  DEVICE_CATEGORY_LABELS,
  deviceCategoryLabel,
  deviceExpiryDate,
  type DeviceCategory,
} from "@/lib/portal/devices";

export type AdminDeviceRow = {
  id: string;
  label: string;
  category: string;
  installedOn: string;
  lifetimeYears: number;
  profileId: string;
  clientName: string;
};

type DueFilter = "all" | "overdue" | "due_soon";

const DUE_SOON_MS = 365 * 86_400_000;

const chipBase =
  "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors";
const chipOff = "border-white/15 text-white/55 hover:text-white";
const chipOn = "border-primary/60 bg-primary/15 text-white";

function dueState(row: AdminDeviceRow): { dueDate: Date; overdue: boolean; dueSoon: boolean } {
  const dueDate = deviceExpiryDate(row.installedOn, row.lifetimeYears);
  const delta = dueDate.getTime() - Date.now();
  return { dueDate, overdue: delta <= 0, dueSoon: delta > 0 && delta <= DUE_SOON_MS };
}

function DueBadge({ overdue, dueSoon }: { overdue: boolean; dueSoon: boolean }) {
  if (overdue) {
    return (
      <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
        Replacement due
      </span>
    );
  }
  if (dueSoon) {
    return (
      <span className="inline-block rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-300">
        Due within a year
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
      OK
    </span>
  );
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "long" });
}

export function AdminDevicesPanel({ devices }: { devices: AdminDeviceRow[] }) {
  const [categoryFilter, setCategoryFilter] = useState<"" | DeviceCategory>("");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");

  // Only offer category chips that actually have devices behind them.
  const usedCategories = useMemo(() => {
    const used = new Set(devices.map((d) => d.category));
    return DEVICE_CATEGORIES.filter((c) => used.has(c));
  }, [devices]);

  const rows = useMemo(() => {
    return devices
      .map((row) => ({ row, ...dueState(row) }))
      .filter(({ row }) => !categoryFilter || row.category === categoryFilter)
      .filter(({ overdue, dueSoon }) =>
        dueFilter === "overdue" ? overdue : dueFilter === "due_soon" ? overdue || dueSoon : true,
      )
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [devices, categoryFilter, dueFilter]);

  const overdueCount = useMemo(
    () => devices.filter((d) => dueState(d).overdue).length,
    [devices],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Tracked Devices</h2>
        <span className="text-xs text-white/40">
          {rows.length} of {devices.length} shown
          {overdueCount > 0 && (
            <span className="text-amber-300"> &middot; {overdueCount} overdue</span>
          )}
        </span>
      </div>
      <p className="text-xs text-white/40">
        Every device tracked across all clients, soonest replacement first.
        Filter by category to plan a service run (all system batteries, all
        smoke detectors). Devices are added and edited on each client&apos;s
        page.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("")}
          className={`${chipBase} ${categoryFilter === "" ? chipOn : chipOff}`}
        >
          All categories
        </button>
        {usedCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter((v) => (v === cat ? "" : cat))}
            className={`${chipBase} ${categoryFilter === cat ? chipOn : chipOff}`}
          >
            {DEVICE_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All devices"],
            ["overdue", "Overdue now"],
            ["due_soon", "Due within a year"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setDueFilter(value)}
            className={`${chipBase} ${dueFilter === value ? chipOn : chipOff}`}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-surface px-4 py-8 text-center text-sm text-white/40">
          {devices.length === 0
            ? "No devices are tracked yet. Add equipment on a client's page and it shows up here."
            : "No devices match these filters."}
        </p>
      ) : (
        <>
          {/* Mobile: stacked cards. */}
          <ul className="space-y-3 md:hidden">
            {rows.map(({ row, dueDate, overdue, dueSoon }) => (
              <li
                key={row.id}
                className={`rounded-2xl border p-4 ${
                  overdue ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-surface"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-white">{row.label}</p>
                    <p className="mt-0.5 text-xs uppercase tracking-widest text-white/40">
                      {deviceCategoryLabel(row.category)}
                    </p>
                  </div>
                  <DueBadge overdue={overdue} dueSoon={dueSoon} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-sm">
                  <Link
                    href={`/admin-dashboard/clients/${row.profileId}`}
                    className="font-bold text-white hover:text-primary"
                  >
                    {row.clientName}
                  </Link>
                  <span className={overdue ? "font-bold text-amber-300" : "text-white/60"}>
                    Due {formatMonth(dueDate)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-surface md:block">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-white/40">
                  <th className="px-4 py-3 font-bold">Device</th>
                  <th className="px-4 py-3 font-bold">Category</th>
                  <th className="px-4 py-3 font-bold">Client</th>
                  <th className="px-4 py-3 font-bold">Installed</th>
                  <th className="px-4 py-3 font-bold">Replacement due</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ row, dueDate, overdue, dueSoon }) => (
                  <tr
                    key={row.id}
                    className={`border-b border-white/5 last:border-0 ${overdue ? "bg-amber-500/5" : ""}`}
                  >
                    <td className="px-4 py-3 font-bold text-white">{row.label}</td>
                    <td className="px-4 py-3 text-white/60">{deviceCategoryLabel(row.category)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin-dashboard/clients/${row.profileId}`}
                        className="font-bold text-white hover:text-primary"
                      >
                        {row.clientName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/60">{row.installedOn}</td>
                    <td className={`px-4 py-3 ${overdue ? "font-bold text-amber-300" : "text-white/60"}`}>
                      {formatMonth(dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <DueBadge overdue={overdue} dueSoon={dueSoon} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
