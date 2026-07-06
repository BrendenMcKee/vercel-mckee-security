"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import {
  RENTAL_STATUSES,
  type RentalWithUnit,
  type Unit,
} from "@/lib/starlink/types";
import { formatCurrency, formatDateMedium } from "@/lib/starlink/format";
import { StatusBadge } from "./status-badge";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportCsv(rows: RentalWithUnit[]) {
  const header = [
    "Customer",
    "Email",
    "Phone",
    "Address",
    "Usage location",
    "Unit",
    "Status",
    "Source",
    "Pickup",
    "Pickup time",
    "Return",
    "Daily rate",
    "Quoted price",
    "Amount received",
    "Deposit amount",
    "Deposit received",
    "Deposit returned",
    "Comments",
    "Created",
  ];
  const lines = rows.map((r) =>
    [
      r.customer_name,
      r.customer_email,
      r.customer_phone,
      r.customer_address,
      r.usage_location,
      r.unit?.name ?? "",
      r.status,
      r.source,
      r.pickup_date,
      r.pickup_time,
      r.return_date,
      r.daily_rate,
      r.quoted_price,
      r.amount_received,
      r.deposit_amount,
      r.deposit_received ? "yes" : "no",
      r.deposit_returned ? "yes" : "no",
      r.comments,
      r.created_at,
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `starlink-rentals-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RentalsTable({
  rentals,
  units,
  onSelectRental,
}: {
  rentals: RentalWithUnit[];
  units: Unit[];
  onSelectRental: (rental: RentalWithUnit) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rentals
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .filter((r) => {
        if (unitFilter === "all") return true;
        if (unitFilter === "unassigned") return !r.unit_id;
        return r.unit_id === unitFilter;
      })
      .filter((r) => {
        if (!q) return true;
        return (
          r.customer_name.toLowerCase().includes(q) ||
          r.customer_email.toLowerCase().includes(q) ||
          (r.customer_phone ?? "").toLowerCase().includes(q) ||
          (r.usage_location ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.pickup_date.localeCompare(a.pickup_date));
  }, [rentals, statusFilter, unitFilter, search]);

  const selectClass =
    "select-chevron cursor-pointer rounded-lg border border-white/10 bg-surface/60 px-3 py-2 text-sm text-white outline-none focus:border-primary";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full rounded-lg border border-white/10 bg-surface/60 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {RENTAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          className={selectClass}
          aria-label="Filter by unit"
        >
          <option value="all">All units</option>
          <option value="unassigned">Unassigned</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => exportCsv(filtered)}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface/60 px-3 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5 disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          CSV
        </button>
      </div>

      <p className="text-xs text-white/40">
        {filtered.length} rental{filtered.length === 1 ? "" : "s"}
      </p>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-black/20 text-left text-xs uppercase tracking-wide text-white/40">
              <th className="px-3 py-2.5 font-semibold">Customer</th>
              <th className="px-3 py-2.5 font-semibold">Unit</th>
              <th className="px-3 py-2.5 font-semibold">Dates</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 text-right font-semibold">Quoted</th>
              <th className="px-3 py-2.5 text-right font-semibold">Received</th>
              <th className="px-3 py-2.5 text-center font-semibold">Deposit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => onSelectRental(r)}
                className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/5"
              >
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-white">{r.customer_name}</div>
                  <div className="text-xs text-white/45">{r.customer_email}</div>
                </td>
                <td className="px-3 py-2.5">
                  {r.unit ? (
                    <span className="flex items-center gap-1.5 text-white/80">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: r.unit.color }}
                        aria-hidden="true"
                      />
                      {r.unit.name}
                    </span>
                  ) : (
                    <span className="text-white/35">Unassigned</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-white/70">
                  <div>{formatDateMedium(r.pickup_date)}</div>
                  <div className="text-xs text-white/45">
                    → {formatDateMedium(r.return_date)}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2.5 text-right text-white/80">
                  {formatCurrency(r.quoted_price)}
                </td>
                <td className="px-3 py-2.5 text-right text-white/80">
                  {formatCurrency(r.amount_received)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {r.deposit_received ? (
                    r.deposit_returned ? (
                      <span className="text-xs text-white/45">Returned</span>
                    ) : (
                      <span className="text-xs font-semibold text-sky-300">Held</span>
                    )
                  ) : (
                    <span className="text-xs text-white/30">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-white/40">
                  No rentals match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-surface/40 p-4 text-sm text-white/40">
            No rentals match your filters.
          </p>
        ) : (
          filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRental(r)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-surface/60 p-3 text-left transition-colors hover:bg-white/5"
            >
              <span
                className="h-10 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: r.unit?.color ?? "rgba(251,191,36,0.6)" }}
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
                <span className="mt-0.5 block truncate text-xs text-white/40">
                  {r.unit?.name ?? "Unassigned"} · {formatCurrency(r.quoted_price)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
