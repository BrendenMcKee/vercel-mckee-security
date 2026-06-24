"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import {
  formatRentalDateLong,
  RENTAL_TIME_SLOTS,
  type RentalTimeSlot,
} from "@/lib/inquiry-dates";
import { cn } from "@/lib/utils";

type RentalSchedulePickerProps = {
  title: string;
  dateValue: string;
  timeValue: string;
  minDate: string;
  onDateChange: (isoDate: string) => void;
  onTimeChange: (time: RentalTimeSlot) => void;
  dateError?: string;
  timeError?: string;
};

export function RentalSchedulePicker({
  title,
  dateValue,
  timeValue,
  minDate,
  onDateChange,
  onTimeChange,
  dateError,
  timeError,
}: RentalSchedulePickerProps) {
  const longDate = formatRentalDateLong(dateValue);

  return (
    <div className="rental-schedule-block">
      <p className="rental-schedule-title">{title}</p>

      <label className={cn("rental-date-picker", dateValue && "has-value")}>
        <input
          type="date"
          className="rental-date-picker__input"
          min={minDate}
          value={dateValue}
          onChange={(event) => onDateChange(event.target.value)}
          aria-label={`${title} date`}
        />
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
      </label>
      {dateError && <p className="mckee-form-error">{dateError}</p>}

      <div className="rental-time-section">
        <p className="rental-time-heading">
          <Clock3 size={16} strokeWidth={1.75} aria-hidden="true" />
          Approximate time
        </p>
        <div className="rental-time-slots" role="group" aria-label={`${title} time`}>
          {RENTAL_TIME_SLOTS.map((slot) => {
            const selected = timeValue === slot;
            return (
              <button
                key={slot}
                type="button"
                className={cn("rental-time-slot", selected && "is-selected")}
                aria-pressed={selected}
                onClick={() => onTimeChange(slot)}
              >
                {slot}
              </button>
            );
          })}
        </div>
        <p className="rental-time-note">Mon to Fri · Haliburton office hours</p>
      </div>
      {timeError && <p className="mckee-form-error">{timeError}</p>}
    </div>
  );
}
