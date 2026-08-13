"use client";

import { ClipboardPenLine } from "lucide-react";
import { scrollToServiceQuote } from "@/lib/scroll-to-service-quote";
import { cn } from "@/lib/utils";

type ServiceFormScrollButtonProps = {
  variant?: "hero" | "floating";
  className?: string;
  label?: string;
  ariaLabel?: string;
};

export function ServiceFormScrollButton({
  variant = "hero",
  className,
  label,
  ariaLabel,
}: ServiceFormScrollButtonProps) {
  const isFloating = variant === "floating";
  const text =
    label ?? (isFloating ? "Inquire now" : "Inquire Now");

  return (
    <button
      type="button"
      className={cn(
        "mckee-service-form-scroll-btn",
        isFloating
          ? "mckee-service-form-scroll-btn--floating"
          : "mckee-service-form-scroll-btn--hero",
        className,
      )}
      onClick={() => scrollToServiceQuote()}
      aria-label={ariaLabel ?? "Scroll to inquiry form"}
    >
      {isFloating ? (
        <>
          <ClipboardPenLine size={18} strokeWidth={2} aria-hidden="true" />
          <span className="mckee-service-form-scroll-btn__label">{text}</span>
        </>
      ) : (
        <span className="mckee-service-form-scroll-btn__label">{text}</span>
      )}
    </button>
  );
}
