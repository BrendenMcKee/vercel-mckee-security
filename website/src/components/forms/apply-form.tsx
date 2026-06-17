"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
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

export function ApplyForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [resume, setResume] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

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

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-white/35 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-white/10 bg-surface-elevated/50 p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First Name" error={errors.firstName?.message}>
          <input {...register("firstName")} className={inputClass} />
        </Field>
        <Field label="Last Name" error={errors.lastName?.message}>
          <input {...register("lastName")} className={inputClass} />
        </Field>
      </div>
      <Field label="Email" error={errors.email?.message}>
        <input type="email" {...register("email")} className={inputClass} />
      </Field>
      <Field label="Phone" error={errors.phone?.message}>
        <input type="tel" {...register("phone")} className={inputClass} />
      </Field>
      <Field label="Address Line 1" error={errors.address?.message}>
        <input {...register("address")} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" error={errors.city?.message}>
          <input {...register("city")} className={inputClass} />
        </Field>
        <Field label="Province" error={errors.province?.message}>
          <input {...register("province")} className={inputClass} />
        </Field>
        <Field label="Postal Code" error={errors.postalCode?.message}>
          <input {...register("postalCode")} className={inputClass} />
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
              inputClass,
              "mckee-select cursor-pointer appearance-none pr-10",
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
        <input {...register("sourceOther")} className={inputClass} />
      </Field>
      <div>
        <label className="mb-1 block text-sm text-white/70">
          Upload your resume (required)
        </label>
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
        <textarea {...register("additionalInfo")} rows={4} className={inputClass} />
      </Field>
      {status === "success" && (
        <p className="text-sm text-green-400">
          Application submitted. We look forward to hearing from you.
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-primary">
          Submission failed. Email {siteConfig.email.general} directly.
        </p>
      )}
      <Button type="submit" disabled={isSubmitting || !resume} className="w-full">
        {isSubmitting ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
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
    <div>
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-primary">{error}</p>}
    </div>
  );
}
