"use client";

import { ClipboardPenLine } from "lucide-react";
import { scrollToServiceQuote } from "@/lib/scroll-to-service-quote";
import { cn } from "@/lib/utils";

type ServiceFormScrollButtonProps = {
  variant?: "hero" | "floating";
  className?: string;
};

export function ServiceFormScrollButton({
  variant = "hero",
  className,
}: ServiceFormScrollButtonProps) {
  const isFloating = variant === "floating";

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
      aria-label="Scroll to inquiry form"
    >
      {isFloating ? (
        <>
          <ClipboardPenLine size={18} strokeWidth={2} aria-hidden="true" />
          <span className="mckee-service-form-scroll-btn__label">Inquire now</span>
        </>
      ) : (
        <span className="mckee-service-form-scroll-btn__label">Inquire Now</span>
      )}
    </button>
  );
}
