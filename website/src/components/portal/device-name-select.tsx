"use client";

import { DEVICE_PRESETS, type DeviceCategory } from "@/lib/portal/devices";
import { adminInputClass, adminSelectClass } from "@/components/admin-portal/ui";

const CUSTOM = "__custom";

export type DevicePresetPick = {
  label: string;
  category: DeviceCategory;
  years: number;
};

/**
 * Real select of common devices (plus Custom name), so picking one never
 * hides the rest of the list the way a datalist does after a match.
 */
export function DeviceNameSelect({
  value,
  onChange,
  required,
  placeholder = "e.g. 7Ah Security System Battery",
}: {
  value: string;
  onChange: (label: string, preset?: DevicePresetPick) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const isPreset = DEVICE_PRESETS.some((preset) => preset.label === value);
  const selectValue = !value ? "" : isPreset ? value : CUSTOM;

  return (
    <div className="space-y-2">
      <select
        value={selectValue}
        required={required && !value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "" || next === CUSTOM) {
            onChange(next === CUSTOM ? value : "");
            return;
          }
          const preset = DEVICE_PRESETS.find((item) => item.label === next);
          onChange(next, preset);
        }}
        className={`${adminSelectClass} w-full`}
      >
        <option value="">Choose a device…</option>
        {DEVICE_PRESETS.map((preset) => (
          <option key={preset.label} value={preset.label}>
            {preset.label}
          </option>
        ))}
        <option value={CUSTOM}>Custom name…</option>
      </select>
      {selectValue === CUSTOM && (
        <input
          required={required}
          maxLength={80}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${adminInputClass} w-full`}
        />
      )}
    </div>
  );
}
