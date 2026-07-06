"use client";

import { useState, useTransition } from "react";
import { createBillingPortalSession } from "@/lib/portal/actions/payments";

/**
 * Opens the Stripe customer portal: receipts, card payment history, and card
 * updates. Cancellation and plan changes are disabled there — those go
 * through McKee (R21).
 */
export function ManageBillingButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setError(null);
    startTransition(async () => {
      const result = await createBillingPortalSession();
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
        onClick={open}
        className="cursor-pointer rounded-xl border border-white/20 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
      >
        {pending ? "Opening..." : "Update Card / View Receipts"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
