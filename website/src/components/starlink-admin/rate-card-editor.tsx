"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { parseMoneyInput } from "@/lib/starlink/billing";
import { replaceRateTiers } from "@/lib/starlink/client-api";
import { formatCurrency } from "@/lib/starlink/format";
import {
  DEFAULT_RATE_TIERS,
  formatTierRange,
  validateRateTiers,
  type RateTierInput,
} from "@/lib/starlink/pricing";
import type { RentalRateTier } from "@/lib/starlink/types";
import { cn } from "@/lib/utils";
import { Field, inputClass } from "./form-ui";

type DraftTier = {
  key: string;
  minText: string;
  maxText: string;
  amountText: string;
};

function displayTiers(rates: RentalRateTier[]): RateTierInput[] {
  const source = rates.length > 0 ? rates : DEFAULT_RATE_TIERS;
  return source
    .slice()
    .sort((a, b) => a.min_days - b.min_days || a.max_days - b.max_days)
    .map((tier) => ({
      min_days: tier.min_days,
      max_days: tier.max_days,
      amount: Number(tier.amount),
    }));
}

function toDraft(tiers: RateTierInput[]): DraftTier[] {
  return tiers.map((tier, index) => ({
    key: `${tier.min_days}-${tier.max_days}-${index}`,
    minText: String(tier.min_days),
    maxText: String(tier.max_days),
    amountText: String(tier.amount),
  }));
}

function parseDay(raw: string): number | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isInteger(n) ? n : null;
}

function RateChips({ tiers }: { tiers: RateTierInput[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tiers.map((tier) => (
        <li
          key={`${tier.min_days}-${tier.max_days}`}
          className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-sm text-white/85"
        >
          <span className="text-white/55">{formatTierRange(tier)}</span>
          {" · "}
          <span className="font-semibold tabular-nums">
            {formatCurrency(tier.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RateCardForm({
  rates,
  onSaved,
  onError,
}: {
  rates: RentalRateTier[];
  onSaved: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState<DraftTier[]>(() =>
    toDraft(displayTiers(rates)),
  );
  const [busy, setBusy] = useState(false);

  function update(key: string, patch: Partial<DraftTier>) {
    setDraft((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  async function save() {
    if (busy) return;
    const tiers: RateTierInput[] = [];
    for (const row of draft) {
      const minDays = parseDay(row.minText);
      const maxDays = parseDay(row.maxText);
      const parsed = parseMoneyInput(row.amountText);
      if (minDays == null || maxDays == null) {
        onError("Each band needs a first and last day, for example 4 and 7.");
        return;
      }
      if (!parsed.ok || parsed.value == null) {
        onError("Each rate must be an amount, for example 150.");
        return;
      }
      tiers.push({
        min_days: minDays,
        max_days: maxDays,
        amount: parsed.value,
      });
    }
    const invalid = validateRateTiers(tiers);
    if (invalid) {
      onError(invalid);
      return;
    }
    setBusy(true);
    try {
      await replaceRateTiers(tiers);
      await onSaved("Saved the base rental rates.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save the rates.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-white/10 pt-3">
      <p className="text-sm text-white/55">
        Pre-tax amounts. New website requests and unpriced bookings pick up the
        band that matches their dates. You can still change any one booking.
        Profit uses what was actually received, not this card.
      </p>
      <div className="space-y-2">
        {draft.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <Field label="From">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={row.minText}
                onChange={(e) => update(row.key, { minText: e.target.value })}
                className={inputClass}
                aria-label="First day of this band"
              />
            </Field>
            <Field label="To">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={row.maxText}
                onChange={(e) => update(row.key, { maxText: e.target.value })}
                className={inputClass}
                aria-label="Last day of this band"
              />
            </Field>
            <Field label="Amount + HST">
              <input
                inputMode="decimal"
                value={row.amountText}
                onChange={(e) => update(row.key, { amountText: e.target.value })}
                className={inputClass}
                aria-label="Rate for this band"
              />
            </Field>
            <button
              type="button"
              onClick={() =>
                setDraft((rows) => rows.filter((item) => item.key !== row.key))
              }
              disabled={draft.length <= 1}
              className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-white/50 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30 sm:h-9 sm:w-9"
              aria-label="Remove this band"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const last = draft[draft.length - 1];
            const lastMax = last ? parseDay(last.maxText) : null;
            const nextMin = lastMax != null ? lastMax + 1 : 1;
            setDraft((rows) => [
              ...rows,
              {
                key: `new-${Date.now()}`,
                minText: String(nextMin),
                maxText: String(nextMin + 6),
                amountText: "",
              },
            ]);
          }}
          className="flex min-h-11 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/5 sm:min-h-0"
        >
          <Plus className="h-4 w-4" />
          Add band
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 sm:min-h-0"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save rates
        </button>
      </div>
    </div>
  );
}

/** Always-visible rate card: chips on every tab, editor on demand. */
export function RateCardBar({
  rates,
  onSaved,
  onError,
}: {
  rates: RentalRateTier[];
  onSaved: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const tiers = displayTiers(rates);

  return (
    <section className="rounded-xl border border-white/10 bg-surface/60 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Tag className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-bold text-white">Base rental rates</h3>
            <span className="text-xs text-white/45">pre-tax · + HST</span>
          </div>
          <RateChips tiers={tiers} />
        </div>
        <button
          type="button"
          onClick={() => setEditing((open) => !open)}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/5 sm:min-h-0"
          aria-expanded={editing}
        >
          {editing ? "Close" : "Edit"}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", editing && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </div>
      {editing ? (
        <RateCardForm
          key={
            rates
              .map((row) => `${row.id}:${row.updated_at}`)
              .join("|") || "defaults"
          }
          rates={rates}
          onSaved={async (message) => {
            await onSaved(message);
            setEditing(false);
          }}
          onError={onError}
        />
      ) : null}
    </section>
  );
}
