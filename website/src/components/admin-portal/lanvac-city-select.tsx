"use client";

import { adminSelectClass } from "@/components/admin-portal/ui";
import { lanvacCitySelectOptions } from "@/lib/portal/lanvac-cities";

export function LanvacCitySelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (city: string) => void;
  id?: string;
}) {
  const { preferred, other, extra } = lanvacCitySelectOptions(value);

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={adminSelectClass}
    >
      <option value="">Not set</option>
      {extra && <option value={extra}>{extra} (on this account)</option>}
      <optgroup label="Use for new accounts">
        {preferred.map((city) => (
          <option key={`p-${city}`} value={city}>
            {city}
          </option>
        ))}
      </optgroup>
      <optgroup label="Exact spellings already on file">
        {other.map((city) => (
          <option key={`o-${city}`} value={city}>
            {city}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
