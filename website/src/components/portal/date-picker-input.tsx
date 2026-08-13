"use client";

import { useRef } from "react";

/**
 * Date field that always opens the calendar on click/focus. Native date
 * inputs otherwise let the user click year/month/day and type, which is
 * easy to fat-finger; McKee staff pick a date from the picker instead.
 */
export function DatePickerInput({
  value,
  onChange,
  className,
  required,
  max,
  min,
  id,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  max?: string;
  min?: string;
  id?: string;
  name?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function openPicker() {
    const el = ref.current;
    if (!el || typeof el.showPicker !== "function") return;
    try {
      el.showPicker();
    } catch {
      // showPicker throws if the input is disabled or the call is not
      // treated as a user gesture; the native control still works.
    }
  }

  return (
    <input
      ref={ref}
      id={id}
      name={name}
      type="date"
      required={required}
      max={max}
      min={min}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onClick={openPicker}
      onFocus={openPicker}
      onKeyDown={(event) => {
        if (event.key === "Tab" || event.key === "Escape") return;
        event.preventDefault();
        if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
          openPicker();
        }
      }}
      className={className}
    />
  );
}
