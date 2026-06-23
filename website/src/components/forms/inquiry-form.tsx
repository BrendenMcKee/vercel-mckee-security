"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { getFormEmailMeta, getServiceDisplayName } from "@/lib/form-email-meta";
import { siteConfig } from "@/lib/site-config";
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

type InquiryFormProps = {
  serviceLabel?: string;
  serviceSlug?: string;
  triggerLabel?: string;
};

export function InquiryForm({
  serviceLabel = "Which custom services are you inquiring about? Or would you like to request a scheduled site visit for a completely custom quote?",
  serviceSlug,
  triggerLabel = "Get a Free Quote",
}: InquiryFormProps) {
  const inquiryMeta = getFormEmailMeta("inquiry", serviceSlug);
  const serviceName = getServiceDisplayName(serviceSlug);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    trigger,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const close = () => {
    setOpen(false);
    setStep(0);
    setDone(false);
    setError("");
    reset();
  };

  const nextStep = async () => {
    if (step === 0) {
      const valid = await trigger(["name", "email", "phone"]);
      if (valid) setStep(1);
    }
  };

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, serviceLabel, serviceSlug }),
      });
      if (!res.ok) throw new Error("Submission failed");
      trackGoogleAdsConversion("quote");
      setDone(true);
    } catch {
      setError("Something went wrong. Please call us directly.");
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="lg">
        {triggerLabel}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-4 sm:items-center"
            onClick={close}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="mckee-form-modal"
            >
              <button
                type="button"
                onClick={close}
                className="absolute right-4 top-5 z-10 rounded-lg p-1 text-white/50 hover:text-white"
                aria-label="Close form"
              >
                <X className="h-5 w-5" />
              </button>

              {done ? (
                <div className="p-8 text-center">
                  <Sparkles className="mx-auto h-10 w-10 text-primary" />
                  <h3 className="mt-4 text-2xl font-bold text-white">
                    Thank you for your response.
                  </h3>
                  <p className="mt-2 text-white/60">
                    We will get back to you as soon as possible.
                  </p>
                  <Button onClick={close} className="mt-6">
                    Close
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8">
                  <div className="mb-5 flex items-start gap-3 pr-8">
                    <div className="mckee-form-icon" aria-hidden="true">
                      {inquiryMeta.emoji}
                    </div>
                    <div>
                      <h3 className="mckee-form-heading">{serviceName} quote</h3>
                      <p className="mckee-form-subheading">
                        {inquiryMeta.inboxLabel}. Step {step + 1} of 2.
                      </p>
                    </div>
                  </div>

                  <div className="mckee-form-step-bar">
                    {[0, 1].map((s) => (
                      <div
                        key={s}
                        className={cn("mckee-form-step", step >= s && "is-active")}
                      />
                    ))}
                  </div>

                  {step === 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mckee-form-fields"
                    >
                      <Field label="First and last name" error={errors.name?.message}>
                        <input {...register("name")} className="mckee-form-input" />
                      </Field>
                      <Field label="Email" error={errors.email?.message}>
                        <input type="email" {...register("email")} className="mckee-form-input" />
                      </Field>
                      <Field label="Phone or cell number" error={errors.phone?.message}>
                        <input type="tel" {...register("phone")} className="mckee-form-input" />
                      </Field>
                      <Button type="button" onClick={nextStep} className="w-full">
                        Continue
                      </Button>
                    </motion.div>
                  )}

                  {step === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mckee-form-fields"
                    >
                      <button
                        type="button"
                        onClick={() => setStep(0)}
                        className="flex items-center gap-1 text-sm text-white/50 hover:text-white"
                      >
                        <ChevronLeft className="h-4 w-4" /> Back
                      </button>
                      <Field label="Full address" error={errors.address?.message}>
                        <input {...register("address")} className="mckee-form-input" />
                      </Field>
                      <Field label={serviceLabel} error={errors.services?.message}>
                        <textarea {...register("services")} rows={3} className="mckee-form-input" />
                      </Field>
                      <Field label="Additional comments (optional)">
                        <textarea {...register("comments")} rows={2} className="mckee-form-input" />
                      </Field>
                      {error && (
                        <p className="mckee-form-status mckee-form-status--error">{error}</p>
                      )}
                      <button type="submit" disabled={isSubmitting} className="mckee-form-submit">
                        {isSubmitting ? "Submitting..." : "Submit Quote Request"}
                      </button>
                    </motion.div>
                  )}

                  <p className="mckee-form-footer-note">
                    Or call {siteConfig.phone.short} · {siteConfig.email.general}
                  </p>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mckee-form-field">
      <label className="mckee-form-label">{label}</label>
      {children}
      {error && <p className="mckee-form-error">{error}</p>}
    </div>
  );
}
