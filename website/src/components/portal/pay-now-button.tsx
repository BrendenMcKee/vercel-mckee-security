"use client";

import { useState, useTransition } from "react";
import { createCheckoutSession } from "@/lib/portal/actions/payments";

/**
 * Starts Stripe Checkout (PORTAL_PLAN.md 9.1): either paying an unpaid
 * service now, or putting a card on file so billing starts at the client's
 * existing anniversary (label reflects which). Stays in this tab because
 * checkout redirects back to the dashboard when it finishes.
 */
export function PayNowButton({ serviceId, label = "Pay Now" }: { serviceId: string; label?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pay() {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSession({ serviceId });
      if (result.ok) {
        window.location.assign(result.url);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={pay}
        aria-busy={pending}
        className="relative cursor-pointer rounded-xl bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-70"
      >
        <span className={pending ? "invisible" : undefined}>{label}</span>
        {pending && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          </span>
        )}
      </button>
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
