"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
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
  triggerLabel?: string;
};

export function InquiryForm({
  serviceLabel = "Which custom services are you inquiring about? Or would you like to request a scheduled site visit for a completely custom quote?",
  triggerLabel = "Get a Free Quote",
}: InquiryFormProps) {
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
        body: JSON.stringify({ ...data, serviceLabel }),
      });
      if (!res.ok) throw new Error("Submission failed");
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
              className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-surface-elevated shadow-2xl"
            >
              <button
                type="button"
                onClick={close}
                className="absolute right-4 top-4 rounded-lg p-1 text-white/50 hover:text-white"
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
                <form onSubmit={handleSubmit(onSubmit)} className="p-8">
                  <div className="mb-6 flex gap-2">
                    {[0, 1].map((s) => (
                      <div
                        key={s}
                        className={cn(
                          "h-1 flex-1 rounded-full transition",
                          step >= s ? "bg-primary" : "bg-white/10",
                        )}
                      />
                    ))}
                  </div>

                  {step === 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <h3 className="text-xl font-bold text-white">
                        Your contact details
                      </h3>
                      <Field label="First and last name" error={errors.name?.message}>
                        <input {...register("name")} className={inputClass} />
                      </Field>
                      <Field label="Email" error={errors.email?.message}>
                        <input type="email" {...register("email")} className={inputClass} />
                      </Field>
                      <Field label="Phone or cell number" error={errors.phone?.message}>
                        <input type="tel" {...register("phone")} className={inputClass} />
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
                      className="space-y-4"
                    >
                      <button
                        type="button"
                        onClick={() => setStep(0)}
                        className="flex items-center gap-1 text-sm text-white/50 hover:text-white"
                      >
                        <ChevronLeft className="h-4 w-4" /> Back
                      </button>
                      <h3 className="text-xl font-bold text-white">
                        Project details
                      </h3>
                      <Field label="Full address" error={errors.address?.message}>
                        <input {...register("address")} className={inputClass} />
                      </Field>
                      <Field label={serviceLabel} error={errors.services?.message}>
                        <textarea {...register("services")} rows={3} className={inputClass} />
                      </Field>
                      <Field label="Additional comments (optional)">
                        <textarea {...register("comments")} rows={2} className={inputClass} />
                      </Field>
                      {error && <p className="text-sm text-primary">{error}</p>}
                      <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? "Submitting..." : "Submit"}
                      </Button>
                    </motion.div>
                  )}

                  <p className="mt-4 text-center text-xs text-white/40">
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

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

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
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/70">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-primary">{error}</p>}
    </div>
  );
}
