"use client";

import { useState, useTransition } from "react";
import { createBillingPortalSession } from "@/lib/portal/actions/payments";

/**
 * Opens the Stripe customer portal in a new tab: receipts, card payment
 * history, and card updates. Cancellation and plan changes are disabled
 * there; those go through McKee (R21).
 */
export function ManageBillingButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setError(null);
    // Open the tab synchronously on click so popup blockers allow it, then
    // point it at the Stripe session once the server returns the URL.
    const stripeTab = window.open("about:blank", "_blank");
    startTransition(async () => {
      const result = await createBillingPortalSession();
      if (result.ok) {
        if (stripeTab) {
          stripeTab.location.href = result.url;
        } else {
          window.location.assign(result.url);
        }
      } else {
        stripeTab?.close();
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
        aria-busy={pending}
        className="relative cursor-pointer rounded-xl border border-white/20 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-70"
      >
        <span className={pending ? "invisible" : undefined}>Update Card / View Receipts</span>
        {pending && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
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
