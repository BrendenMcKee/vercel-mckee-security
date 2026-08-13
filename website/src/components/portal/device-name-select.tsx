"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DEVICE_PRESETS, type DeviceCategory } from "@/lib/portal/devices";
import { adminInputClass } from "@/components/admin-portal/ui";

export type DevicePresetPick = {
  label: string;
  category: DeviceCategory;
  years: number;
};

/**
 * Typeable device name with a always-complete preset list. Click the box to
 * type a custom name ("Hallway smoke 1") or pick a common starting point.
 * Picking a preset prefills category and years; further typing keeps those
 * unless another preset is chosen.
 */
export function DeviceNameSelect({
  value,
  onChange,
  required,
  placeholder = "e.g. Hallway smoke detector 1",
}: {
  value: string;
  onChange: (label: string, preset?: DevicePresetPick) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function pick(preset: DevicePresetPick) {
    onChange(preset.label, preset);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        required={required}
        maxLength={80}
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value;
          const exact = DEVICE_PRESETS.find((preset) => preset.label === next);
          onChange(next, exact);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`${adminInputClass} w-full pr-9`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40" aria-hidden>
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/15 bg-background py-1 shadow-lg shadow-black/40"
        >
          {DEVICE_PRESETS.map((preset) => {
            const selected = value === preset.label;
            return (
              <li key={preset.label} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(preset)}
                  className={`flex w-full cursor-pointer px-3 py-2 text-left text-sm ${
                    selected ? "bg-primary/20 font-semibold text-white" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {preset.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
