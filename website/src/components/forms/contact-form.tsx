"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { getFormEmailMeta } from "@/lib/form-email-meta";
import { trackGoogleAdsConversion } from "@/lib/google-ads";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  subject: z.string().min(2, "Subject is required"),
  message: z.string().min(10, "Please include a message"),
});

type FormData = z.infer<typeof schema>;

const contactMeta = getFormEmailMeta("contact");

export function ContactForm() {
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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("failed");
      trackGoogleAdsConversion("contact");
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mckee-form-panel"
    >
      <div className="mckee-form-header">
        <div className="mckee-form-icon" aria-hidden="true">
          {contactMeta.emoji}
        </div>
        <div>
          <h3 className="mckee-form-heading">Ask a question</h3>
          <p className="mckee-form-subheading">
            Send us a message and we will get back to you as soon as possible.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mckee-form-body">
        <div className="mckee-form-fields">
          {[
            { name: "name" as const, label: "Your Name", type: "text" },
            { name: "email" as const, label: "Your Email", type: "email" },
            { name: "subject" as const, label: "Subject", type: "text" },
          ].map((field) => (
            <div key={field.name} className="mckee-form-field">
              <label className="mckee-form-label">{field.label}</label>
              <input
                type={field.type}
                {...register(field.name)}
                className="mckee-form-input"
              />
              {errors[field.name] && (
                <p className="mckee-form-error">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}

          <div className="mckee-form-field">
            <label className="mckee-form-label">Your Message</label>
            <textarea {...register("message")} rows={5} className="mckee-form-input" />
            {errors.message && (
              <p className="mckee-form-error">{errors.message.message}</p>
            )}
          </div>
        </div>

        {status === "success" && (
          <p className="mckee-form-status mckee-form-status--success">
            Message sent. We will respond soon.
          </p>
        )}
        {status === "error" && (
          <p className="mckee-form-status mckee-form-status--error">
            Something went wrong. Please call us directly.
          </p>
        )}

        <div className="mckee-form-actions">
          <button type="submit" disabled={isSubmitting} className="mckee-form-submit">
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
