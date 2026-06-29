"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker, type Matcher } from "react-day-picker";
import "react-day-picker/style.css";
import { CalendarDays, Clock3 } from "lucide-react";
import {
  formatRentalDateLong,
  isWeekdayIso,
  RENTAL_PICKUP_TIME_SLOTS,
  type RentalTimeSlot,
} from "@/lib/inquiry-dates";
import { cn } from "@/lib/utils";

type RentalSchedulePickerProps = {
  variant: "pickup" | "return";
  dateValue: string;
  timeValue?: string;
  minDate: string;
  unavailableDates?: string[];
  onDateChange: (isoDate: string) => void;
  onTimeChange?: (time: RentalTimeSlot | "") => void;
  onWeekdayRejected?: () => void;
  dateError?: string;
};

function isoToDate(iso: string): Date | undefined {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function RentalSchedulePicker({
  variant,
  dateValue,
  timeValue = "",
  minDate,
  unavailableDates = [],
  onDateChange,
  onTimeChange,
  onWeekdayRejected,
  dateError,
}: RentalSchedulePickerProps) {
  const isPickup = variant === "pickup";
  const longDate = formatRentalDateLong(dateValue);
  const title = isPickup ? "Pickup" : "Return";

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = dateValue ? isoToDate(dateValue) : undefined;
  const minDateObj = isoToDate(minDate);

  const bookedDates = useMemo(
    () =>
      unavailableDates
        .map(isoToDate)
        .filter((d): d is Date => Boolean(d)),
    [unavailableDates],
  );

  const disabledMatchers = useMemo<Matcher[]>(() => {
    const matchers: Matcher[] = [];
    if (minDateObj) matchers.push({ before: minDateObj });
    if (isPickup) matchers.push({ dayOfWeek: [0, 6] });
    if (bookedDates.length) matchers.push(...bookedDates);
    return matchers;
  }, [minDateObj, isPickup, bookedDates]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = dateToIso(date);
    if (isPickup && !isWeekdayIso(iso)) {
      onWeekdayRejected?.();
      return;
    }
    onDateChange(iso);
    setOpen(false);
  };

  return (
    <div className="rental-schedule-block">
      <p className="rental-schedule-title">{title}</p>

      <div
        ref={containerRef}
        className={cn("rental-date-picker", dateValue && "has-value")}
      >
        <button
          type="button"
          className="rental-date-picker__face"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={
            longDate
              ? `${title} date: ${longDate}. Tap to change.`
              : `${title} date. Tap to open calendar.`
          }
        >
          <span className="rental-date-picker__icon" aria-hidden="true">
            <CalendarDays size={22} strokeWidth={1.75} />
          </span>
          <span className="rental-date-picker__text">
            {longDate ? (
              <>
                <span className="rental-date-picker__label">Selected date</span>
                <span className="rental-date-picker__value">{longDate}</span>
              </>
            ) : (
              <>
                <span className="rental-date-picker__label">Choose a date</span>
                <span className="rental-date-picker__value rental-date-picker__value--placeholder">
                  Tap to open calendar
                </span>
              </>
            )}
          </span>
        </button>

        {open ? (
          <div className="rental-date-picker__pop" role="dialog" aria-label={`${title} date calendar`}>
            <DayPicker
              className="rental-daypicker"
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected ?? minDateObj}
              startMonth={minDateObj}
              disabled={disabledMatchers}
              modifiers={{ booked: bookedDates }}
              modifiersClassNames={{ booked: "rdp-booked" }}
              showOutsideDays
            />
            <p className="rental-date-picker__legend">
              {isPickup ? "Pickup is Mon to Fri. " : ""}
              Crossed-out dates are unavailable.
            </p>
          </div>
        ) : null}
      </div>
      {dateError && <p className="mckee-form-error">{dateError}</p>}

      {isPickup ? (
        <div className="rental-time-section">
          <p className="rental-time-heading">
            <Clock3 size={16} strokeWidth={1.75} aria-hidden="true" />
            Approximate pickup time <span className="rental-time-optional">(optional)</span>
          </p>
          <div className="rental-time-slots" role="group" aria-label="Pickup time">
            {RENTAL_PICKUP_TIME_SLOTS.map((slot) => {
              const isSelected = timeValue === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  className={cn("rental-time-slot", isSelected && "is-selected")}
                  aria-pressed={isSelected}
                  onClick={() => onTimeChange?.(isSelected ? "" : slot)}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          <p className="rental-time-note">
            Monday to Friday · Haliburton office hours · tap again to clear
          </p>
        </div>
      ) : (
        <p className="rental-time-note rental-time-note--return">
          Drop off anytime, including weekends. Leave the kit in the garage or on the
          front porch if no one is home.
        </p>
      )}
    </div>
  );
}
