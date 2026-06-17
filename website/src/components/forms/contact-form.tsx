"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  subject: z.string().min(2, "Subject is required"),
  message: z.string().min(10, "Please include a message"),
});

type FormData = z.infer<typeof schema>;

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
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-white/10 bg-surface-elevated/50 p-8"
    >
      <h3 className="text-xl font-bold text-white">Ask a question</h3>
      {[
        { name: "name" as const, label: "Your Name", type: "text" },
        { name: "email" as const, label: "Your Email", type: "email" },
        { name: "subject" as const, label: "Subject", type: "text" },
      ].map((field) => (
        <div key={field.name}>
          <label className="mb-1 block text-sm text-white/70">{field.label}</label>
          <input
            type={field.type}
            {...register(field.name)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:border-primary focus:outline-none"
          />
          {errors[field.name] && (
            <p className="mt-1 text-xs text-primary">{errors[field.name]?.message}</p>
          )}
        </div>
      ))}
      <div>
        <label className="mb-1 block text-sm text-white/70">Your Message</label>
        <textarea
          {...register("message")}
          rows={5}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:border-primary focus:outline-none"
        />
        {errors.message && (
          <p className="mt-1 text-xs text-primary">{errors.message.message}</p>
        )}
      </div>
      {status === "success" && (
        <p className="text-sm text-green-400">Message sent. We will respond soon.</p>
      )}
      {status === "error" && (
        <p className="text-sm text-primary">Something went wrong. Please call us directly.</p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Sending..." : "Send Message"}
      </Button>
    </motion.form>
  );
}
