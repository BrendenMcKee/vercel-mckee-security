"use client";

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
  onDateChange: (isoDate: string) => void;
  onTimeChange?: (time: RentalTimeSlot) => void;
  onWeekdayRejected?: () => void;
  dateError?: string;
  timeError?: string;
};

export function RentalSchedulePicker({
  variant,
  dateValue,
  timeValue = "",
  minDate,
  onDateChange,
  onTimeChange,
  onWeekdayRejected,
  dateError,
  timeError,
}: RentalSchedulePickerProps) {
  const isPickup = variant === "pickup";
  const longDate = formatRentalDateLong(dateValue);
  const title = isPickup ? "Pickup" : "Return";

  const handleDateChange = (isoDate: string) => {
    if (isPickup && isoDate && !isWeekdayIso(isoDate)) {
      onWeekdayRejected?.();
      return;
    }
    onDateChange(isoDate);
  };

  return (
    <div className="rental-schedule-block">
      <p className="rental-schedule-title">{title}</p>

      <label className={cn("rental-date-picker", dateValue && "has-value")}>
        <input
          type="date"
          className="rental-date-picker__input"
          min={minDate}
          value={dateValue}
          onChange={(event) => handleDateChange(event.target.value)}
          aria-label={`${title} date`}
        />
        <span className="rental-date-picker__face">
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
        </span>
      </label>
      {dateError && <p className="mckee-form-error">{dateError}</p>}

      {isPickup ? (
        <div className="rental-time-section">
          <p className="rental-time-heading">
            <Clock3 size={16} strokeWidth={1.75} aria-hidden="true" />
            Approximate pickup time
          </p>
          <div className="rental-time-slots" role="group" aria-label="Pickup time">
            {RENTAL_PICKUP_TIME_SLOTS.map((slot) => {
              const selected = timeValue === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  className={cn("rental-time-slot", selected && "is-selected")}
                  aria-pressed={selected}
                  onClick={() => onTimeChange?.(slot)}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          <p className="rental-time-note">Monday to Friday · Haliburton office hours</p>
        </div>
      ) : (
        <p className="rental-time-note rental-time-note--return">
          Drop off anytime, including weekends. Leave the kit in the garage or on the
          front porch if no one is home.
        </p>
      )}
      {timeError && <p className="mckee-form-error">{timeError}</p>}
    </div>
  );
}
