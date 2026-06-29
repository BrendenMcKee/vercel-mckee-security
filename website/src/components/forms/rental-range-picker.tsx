"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import "react-day-picker/style.css";
import { CalendarDays, Clock3 } from "lucide-react";
import {
  formatRentalDateLong,
  isWeekdayIso,
  RENTAL_PICKUP_TIME_SLOTS,
  type RentalTimeSlot,
} from "@/lib/inquiry-dates";
import { daysBetweenInclusive } from "@/lib/starlink/dates";
import { cn } from "@/lib/utils";

type RentalRangePickerProps = {
  pickupDate: string;
  returnDate: string;
  pickupTime?: string;
  minDate: string;
  unavailableDates?: string[];
  onChange: (pickupIso: string, returnIso: string) => void;
  onTimeChange: (time: RentalTimeSlot | "") => void;
  onWeekdayRejected?: () => void;
  pickupError?: string;
  returnError?: string;
  timeError?: string;
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

export function RentalRangePicker({
  pickupDate,
  returnDate,
  pickupTime = "",
  minDate,
  unavailableDates = [],
  onChange,
  onTimeChange,
  onWeekdayRejected,
  pickupError,
  returnError,
  timeError,
}: RentalRangePickerProps) {
  const minDateObj = isoToDate(minDate);
  const pickupObj = pickupDate ? isoToDate(pickupDate) : undefined;
  const returnObj = returnDate ? isoToDate(returnDate) : undefined;

  // One month on phones, two side-by-side once there's room.
  const [months, setMonths] = useState(1);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setMonths(mq.matches ? 2 : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const bookedDates = useMemo(
    () =>
      unavailableDates
        .map(isoToDate)
        .filter((d): d is Date => Boolean(d)),
    [unavailableDates],
  );

  // The next tap is a return date only when a pickup is set but no return yet.
  // Returns may fall on weekends; the pickup itself must be a weekday, so we
  // grey out weekends whenever the next tap will choose (or restart) a pickup.
  const choosingReturn = Boolean(pickupDate) && !returnDate;

  const disabled = useMemo<Matcher[]>(() => {
    const matchers: Matcher[] = [];
    if (minDateObj) matchers.push({ before: minDateObj });
    if (!choosingReturn) matchers.push({ dayOfWeek: [0, 6] });
    if (bookedDates.length) matchers.push(...bookedDates);
    return matchers;
  }, [minDateObj, bookedDates, choosingReturn]);

  const selected: DateRange | undefined = pickupObj
    ? { from: pickupObj, to: returnObj }
    : undefined;

  const nights =
    pickupDate && returnDate && returnDate >= pickupDate
      ? daysBetweenInclusive(pickupDate, returnDate)
      : 0;

  const handleSelect = (next: DateRange | undefined) => {
    if (!next || !next.from) {
      onChange("", "");
      return;
    }
    const fromIso = dateToIso(next.from);
    // Pickup must be a weekday; returns and mid-range days can be any day.
    // Keep any existing selection rather than wiping it on an invalid tap.
    if (!isWeekdayIso(fromIso)) {
      onWeekdayRejected?.();
      return;
    }
    const toIso = next.to ? dateToIso(next.to) : "";
    onChange(fromIso, toIso);
  };

  let guidance: React.ReactNode;
  if (!pickupDate) {
    guidance = (
      <>
        Tap your <strong>pickup date</strong> to begin. Pickup is Monday to Friday.
      </>
    );
  } else if (!returnDate) {
    guidance = (
      <>
        Pickup selected. Now tap your <strong>return date</strong>.
      </>
    );
  } else {
    guidance = (
      <>
        <strong>
          {nights} day{nights === 1 ? "" : "s"}
        </strong>{" "}
        selected. Tap any date to start over.
      </>
    );
  }

  return (
    <div className="rental-range">
      <div className="rental-range__head">
        <p className="rental-range__title">
          <CalendarDays size={18} strokeWidth={1.75} aria-hidden="true" />
          Choose your rental dates
        </p>
        <div className="rental-range__chips" role="status" aria-live="polite">
          <span className={cn("rental-range__chip", pickupDate && "is-set")}>
            <span className="rental-range__chip-label">Pickup</span>
            <span className="rental-range__chip-value">
              {pickupDate ? formatRentalDateLong(pickupDate) : "Select a date"}
            </span>
          </span>
          <span className="rental-range__chip-arrow" aria-hidden="true">
            &rarr;
          </span>
          <span className={cn("rental-range__chip", returnDate && "is-set")}>
            <span className="rental-range__chip-label">Return</span>
            <span className="rental-range__chip-value">
              {returnDate ? formatRentalDateLong(returnDate) : "Select a date"}
            </span>
          </span>
        </div>
        <p className="rental-range__guidance">{guidance}</p>
      </div>

      <div className="rental-range__calendar">
        <DayPicker
          className="rental-daypicker rental-daypicker--inline"
          mode="range"
          numberOfMonths={months}
          selected={selected}
          onSelect={handleSelect}
          disabled={disabled}
          excludeDisabled
          resetOnSelect
          startMonth={minDateObj}
          defaultMonth={pickupObj ?? minDateObj}
          modifiers={{ booked: bookedDates }}
          modifiersClassNames={{ booked: "rdp-booked" }}
          showOutsideDays
        />
        <div className="rental-date-picker__legend">
          <span className="rental-date-picker__legend-item">
            <span
              className="rental-date-picker__legend-dot rental-date-picker__legend-dot--range"
              aria-hidden="true"
            />
            Your rental
          </span>
          <span className="rental-date-picker__legend-item">
            <span
              className="rental-date-picker__legend-dot rental-date-picker__legend-dot--booked"
              aria-hidden="true"
            />
            Booked: no kits available
          </span>
        </div>
      </div>

      {pickupError || returnError ? (
        <p className="mckee-form-error">{pickupError ?? returnError}</p>
      ) : null}

      <div className="rental-time-section">
        <p className="rental-time-heading">
          <Clock3 size={16} strokeWidth={1.75} aria-hidden="true" />
          Approximate pickup time{" "}
          <span className="mckee-form-required">(required)</span>
        </p>
        <div className="rental-time-slots" role="group" aria-label="Pickup time">
          {RENTAL_PICKUP_TIME_SLOTS.map((slot) => {
            const isSelected = pickupTime === slot;
            return (
              <button
                key={slot}
                type="button"
                className={cn("rental-time-slot", isSelected && "is-selected")}
                aria-pressed={isSelected}
                onClick={() => onTimeChange(slot)}
              >
                {slot}
              </button>
            );
          })}
        </div>
        {timeError ? <p className="mckee-form-error">{timeError}</p> : null}
        <p className="rental-time-note rental-time-note--center">
          Pickup is Monday to Friday at our Haliburton office. Return any day,
          including weekends.
        </p>
      </div>
    </div>
  );
}
