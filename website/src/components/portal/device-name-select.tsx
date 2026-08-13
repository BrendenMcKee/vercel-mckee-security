"use client";

import { DEVICE_PRESETS, type DeviceCategory } from "@/lib/portal/devices";
import { adminSelectClass } from "@/components/admin-portal/ui";

export type DevicePresetPick = {
  label: string;
  category: DeviceCategory;
  years: number;
};

/**
 * Closed list of tracked device types. All presets stay visible after a pick
 * (unlike a datalist). New types get added to DEVICE_PRESETS rather than
 * typed as one-off names, so the Devices tab can still filter cleanly.
 */
export function DeviceNameSelect({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (label: string, preset?: DevicePresetPick) => void;
  required?: boolean;
}) {
  const isPreset = DEVICE_PRESETS.some((preset) => preset.label === value);

  return (
    <select
      value={value}
      required={required}
      onChange={(event) => {
        const next = event.target.value;
        const preset = DEVICE_PRESETS.find((item) => item.label === next);
        onChange(next, preset);
      }}
      className={`${adminSelectClass} w-full`}
    >
      <option value="">Choose a device…</option>
      {!isPreset && value && <option value={value}>{value}</option>}
      {DEVICE_PRESETS.map((preset) => (
        <option key={preset.label} value={preset.label}>
          {preset.label}
        </option>
      ))}
    </select>
  );
}
