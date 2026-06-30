"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RentalRangePicker } from "@/components/forms/rental-range-picker";
import { getFormEmailMeta } from "@/lib/form-email-meta";
import {
  isWeekdayIso,
  RENTAL_PICKUP_TIME_SLOTS,
  todayIso,
} from "@/lib/inquiry-dates";
import { addDaysIso } from "@/lib/starlink/dates";
import { trackWebsiteLeadForm } from "@/lib/google-ads";
import { useAutofillSync } from "@/lib/use-autofill-sync";
import { cn } from "@/lib/utils";

const pickupTimeSchema = z.enum(RENTAL_PICKUP_TIME_SLOTS);

const schema = z
  .object({
    firstName: z.string().min(1, "Please enter your first name"),
    lastName: z.string().min(1, "Please enter your last name"),
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
    company: z.string().optional(),
  })
  .refine((data) => isWeekdayIso(data.pickupDate), {
    message: "Pickup must be a weekday (Monday to Friday)",
    path: ["pickupDate"],
  })
  .refine((data) => data.returnDate >= data.pickupDate, {
    message: "Return date must be on or after pickup date",
    path: ["returnDate"],
  })
  .refine((data) => Boolean(data.pickupTime), {
    message: "Please select an approximate pickup time",
    path: ["pickupTime"],
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
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const start = todayIso();
    const end = addDaysIso(start, 365);
    fetch(`/api/starlink/availability?start=${start}&end=${end}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.fullyBookedDates)) {
          setUnavailableDates(data.fullyBookedDates);
        }
      })
      .catch(() => {
        // Availability is advisory; ignore failures.
      });
    return () => controller.abort();
  }, []);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
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

  const { formRef, onAnimationStart } = useAutofillSync<FormData>(setValue);

  const pickupDate = watch("pickupDate");
  const returnDate = watch("returnDate");
  const pickupTime = watch("pickupTime");

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
      ref={formRef}
      onSubmit={handleSubmit(onSubmit)}
      onAnimationStart={onAnimationStart}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="mckee-form-field">
            <label className="mckee-form-label">
              First name <span className="mckee-form-required">(required)</span>
            </label>
            <input
              type="text"
              autoComplete="given-name"
              {...register("firstName")}
              className="mckee-form-input"
            />
            {errors.firstName && (
              <p className="mckee-form-error">{errors.firstName.message}</p>
            )}
          </div>

          <div className="mckee-form-field">
            <label className="mckee-form-label">
              Last name <span className="mckee-form-required">(required)</span>
            </label>
            <input
              type="text"
              autoComplete="family-name"
              {...register("lastName")}
              className="mckee-form-input"
            />
            {errors.lastName && (
              <p className="mckee-form-error">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="mckee-form-field">
          <label className="mckee-form-label">
            Email <span className="mckee-form-required">(required)</span>
          </label>
          <input
            type="email"
            autoComplete="email"
            {...register("email")}
            className="mckee-form-input"
          />
          {errors.email && <p className="mckee-form-error">{errors.email.message}</p>}
        </div>

        <div className="mckee-form-field">
          <label className="mckee-form-label">
            Phone <span className="mckee-form-required">(required)</span>
          </label>
          <input
            type="tel"
            autoComplete="tel"
            {...register("phone")}
            className="mckee-form-input"
          />
          {errors.phone && <p className="mckee-form-error">{errors.phone.message}</p>}
        </div>

        <div className="mckee-form-field">
          <label className="mckee-form-label">
            Your address <span className="mckee-form-required">(required)</span>
          </label>
          <input
            type="text"
            autoComplete="street-address"
            {...register("address")}
            className="mckee-form-input"
          />
          {errors.address && <p className="mckee-form-error">{errors.address.message}</p>}
        </div>

        <RentalRangePicker
          pickupDate={pickupDate ?? ""}
          returnDate={returnDate ?? ""}
          pickupTime={pickupTime ?? ""}
          minDate={todayIso()}
          unavailableDates={unavailableDates}
          onChange={(pickup, ret) => {
            clearErrors(["pickupDate", "returnDate"]);
            setValue("pickupDate", pickup, { shouldValidate: pickup !== "" });
            setValue("returnDate", ret, { shouldValidate: ret !== "" });
          }}
          onTimeChange={(time) =>
            setValue("pickupTime", time === "" ? undefined : time, {
              shouldValidate: true,
            })
          }
          onWeekdayRejected={() =>
            setError("pickupDate", {
              message: "Pickup must be a weekday (Monday to Friday)",
            })
          }
          pickupError={errors.pickupDate?.message}
          returnError={errors.returnDate?.message}
          timeError={errors.pickupTime?.message}
        />

        <p className="mckee-form-note text-center">
          Fully booked dates are greyed out on the calendar above. Your dates are a
          request only. We will reply with pricing and confirm before anything is
          booked. Pickup is Monday to Friday at our Haliburton office. Return can be
          any day.
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

        <div className="mckee-form-honeypot" aria-hidden="true">
          <label htmlFor="rental-company">Company</label>
          <input
            id="rental-company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register("company")}
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
          {isSubmitting ? "Sending..." : "Send Inquiry"}
        </button>
      </div>
    </form>
  );
}
