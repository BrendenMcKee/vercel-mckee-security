"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  className?: string;
  compact?: boolean;
};

const defaultLabel =
  "Which custom service/s are you inquiring about? Or would you like to request a scheduled site visit for a completely custom quote?";

export function ServiceQuoteForm({
  serviceLabel = defaultLabel,
  className,
  compact = false,
}: ServiceQuoteFormProps) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const inputClass = compact
    ? undefined
    : "w-full rounded-lg border border-white/15 bg-black/50 px-4 py-3.5 text-sm text-white placeholder:text-white/35 transition focus:border-[#c41e2e] focus:outline-none focus:ring-2 focus:ring-[#c41e2e]/25";

  const onSubmit = async (data: FormData) => {
    setStatus("idle");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, serviceLabel }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  };

  const fields = (
    <>
      <div>
        <label>
          Enter your first &amp; last name{" "}
          <span className="mckee-elementor-form-required">(required)</span>
        </label>
        <input type="text" {...register("name")} className={inputClass} />
        {errors.name && (
          <p className="mckee-elementor-form-error">{errors.name.message}</p>
        )}
      </div>
      <div>
        <label>
          Enter your email <span className="mckee-elementor-form-required">(required)</span>
        </label>
        <input type="email" {...register("email")} className={inputClass} />
        {errors.email && (
          <p className="mckee-elementor-form-error">{errors.email.message}</p>
        )}
      </div>
      <div>
        <label>
          Enter your phone or cell number{" "}
          <span className="mckee-elementor-form-required">(required)</span>
        </label>
        <input type="text" {...register("phone")} className={inputClass} />
        {errors.phone && (
          <p className="mckee-elementor-form-error">{errors.phone.message}</p>
        )}
      </div>
      <div>
        <label>
          Enter your full address{" "}
          <span className="mckee-elementor-form-required">(required)</span>
        </label>
        <input type="text" {...register("address")} className={inputClass} />
        {errors.address && (
          <p className="mckee-elementor-form-error">{errors.address.message}</p>
        )}
      </div>
      <div>
        <label>
          {serviceLabel}{" "}
          <span className="mckee-elementor-form-required">(required)</span>
        </label>
        <textarea {...register("services")} rows={compact ? 3 : 4} className={inputClass} />
        {errors.services && (
          <p className="mckee-elementor-form-error">{errors.services.message}</p>
        )}
      </div>
      <div>
        <label>Any additional comments or requests?</label>
        <textarea {...register("comments")} rows={compact ? 2 : 3} className={inputClass} />
      </div>
    </>
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        "mckee-elementor-form",
        compact && "mckee-elementor-form--compact",
        !compact && "mx-auto w-full max-w-[720px] text-left",
        className,
      )}
    >
      <div className={compact ? "mckee-elementor-form-fields" : "space-y-5"}>{fields}</div>

      {status === "success" && (
        <p className="mckee-elementor-form-status mckee-elementor-form-status--success">
          Thank you for your response. We will be in touch soon.
        </p>
      )}
      {status === "error" && (
        <p className="mckee-elementor-form-status mckee-elementor-form-status--error">
          Something went wrong. Please call us directly.
        </p>
      )}

      <div className={compact ? "mckee-elementor-form-actions" : "mt-8 flex justify-center"}>
        <button
          type="submit"
          disabled={isSubmitting}
          className={
            compact
              ? "mckee-elementor-form-submit"
              : "min-w-[220px] rounded-lg bg-gradient-to-r from-[#c41e2e] to-[#c41e2e] px-10 py-4 text-base font-semibold text-white shadow-lg shadow-[#c41e2e]/30 transition hover:from-[#e63946] hover:to-[#ff4757] disabled:opacity-60"
          }
        >
          {isSubmitting ? "Sending..." : "Submit"}
        </button>
      </div>
    </form>
  );
}
