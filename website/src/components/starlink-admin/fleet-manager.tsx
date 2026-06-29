"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { UNIT_COLOR_PALETTE, type Unit } from "@/lib/starlink/types";
import { createUnit, deleteUnit, updateUnit } from "@/lib/starlink/client-api";
import { cn } from "@/lib/utils";

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {UNIT_COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "h-6 w-6 rounded-md ring-2 ring-offset-2 ring-offset-surface transition-transform hover:scale-110",
            value.toLowerCase() === c.toLowerCase()
              ? "ring-white"
              : "ring-transparent",
          )}
          style={{ backgroundColor: c }}
          aria-label={`Use color ${c}`}
        />
      ))}
    </div>
  );
}

function UnitRow({
  unit,
  onChanged,
  onError,
  onSuccess,
}: {
  unit: Unit;
  onChanged: () => Promise<void> | void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [name, setName] = useState(unit.name);
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>, successMsg: string) {
    setBusy(true);
    try {
      await updateUnit(unit.id, body);
      await onChanged();
      onSuccess(successMsg);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${unit.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteUnit(unit.id);
      await onChanged();
      onSuccess("Unit deleted.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-surface/60 p-3.5">
      <div className="flex items-center gap-3">
        <span
          className="h-8 w-8 shrink-0 rounded-md"
          style={{ backgroundColor: unit.color }}
          aria-hidden="true"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const trimmed = name.trim();
            if (trimmed && trimmed !== unit.name) {
              patch({ name: trimmed }, "Name updated.");
            } else {
              setName(unit.name);
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-white outline-none hover:border-white/10 focus:border-primary"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ active: !unit.active }, unit.active ? "Marked inactive." : "Marked active.")}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors disabled:opacity-50",
            unit.active
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
              : "bg-slate-500/15 text-slate-300 ring-slate-500/30",
          )}
        >
          {unit.active ? "Active" : "Inactive"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
          aria-label="Delete unit"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="mt-3 pl-11">
        <ColorPicker
          value={unit.color}
          onChange={(color) => patch({ color }, "Color updated.")}
        />
      </div>
    </div>
  );
}

export function FleetManager({
  units,
  onChanged,
  onError,
  onSuccess,
}: {
  units: Unit[];
  onChanged: () => Promise<void> | void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(UNIT_COLOR_PALETTE[0]);
  const [adding, setAdding] = useState(false);

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await createUnit({ name, color: newColor });
      setNewName("");
      // Rotate suggested color to the next in palette.
      const idx = UNIT_COLOR_PALETTE.indexOf(newColor as (typeof UNIT_COLOR_PALETTE)[number]);
      setNewColor(UNIT_COLOR_PALETTE[(idx + 1) % UNIT_COLOR_PALETTE.length]);
      await onChanged();
      onSuccess("Unit added.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not add unit.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-surface/60 p-4">
        <h3 className="mb-3 text-sm font-bold text-white">Add a Starlink kit</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
              Name
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
              placeholder="e.g. Starlink 3"
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
              Color
            </label>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <button
            type="button"
            onClick={add}
            disabled={adding || newName.trim().length === 0}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </button>
        </div>
      </div>

      {units.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-surface/40 p-4 text-sm text-white/50">
          No units yet. Add your first Starlink kit above.
        </p>
      ) : (
        <div className="space-y-2.5">
          {units.map((u) => (
            <UnitRow
              key={u.id}
              unit={u}
              onChanged={onChanged}
              onError={onError}
              onSuccess={onSuccess}
            />
          ))}
        </div>
      )}
    </div>
  );
}
