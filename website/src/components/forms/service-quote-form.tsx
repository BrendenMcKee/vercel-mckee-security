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
};

const defaultLabel =
  "Which custom service/s are you inquiring about? Or would you like to request a scheduled site visit for a completely custom quote?";

export function ServiceQuoteForm({
  serviceLabel = defaultLabel,
  className,
}: ServiceQuoteFormProps) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const inputClass =
    "w-full rounded-lg border border-white/15 bg-black/50 px-4 py-3.5 text-sm text-white placeholder:text-white/35 transition focus:border-[#c41e2e] focus:outline-none focus:ring-2 focus:ring-[#c41e2e]/25";

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

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("mckee-elementor-form mx-auto w-full max-w-[720px] text-left", className)}
    >
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-white/90">
            Enter your first &amp; last name <span className="text-white/50">(required)</span>
          </label>
          <input type="text" {...register("name")} className={inputClass} />
          {errors.name && <p className="mt-1 text-xs text-primary">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-white/90">
            Enter your email <span className="text-white/50">(required)</span>
          </label>
          <input type="email" {...register("email")} className={inputClass} />
          {errors.email && <p className="mt-1 text-xs text-primary">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-white/90">
            Enter your phone or cell number <span className="text-white/50">(required)</span>
          </label>
          <input type="text" {...register("phone")} className={inputClass} />
          {errors.phone && <p className="mt-1 text-xs text-primary">{errors.phone.message}</p>}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-white/90">
            Enter your full address <span className="text-white/50">(required)</span>
          </label>
          <input type="text" {...register("address")} className={inputClass} />
          {errors.address && (
            <p className="mt-1 text-xs text-primary">{errors.address.message}</p>
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-white/90">
            {serviceLabel} <span className="text-white/50">(required)</span>
          </label>
          <textarea {...register("services")} rows={4} className={inputClass} />
          {errors.services && (
            <p className="mt-1 text-xs text-primary">{errors.services.message}</p>
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-white/90">
            Any additional comments or requests?
          </label>
          <textarea {...register("comments")} rows={3} className={inputClass} />
        </div>
      </div>

      {status === "success" && (
        <p className="mt-5 text-center text-sm font-medium text-green-400">
          Thank you for your response. We will be in touch soon.
        </p>
      )}
      {status === "error" && (
        <p className="mt-5 text-center text-sm text-primary">
          Something went wrong. Please call us directly.
        </p>
      )}

      <div className="mt-8 flex justify-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[220px] rounded-lg bg-gradient-to-r from-[#c41e2e] to-[#c41e2e] px-10 py-4 text-base font-semibold text-white shadow-lg shadow-[#c41e2e]/30 transition hover:from-[#e63946] hover:to-[#ff4757] disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Submit"}
        </button>
      </div>
    </form>
  );
}
