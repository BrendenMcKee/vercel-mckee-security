"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getFormEmailMeta, getServiceDisplayName } from "@/lib/form-email-meta";
import { trackGoogleAdsConversion } from "@/lib/google-ads";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(7, "Please enter your phone number"),
  address: z.string().min(5, "Please enter your address"),
  services: z.string().min(3, "Please tell us what you need"),
  comments: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type ServiceQuoteFormProps = {
  serviceLabel?: string;
  serviceSlug?: string;
  className?: string;
  compact?: boolean;
  showHeader?: boolean;
};

const defaultLabel =
  "Which custom service/s are you inquiring about? Or would you like to request a scheduled site visit for a completely custom quote?";

export function ServiceQuoteForm({
  serviceLabel = defaultLabel,
  serviceSlug,
  className,
  compact = false,
  showHeader = true,
}: ServiceQuoteFormProps) {
  const inquiryMeta = getFormEmailMeta("inquiry", serviceSlug);
  const serviceName = getServiceDisplayName(serviceSlug);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setStatus("idle");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, serviceLabel, serviceSlug }),
      });
      if (!res.ok) throw new Error("failed");
      trackGoogleAdsConversion("quote");
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  };

  const fields = (
    <>
      <div className="mckee-form-field">
        <label className="mckee-form-label">
          Enter your first &amp; last name{" "}
          <span className="mckee-form-required">(required)</span>
        </label>
        <input type="text" {...register("name")} className="mckee-form-input" />
        {errors.name && <p className="mckee-form-error">{errors.name.message}</p>}
      </div>
      <div className="mckee-form-field">
        <label className="mckee-form-label">
          Enter your email <span className="mckee-form-required">(required)</span>
        </label>
        <input type="email" {...register("email")} className="mckee-form-input" />
        {errors.email && <p className="mckee-form-error">{errors.email.message}</p>}
      </div>
      <div className="mckee-form-field">
        <label className="mckee-form-label">
          Enter your phone or cell number{" "}
          <span className="mckee-form-required">(required)</span>
        </label>
        <input type="text" {...register("phone")} className="mckee-form-input" />
        {errors.phone && <p className="mckee-form-error">{errors.phone.message}</p>}
      </div>
      <div className="mckee-form-field">
        <label className="mckee-form-label">
          Enter your full address{" "}
          <span className="mckee-form-required">(required)</span>
        </label>
        <input type="text" {...register("address")} className="mckee-form-input" />
        {errors.address && <p className="mckee-form-error">{errors.address.message}</p>}
      </div>
      <div className="mckee-form-field">
        <label className="mckee-form-label">
          {serviceLabel}{" "}
          <span className="mckee-form-required">(required)</span>
        </label>
        <textarea {...register("services")} rows={compact ? 3 : 4} className="mckee-form-input" />
        {errors.services && (
          <p className="mckee-form-error">{errors.services.message}</p>
        )}
      </div>
      <div className="mckee-form-field">
        <label className="mckee-form-label">Any additional comments or requests?</label>
        <textarea {...register("comments")} rows={compact ? 2 : 3} className="mckee-form-input" />
      </div>
    </>
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("mckee-elementor-form", compact && "mckee-elementor-form--compact", className)}
    >
      {showHeader && (
        <div className="mb-4 flex items-start gap-3 border-b border-white/8 pb-4">
          <div className="mckee-form-icon" aria-hidden="true">
            {inquiryMeta.emoji}
          </div>
          <div>
            <p className="mckee-form-heading">{serviceName} quote request</p>
            <p className="mckee-form-subheading">{inquiryMeta.inboxLabel}</p>
          </div>
        </div>
      )}

      <div className={compact ? "mckee-elementor-form-fields mckee-form-fields" : "mckee-form-fields"}>
        {fields}
      </div>

      {status === "success" && (
        <p className="mckee-form-status mckee-form-status--success">
          Thank you for your response. We will be in touch soon.
        </p>
      )}
      {status === "error" && (
        <p className="mckee-form-status mckee-form-status--error">
          Something went wrong. Please call us directly.
        </p>
      )}

      <div className={compact ? "mckee-elementor-form-actions mckee-form-actions" : "mckee-form-actions mt-6 flex justify-center"}>
        <button
          type="submit"
          disabled={isSubmitting}
          className={compact ? "mckee-elementor-form-submit mckee-form-submit" : "mckee-form-submit min-w-[220px]"}
        >
          {isSubmitting ? "Sending..." : "Submit Quote Request"}
        </button>
      </div>
    </form>
  );
}
