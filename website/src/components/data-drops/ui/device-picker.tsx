"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  DEVICE_PRESETS,
  deviceColor,
  normalizeDevice,
} from "@/lib/data-drops/devices";
import { inputClass } from "./field";

export function DevicePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [custom, setCustom] = useState("");

  const isPreset = DEVICE_PRESETS.some(
    (d) => normalizeDevice(d) === normalizeDevice(value),
  );
  const hasCustomValue = Boolean(value) && !isPreset;

  function applyCustom() {
    const next = custom.trim();
    if (next) {
      onChange(next);
      setCustom("");
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {DEVICE_PRESETS.map((device) => {
          const selected = normalizeDevice(device) === normalizeDevice(value);
          const color = deviceColor(device);
          return (
            <button
              key={device}
              type="button"
              onClick={() => onChange(selected ? "" : device)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                !selected &&
                  "border-white/15 text-white/55 hover:border-white/30 hover:text-white",
              )}
              style={
                selected
                  ? {
                      color,
                      borderColor: `${color}80`,
                      backgroundColor: `${color}26`,
                    }
                  : undefined
              }
            >
              {device}
            </button>
          );
        })}
        {hasCustomValue ? (
          <span
            className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
            style={{
              color: deviceColor(value),
              borderColor: `${deviceColor(value)}80`,
              backgroundColor: `${deviceColor(value)}26`,
            }}
          >
            {value}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applyCustom();
            }
          }}
          placeholder="Custom device..."
          className={cn(inputClass, "py-2 text-sm")}
        />
        <button
          type="button"
          onClick={applyCustom}
          className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white"
        >
          Set
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 rounded-lg px-2 py-2 text-xs text-white/40 transition-colors hover:text-white"
            title="Clear device"
          >
            None
          </button>
        ) : null}
      </div>
    </div>
  );
}
