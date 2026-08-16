"use client";

import { adminSelectClass } from "@/components/admin-portal/ui";
import { lanvacCitySelectOptions } from "@/lib/portal/lanvac-cities";

export function LanvacCitySelect({
  value,
  onChange,
  id,
  required,
}: {
  value: string;
  onChange: (city: string) => void;
  id?: string;
  required?: boolean;
}) {
  const { frequent, other, extra } = lanvacCitySelectOptions(value);

  return (
    <select
      id={id}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={adminSelectClass}
    >
      <option value="">{required ? "Select a city…" : "Not set"}</option>
      {extra && <option value={extra}>{extra} (on this account, not a Lanvac city)</option>}
      <optgroup label="Most used (McKee accounts)">
        {frequent.map((city) => (
          <option key={`f-${city}`} value={city}>
            {city}
          </option>
        ))}
      </optgroup>
      <optgroup label="Other Ontario cities">
        {other.map((city) => (
          <option key={`o-${city}`} value={city}>
            {city}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
