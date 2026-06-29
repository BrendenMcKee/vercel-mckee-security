"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
import { getFormEmailMeta } from "@/lib/form-email-meta";
import { FormIcon } from "@/components/forms/form-icon";
import { siteConfig } from "@/lib/site-config";
import { useAutofillSync } from "@/lib/use-autofill-sync";
import { cn } from "@/lib/utils";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Required"),
  address: z.string().min(5, "Required"),
  city: z.string().min(1, "Required"),
  province: z.string().min(1, "Required"),
  postalCode: z.string().min(3, "Required"),
  source: z.string().min(1, "Required"),
  sourceOther: z.string().optional(),
  additionalInfo: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const sourceOptions = [
  { value: "", label: "Select an option..." },
  { value: "search", label: "Search Engine" },
  { value: "social", label: "Social Media" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];

const applyMeta = getFormEmailMeta("apply");

export function ApplyForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [resume, setResume] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const { formRef, onAnimationStart } = useAutofillSync<FormData>(setValue);

  const sourceValue = watch("source");

  const onSubmit = async (data: FormData) => {
    if (!resume) return;
    setStatus("idle");
    try {
      const body = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v) body.append(k, v);
      });
      body.append("resume", resume);
      const res = await fetch("/api/apply", { method: "POST", body });
      if (!res.ok) throw new Error("failed");
      setStatus("success");
      reset();
      setResume(null);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="mckee-form-panel">
      <div className="mckee-form-header">
        <FormIcon emoji={applyMeta.emoji} emojis={applyMeta.iconEmojis} />
        <div>
          <h3 className="mckee-form-heading">Apply for a technician position</h3>
          <p className="mckee-form-subheading">
            Join our team in Haliburton County. Upload your resume and tell us a
            little about yourself.
          </p>
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        onAnimationStart={onAnimationStart}
        className="mckee-form-body"
      >
        <div className="mckee-form-fields">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First Name" error={errors.firstName?.message}>
              <input
                autoComplete="given-name"
                {...register("firstName")}
                className="mckee-form-input"
              />
            </Field>
            <Field label="Last Name" error={errors.lastName?.message}>
              <input
                autoComplete="family-name"
                {...register("lastName")}
                className="mckee-form-input"
              />
            </Field>
          </div>
          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              autoComplete="email"
              {...register("email")}
              className="mckee-form-input"
            />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <input
              type="tel"
              autoComplete="tel"
              {...register("phone")}
              className="mckee-form-input"
            />
          </Field>
          <Field label="Address Line 1" error={errors.address?.message}>
            <input
              autoComplete="address-line1"
              {...register("address")}
              className="mckee-form-input"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" error={errors.city?.message}>
              <input
                autoComplete="address-level2"
                {...register("city")}
                className="mckee-form-input"
              />
            </Field>
            <Field label="Province" error={errors.province?.message}>
              <input
                autoComplete="address-level1"
                {...register("province")}
                className="mckee-form-input"
              />
            </Field>
            <Field label="Postal Code" error={errors.postalCode?.message}>
              <input
                autoComplete="postal-code"
                {...register("postalCode")}
                className="mckee-form-input"
              />
            </Field>
          </div>
          <Field
            label="How did you find out about this position?"
            error={errors.source?.message}
          >
            <div className="relative">
              <select
                {...register("source")}
                className={cn(
                  "mckee-form-input cursor-pointer appearance-none pr-10",
                  !sourceValue && "text-white/45",
                )}
              >
                {sourceOptions.map((option) => (
                  <option key={option.value || "empty"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            </div>
          </Field>
          <Field label="If other, please specify">
            <input {...register("sourceOther")} className="mckee-form-input" />
          </Field>
          <div className="mckee-form-field">
            <label className="mckee-form-label">Upload your resume (required)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResume(e.target.files?.[0] ?? null)}
              className="w-full cursor-pointer text-sm text-white/60 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
            />
            {!resume && status !== "success" && (
              <p className="mt-1 text-xs text-white/40">PDF or Word document</p>
            )}
          </div>
          <Field label="Additional Information">
            <textarea {...register("additionalInfo")} rows={4} className="mckee-form-input" />
          </Field>
        </div>

        {status === "success" && (
          <p className="mckee-form-status mckee-form-status--success">
            Application submitted. We look forward to hearing from you.
          </p>
        )}
        {status === "error" && (
          <p className="mckee-form-status mckee-form-status--error">
            Submission failed. Email {siteConfig.email.general} directly.
          </p>
        )}

        <div className="mckee-form-actions">
          <button
            type="submit"
            disabled={isSubmitting || !resume}
            className="mckee-form-submit"
          >
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </form>
    </div>
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
