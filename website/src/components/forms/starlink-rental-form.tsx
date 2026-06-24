"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RentalSchedulePicker } from "@/components/forms/rental-schedule-picker";
import { getFormEmailMeta } from "@/lib/form-email-meta";
import {
  isWeekdayIso,
  RENTAL_PICKUP_TIME_SLOTS,
  todayIso,
  type RentalTimeSlot,
} from "@/lib/inquiry-dates";
import { trackWebsiteLeadForm } from "@/lib/google-ads";
import { cn } from "@/lib/utils";

const pickupTimeSchema = z.enum(RENTAL_PICKUP_TIME_SLOTS);

const schema = z
  .object({
    name: z.string().min(2, "Please enter your name"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().min(7, "Please enter your phone number"),
    address: z.string().min(5, "Please enter your address"),
    pickupDate: z.string().min(1, "Please choose a pickup date"),
    pickupTime: pickupTimeSchema.optional(),
    returnDate: z.string().min(1, "Please choose a return date"),
    usageLocation: z
      .string()
      .min(3, "Tell us where you plan to use the kit (cottage, campsite, etc.)"),
    comments: z.string().optional(),
  })
  .refine((data) => isWeekdayIso(data.pickupDate), {
    message: "Pickup must be a weekday (Monday to Friday)",
    path: ["pickupDate"],
  })
  .refine((data) => data.returnDate >= data.pickupDate, {
    message: "Return date must be on or after pickup date",
    path: ["returnDate"],
  });

type FormData = z.infer<typeof schema>;

type StarlinkRentalFormProps = {
  className?: string;
  compact?: boolean;
  showHeader?: boolean;
};

export function StarlinkRentalForm({
  className,
  compact = false,
  showHeader = true,
}: StarlinkRentalFormProps) {
  const inquiryMeta = getFormEmailMeta("inquiry", "starlink-rental");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      pickupDate: "",
      pickupTime: undefined,
      returnDate: "",
    },
  });

  const pickupDate = watch("pickupDate");
  const returnMin =
    pickupDate && pickupDate >= todayIso() ? pickupDate : todayIso();

  const onSubmit = async (data: FormData) => {
    setStatus("idle");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          serviceSlug: "starlink-rental",
          services: "Starlink Gen2 Rental (Roam Max included)",
        }),
      });
      if (!res.ok) throw new Error("failed");
      trackWebsiteLeadForm();
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        "mckee-elementor-form",
        compact && "mckee-elementor-form--compact",
        className,
      )}
    >
      {showHeader && (
        <div className="mb-4 flex items-start gap-3 border-b border-white/8 pb-4">
          <div className="mckee-form-icon" aria-hidden="true">
            {inquiryMeta.emoji}
          </div>
          <div>
            <p className="mckee-form-heading">Starlink rental request</p>
            <p className="mckee-form-subheading">{inquiryMeta.inboxLabel}</p>
          </div>
        </div>
      )}

      <div
        className={
          compact ? "mckee-elementor-form-fields mckee-form-fields" : "mckee-form-fields"
        }
      >
        <div className="mckee-form-field">
          <label className="mckee-form-label">
            Name <span className="mckee-form-required">(required)</span>
          </label>
          <input type="text" {...register("name")} className="mckee-form-input" />
          {errors.name && <p className="mckee-form-error">{errors.name.message}</p>}
        </div>

        <div className="mckee-form-field">
          <label className="mckee-form-label">
            Email <span className="mckee-form-required">(required)</span>
          </label>
          <input type="email" {...register("email")} className="mckee-form-input" />
          {errors.email && <p className="mckee-form-error">{errors.email.message}</p>}
        </div>

        <div className="mckee-form-field">
          <label className="mckee-form-label">
            Phone <span className="mckee-form-required">(required)</span>
          </label>
          <input type="tel" {...register("phone")} className="mckee-form-input" />
          {errors.phone && <p className="mckee-form-error">{errors.phone.message}</p>}
        </div>

        <div className="mckee-form-field">
          <label className="mckee-form-label">
            Your address <span className="mckee-form-required">(required)</span>
          </label>
          <input type="text" {...register("address")} className="mckee-form-input" />
          {errors.address && <p className="mckee-form-error">{errors.address.message}</p>}
        </div>

        <div className="rental-schedule-stack">
          <Controller
            name="pickupDate"
            control={control}
            render={({ field: dateField }) => (
              <Controller
                name="pickupTime"
                control={control}
                render={({ field: timeField }) => (
                  <RentalSchedulePicker
                    variant="pickup"
                    dateValue={dateField.value ?? ""}
                    timeValue={timeField.value ?? ""}
                    minDate={todayIso()}
                    onDateChange={dateField.onChange}
                    onTimeChange={(time) =>
                      timeField.onChange(time === "" ? undefined : time)
                    }
                    onWeekdayRejected={() =>
                      setError("pickupDate", {
                        message: "Pickup must be a weekday (Monday to Friday)",
                      })
                    }
                    dateError={errors.pickupDate?.message}
                  />
                )}
              />
            )}
          />

          <Controller
            name="returnDate"
            control={control}
            render={({ field: dateField }) => (
              <RentalSchedulePicker
                variant="return"
                dateValue={dateField.value ?? ""}
                minDate={returnMin}
                onDateChange={dateField.onChange}
                dateError={errors.returnDate?.message}
              />
            )}
          />
        </div>

        <p className="mckee-form-note">
          Dates are a request only. We will confirm availability before anything is
          booked. Pickup is Mon to Fri at our Haliburton office. Return can be anytime.
        </p>

        <div className="mckee-form-field">
          <label className="mckee-form-label">
            Where will you use the kit?{" "}
            <span className="mckee-form-required">(required)</span>
          </label>
          <textarea
            {...register("usageLocation")}
            rows={compact ? 2 : 3}
            placeholder="Cottage address, campground, trailer location, etc."
            className="mckee-form-input"
          />
          {errors.usageLocation && (
            <p className="mckee-form-error">{errors.usageLocation.message}</p>
          )}
        </div>

        <div className="mckee-form-field">
          <label className="mckee-form-label">Additional comments</label>
          <textarea
            {...register("comments")}
            rows={compact ? 2 : 3}
            className="mckee-form-input"
          />
        </div>
      </div>

      {status === "success" && (
        <p className="mckee-form-status mckee-form-status--success">
          Thank you. We will review your dates and reply with availability and pricing.
        </p>
      )}
      {status === "error" && (
        <p className="mckee-form-status mckee-form-status--error">
          Something went wrong. Please call us at (705) 457-2156.
        </p>
      )}

      <div
        className={
          compact
            ? "mckee-elementor-form-actions mckee-form-actions"
            : "mckee-form-actions mt-6 flex justify-center"
        }
      >
        <button
          type="submit"
          disabled={isSubmitting}
          className={
            compact
              ? "mckee-elementor-form-submit mckee-form-submit"
              : "mckee-form-submit min-w-[220px]"
          }
        >
          {isSubmitting ? "Sending..." : "Check Availability"}
        </button>
      </div>
    </form>
  );
}
