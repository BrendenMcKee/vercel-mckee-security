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
      aria-label="Fill out the inquiry form"
    >
      {isFloating ? (
        <>
          <ClipboardPenLine size={18} strokeWidth={2} aria-hidden="true" />
          <span>Fill out the form</span>
        </>
      ) : (
        "Fill out the form now"
      )}
    </button>
  );
}
