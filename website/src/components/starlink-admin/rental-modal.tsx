"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import {
  RENTAL_STATUSES,
  STATUS_META,
  STATUS_TONE_HEX,
  type RentalStatus,
  type RentalWithUnit,
  type Unit,
} from "@/lib/starlink/types";
import {
  createRental,
  deleteRental,
  updateRental,
} from "@/lib/starlink/client-api";
import { daysBetweenInclusive } from "@/lib/starlink/dates";
import { formatCurrency, hexToRgba } from "@/lib/starlink/format";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";

type FormState = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  usage_location: string;
  unit_id: string;
  status: string;
  source: string;
  pickup_date: string;
  pickup_time: string;
  return_date: string;
  daily_rate: string;
  quoted_price: string;
  amount_received: string;
  deposit_amount: string;
  deposit_returned_amount: string;
  deposit_received: boolean;
  deposit_returned: boolean;
  comments: string;
};

function s(value: string | null | undefined): string {
  return value ?? "";
}
function n(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}
function parseMoney(value: string): number | null {
  const t = value.trim();
  if (!t) return null;
  const num = Number(t);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function initialState(rental: RentalWithUnit | null): FormState {
  return {
    customer_name: s(rental?.customer_name),
    customer_email: s(rental?.customer_email),
    customer_phone: s(rental?.customer_phone),
    customer_address: s(rental?.customer_address),
    usage_location: s(rental?.usage_location),
    unit_id: s(rental?.unit_id),
    status: rental?.status ?? "requested",
    source: rental?.source ?? "admin",
    pickup_date: s(rental?.pickup_date),
    pickup_time: s(rental?.pickup_time),
    return_date: s(rental?.return_date),
    daily_rate: n(rental?.daily_rate),
    quoted_price: n(rental?.quoted_price),
    amount_received: n(rental?.amount_received),
    deposit_amount: n(rental?.deposit_amount),
    deposit_returned_amount: n(rental?.deposit_returned_amount),
    deposit_received: rental?.deposit_received ?? false,
    deposit_returned: rental?.deposit_returned ?? false,
    comments: s(rental?.comments),
  };
}

const inputClass =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-primary";
const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50";

function Field({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export function RentalModal({
  rental,
  units,
  onClose,
  onSaved,
  onError,
}: {
  rental: RentalWithUnit | null;
  units: Unit[];
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const isEdit = Boolean(rental);
  const [form, setForm] = useState<FormState>(() => initialState(rental));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const days = useMemo(() => {
    if (!form.pickup_date || !form.return_date) return 0;
    if (form.return_date < form.pickup_date) return 0;
    return daysBetweenInclusive(form.pickup_date, form.return_date);
  }, [form.pickup_date, form.return_date]);

  const suggestedTotal = useMemo(() => {
    const rate = parseMoney(form.daily_rate);
    if (rate === null || days === 0) return null;
    return rate * days;
  }, [form.daily_rate, days]);

  const balanceDue = useMemo(() => {
    const quoted = parseMoney(form.quoted_price);
    const paid = parseMoney(form.amount_received) ?? 0;
    if (quoted === null) return null;
    return quoted - paid;
  }, [form.quoted_price, form.amount_received]);

  const statusKey: RentalStatus = RENTAL_STATUSES.includes(
    form.status as RentalStatus,
  )
    ? (form.status as RentalStatus)
    : "requested";
  const statusMeta = STATUS_META[statusKey];
  const statusHex = STATUS_TONE_HEX[statusMeta.tone];
  const selectedUnit = units.find((u) => u.id === form.unit_id) ?? null;
  const unitColor = selectedUnit?.color ?? null;

  async function handleSave() {
    setError("");
    if (!form.customer_name.trim()) return setError("Customer name is required.");
    if (!form.customer_email.trim()) return setError("Customer email is required.");
    if (!form.pickup_date) return setError("Pickup date is required.");
    if (!form.return_date) return setError("Return date is required.");
    if (form.return_date < form.pickup_date) {
      return setError("Return date must be on or after pickup date.");
    }

    const body: Record<string, unknown> = {
      customer_name: form.customer_name.trim(),
      customer_email: form.customer_email.trim(),
      customer_phone: form.customer_phone.trim() || null,
      customer_address: form.customer_address.trim() || null,
      usage_location: form.usage_location.trim() || null,
      unit_id: form.unit_id || null,
      status: form.status,
      source: form.source,
      pickup_date: form.pickup_date,
      pickup_time: form.pickup_time.trim() || null,
      return_date: form.return_date,
      daily_rate: parseMoney(form.daily_rate),
      quoted_price: parseMoney(form.quoted_price),
      amount_received: parseMoney(form.amount_received),
      deposit_amount: parseMoney(form.deposit_amount),
      deposit_returned_amount: parseMoney(form.deposit_returned_amount),
      deposit_received: form.deposit_received,
      deposit_returned: form.deposit_returned,
      comments: form.comments.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit && rental) {
        body.expected_updated_at = rental.updated_at;
        await updateRental(rental.id, body);
        onSaved("Rental updated.");
      } else {
        await createRental(body);
        onSaved("Rental created.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!rental) return;
    if (!confirm("Delete this rental permanently? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteRental(rental.id);
      onSaved("Rental deleted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete.";
      setError(message);
      onError(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border bg-surface shadow-2xl shadow-black/50 transition-colors"
        style={{
          borderColor: hexToRgba(statusHex, 0.55),
          boxShadow: `0 0 0 1px ${hexToRgba(statusHex, 0.18)}, 0 25px 50px -12px rgba(0,0,0,0.6)`,
        }}
      >
        <div
          className="h-1.5 w-full"
          style={{
            background: `linear-gradient(90deg, ${statusHex}, ${unitColor ?? statusHex})`,
          }}
          aria-hidden="true"
        />
        <div
          className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-surface px-5 py-4"
          style={{ borderBottomColor: hexToRgba(statusHex, 0.3) }}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <h2 className="text-base font-bold text-white">
              {isEdit ? "Rental details" : "New rental"}
            </h2>
            <StatusBadge status={statusKey} />
            {selectedUnit ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold"
                style={{
                  borderColor: hexToRgba(selectedUnit.color, 0.5),
                  backgroundColor: hexToRgba(selectedUnit.color, 0.15),
                  color: "#fff",
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: selectedUnit.color }}
                  aria-hidden="true"
                />
                {selectedUnit.name}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* Customer */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-white/40">
              Customer
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name *">
                <input
                  className={inputClass}
                  value={form.customer_name}
                  onChange={(e) => set("customer_name", e.target.value)}
                />
              </Field>
              <Field label="Email *">
                <input
                  className={inputClass}
                  type="email"
                  value={form.customer_email}
                  onChange={(e) => set("customer_email", e.target.value)}
                />
              </Field>
              <Field label="Phone">
                <input
                  className={inputClass}
                  type="tel"
                  value={form.customer_phone}
                  onChange={(e) => set("customer_phone", e.target.value)}
                />
              </Field>
              <Field label="Home address">
                <input
                  className={inputClass}
                  value={form.customer_address}
                  onChange={(e) => set("customer_address", e.target.value)}
                />
              </Field>
              <Field label="Where the kit will be used" className="sm:col-span-2">
                <textarea
                  className={cn(inputClass, "min-h-19 resize-y leading-relaxed")}
                  rows={3}
                  value={form.usage_location}
                  onChange={(e) => set("usage_location", e.target.value)}
                  placeholder="Cottage, campsite, job site..."
                />
              </Field>
            </div>
          </section>

          {/* Booking */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-white/40">
              Booking
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label={
                  <span className="flex items-center gap-1.5">
                    Unit
                    {unitColor ? (
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: unitColor }}
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                }
              >
                <select
                  className={cn(inputClass, "select-chevron cursor-pointer")}
                  style={
                    unitColor
                      ? {
                          borderLeft: `4px solid ${unitColor}`,
                          backgroundColor: hexToRgba(unitColor, 0.12),
                        }
                      : undefined
                  }
                  value={form.unit_id}
                  onChange={(e) => set("unit_id", e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {!u.active ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className={cn(inputClass, "select-chevron cursor-pointer font-semibold")}
                  style={{
                    borderLeft: `4px solid ${statusHex}`,
                    backgroundColor: hexToRgba(statusHex, 0.12),
                    color: statusHex,
                  }}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  {RENTAL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {STATUS_META[st].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Pickup date *">
                <input
                  className={inputClass}
                  type="date"
                  value={form.pickup_date}
                  onChange={(e) => set("pickup_date", e.target.value)}
                />
              </Field>
              <Field label="Return date *">
                <input
                  className={inputClass}
                  type="date"
                  value={form.return_date}
                  onChange={(e) => set("return_date", e.target.value)}
                />
              </Field>
              <Field label="Pickup time (optional)" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={form.pickup_time}
                  onChange={(e) => set("pickup_time", e.target.value)}
                  placeholder="e.g. 10:00 AM"
                />
              </Field>
            </div>
            {days > 0 ? (
              <p className="text-xs text-white/45">
                {days} day{days === 1 ? "" : "s"}
                {suggestedTotal !== null
                  ? ` · suggested total ${formatCurrency(suggestedTotal)} at this daily rate`
                  : ""}
              </p>
            ) : null}
            {statusKey === "confirmed" || statusKey === "active" ? (
              <p
                className="rounded-lg border px-3 py-2 text-xs"
                style={{
                  borderColor: hexToRgba(statusHex, 0.3),
                  backgroundColor: hexToRgba(statusHex, 0.1),
                  color: statusHex,
                }}
              >
                {statusKey === "active" ? "Active" : "Confirmed"} rentals reserve the
                unit. Overlapping dates on the same unit will be rejected.
              </p>
            ) : null}
          </section>

          {/* Money */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-white/40">
              Billing
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Daily rate">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.daily_rate}
                  onChange={(e) => set("daily_rate", e.target.value)}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Quoted price">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.quoted_price}
                  onChange={(e) => set("quoted_price", e.target.value)}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Amount received">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.amount_received}
                  onChange={(e) => set("amount_received", e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            </div>
            {balanceDue !== null ? (
              <p
                className={cn(
                  "text-xs font-semibold",
                  balanceDue > 0 ? "text-orange-300" : "text-emerald-300",
                )}
              >
                Balance due: {formatCurrency(balanceDue)}
              </p>
            ) : null}
          </section>

          {/* Deposit */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-white/40">
              Deposit
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Deposit amount">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.deposit_amount}
                  onChange={(e) => set("deposit_amount", e.target.value)}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Returned amount">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.deposit_returned_amount}
                  onChange={(e) => set("deposit_returned_amount", e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-3">
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  form.deposit_received
                    ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
                    : "border-white/15 bg-black/20 text-white/70 hover:bg-white/5",
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                  checked={form.deposit_received}
                  onChange={(e) => set("deposit_received", e.target.checked)}
                />
                Deposit received
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  form.deposit_returned
                    ? "border-slate-300/40 bg-slate-300/10 text-slate-200"
                    : "border-white/15 bg-black/20 text-white/70 hover:bg-white/5",
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                  checked={form.deposit_returned}
                  onChange={(e) => set("deposit_returned", e.target.checked)}
                />
                Deposit returned
              </label>
            </div>
          </section>

          {/* Comments */}
          <Field label="Internal comments">
            <textarea
              className={cn(inputClass, "min-h-68 resize-y leading-relaxed")}
              rows={12}
              value={form.comments}
              onChange={(e) => set("comments", e.target.value)}
              placeholder="Notes for the team..."
            />
          </Field>

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-b-2xl border-t border-white/10 bg-surface px-5 py-4">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Create rental"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
