"use client";

import { useState, useTransition } from "react";
import { payOwnVoipPortFeeAction } from "@/lib/portal/actions/payments";

export function PayPortFeeButton({ serviceId }: { serviceId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pay() {
    setError(null);
    startTransition(async () => {
      const result = await payOwnVoipPortFeeAction({ serviceId });
      if (!result.ok) setError(result.error);
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
        <span className={pending ? "invisible" : undefined}>Pay Port Fee</span>
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
