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

// Kept above 4.5:1 on the surface colour: the hint is the whole point of this
// control, so it has to survive a phone screen in daylight.
const TONE_HINT: Record<OptionTone, string> = {
  neutral: "text-white/55",
  amber: "text-amber-200/75",
  blue: "text-blue-200/75",
  green: "text-emerald-200/75",
  slate: "text-slate-300/80",
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Only a keyboard move should scroll the list. Doing it on hover shifts the
  // rows out from under the pointer mid-click.
  const scrollOnNextMove = useRef(false);
  const typedRef = useRef({ text: "", at: 0 });
  const baseId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const safeActiveIndex = Math.min(activeIndex, Math.max(options.length - 1, 0));

  function openList() {
    scrollOnNextMove.current = true;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function moveTo(index: number) {
    scrollOnNextMove.current = true;
    setActiveIndex(index);
  }

  function commit(index: number) {
    const option = options[index];
    if (!option) return;
    if (onChange(option.value) === false) return;
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    // pointerdown, not mousedown: iOS Safari only synthesises mouse events for
    // elements it considers interactive, so a tap on a heading or a label would
    // otherwise leave the list open.
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !scrollOnNextMove.current) return;
    scrollOnNextMove.current = false;
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-index="${safeActiveIndex}"]`);
    if (!list || !row) return;
    // Scrolled by hand rather than with scrollIntoView, which walks every
    // scrollable ancestor and can drag the whole modal along with it.
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [open, safeActiveIndex]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (options.length === 0) return;

    if (event.key === "Escape") {
      if (!open) return;
      // Claim this press so the modal's own Escape handler stands down: the
      // first press should shut the list, not discard the form.
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
      moveTo((safeActiveIndex + step + options.length) % options.length);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!open) openList();
      moveTo(event.key === "Home" ? 0 : options.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) return openList();
      commit(safeActiveIndex);
      return;
    }
    // Type-ahead, which the native select gave for free: typing "c" jumps to
    // Confirmed, and typing quickly matches the whole string.
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = Date.now();
      const typed = typedRef.current;
      typed.text = now - typed.at > 800 ? event.key : typed.text + event.key;
      typed.at = now;
      const query = typed.text.toLowerCase();
      const from = typed.text.length === 1 ? safeActiveIndex + 1 : safeActiveIndex;
      for (let step = 0; step < options.length; step += 1) {
        const index = (from + step) % options.length;
        if (options[index].label.toLowerCase().startsWith(query)) {
          if (!open) setOpen(true);
          moveTo(index);
          return;
        }
      }
    }
  }

  const SelectedIcon = selected?.icon;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? `${baseId}-list` : undefined}
        aria-activedescendant={open ? `${baseId}-opt-${safeActiveIndex}` : undefined}
        onClick={() => {
          // Safari does not focus a button on click, and every key handler here
          // lives on the trigger, so take focus explicitly.
          triggerRef.current?.focus();
          if (open) setOpen(false);
          else openList();
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-left text-base text-white outline-none transition-colors hover:border-white/25 focus:border-primary sm:min-h-0 sm:py-2 sm:text-sm",
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
        {SelectedIcon ? (
          <SelectedIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : null}
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
          // Clicking an option must not blur the trigger, or the keyboard stops
          // working for the rest of the session.
          onPointerDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-72 overflow-y-auto overscroll-contain rounded-lg border border-white/15 bg-surface p-1 shadow-2xl shadow-black/60"
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
                  "flex min-h-11 cursor-pointer items-start gap-2 rounded-md px-2.5 py-2.5 text-sm transition-colors",
                  index === safeActiveIndex ? "bg-white/10" : "hover:bg-white/5",
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
                    aria-hidden="true"
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
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-white/60"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
