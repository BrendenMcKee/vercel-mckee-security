"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A dropdown that can actually say something about each choice. A native
 * `<select>` renders its list with the operating system, which ignores colour,
 * icons and per-option notes, so picking a Starlink that is already booked
 * looked exactly like picking a free one. This is the same control with the
 * list drawn by us: a tone per option, an icon or colour dot, and a second line
 * of detail.
 *
 * Focus stays on the trigger and the active option is tracked with
 * `aria-activedescendant`, which is the pattern screen readers expect from a
 * collapsed combobox and avoids trapping focus inside the modal.
 */

export type OptionTone = "neutral" | "amber" | "blue" | "green" | "slate" | "red";

const TONE_TEXT: Record<OptionTone, string> = {
  neutral: "text-white/80",
  amber: "text-amber-300",
  blue: "text-blue-300",
  green: "text-emerald-300",
  slate: "text-slate-300",
  red: "text-red-300",
};

const TONE_HINT: Record<OptionTone, string> = {
  neutral: "text-white/35",
  amber: "text-amber-200/70",
  blue: "text-blue-200/70",
  green: "text-emerald-200/75",
  slate: "text-slate-300/60",
  red: "text-red-200/80",
};

export type SelectOption = {
  value: string;
  label: string;
  /** Second line: why this choice is what it is ("Booked · Michael Peake"). */
  hint?: string;
  tone?: OptionTone;
  icon?: LucideIcon;
  /** Colour dot before the label, for units that carry their own colour. */
  dotColor?: string | null;
};

export function OptionSelect({
  value,
  options,
  onChange,
  label,
  className,
  style,
}: {
  value: string;
  options: SelectOption[];
  /** Return false to reject the choice (used to confirm a double booking). */
  onChange: (value: string) => boolean | void;
  /** Accessible name, since the visible label sits outside this component. */
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  function openList() {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function commit(index: number) {
    const option = options[index];
    if (!option) return;
    if (onChange(option.value) === false) return;
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      if (!open) return;
      // The modal closes on Escape from a document listener, so swallow this
      // one: the first press should only shut the dropdown.
      event.stopPropagation();
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return openList();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + step + options.length) % options.length);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      if (!open) return;
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) return openList();
      commit(activeIndex);
    }
  }

  const SelectedIcon = selected?.icon;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${baseId}-list`}
        aria-activedescendant={open ? `${baseId}-opt-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-left text-sm text-white outline-none transition-colors hover:border-white/25 focus:border-primary",
          className,
        )}
        style={style}
      >
        {selected?.dotColor ? (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: selected.dotColor }}
            aria-hidden="true"
          />
        ) : null}
        {SelectedIcon ? <SelectedIcon className="h-4 w-4 shrink-0" /> : null}
        <span className="min-w-0 flex-1 truncate">
          {selected?.label ?? "Select..."}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 opacity-60 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={`${baseId}-list`}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-white/15 bg-surface p-1 shadow-2xl shadow-black/60"
        >
          {options.map((option, index) => {
            const tone = option.tone ?? "neutral";
            const OptionIcon = option.icon;
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${baseId}-opt-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                onClick={() => commit(index)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                  index === activeIndex ? "bg-white/10" : "hover:bg-white/5",
                )}
              >
                {option.dotColor ? (
                  <span
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: option.dotColor }}
                    aria-hidden="true"
                  />
                ) : null}
                {OptionIcon ? (
                  <OptionIcon
                    className={cn("mt-0.5 h-4 w-4 shrink-0", TONE_TEXT[tone])}
                  />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn("block font-semibold", TONE_TEXT[tone])}
                  >
                    {option.label}
                  </span>
                  {option.hint ? (
                    <span className={cn("block text-xs", TONE_HINT[tone])}>
                      {option.hint}
                    </span>
                  ) : null}
                </span>
                {isSelected ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-white/60" />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
