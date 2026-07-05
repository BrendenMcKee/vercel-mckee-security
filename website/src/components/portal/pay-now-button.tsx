"use client";

import { useState, useTransition } from "react";
import { createCheckoutSession } from "@/lib/portal/actions/payments";

/** Starts Stripe Checkout for an unpaid autopay service (PORTAL_PLAN.md 9.1). */
export function PayNowButton({ serviceId }: { serviceId: string }) {
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
        className="cursor-pointer rounded-xl bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
      >
        {pending ? "Opening secure checkout..." : "Pay Now"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
