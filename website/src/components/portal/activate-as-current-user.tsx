"use client";

import { useState, useTransition } from "react";
import { activateAsCurrentUser } from "@/lib/portal/actions/activation";

/**
 * One-click activation for a visitor who already holds a session that passed
 * the target-email check (e.g. they signed in with Google before opening the
 * invite and landed in the orphan flow).
 */
export function ActivateAsCurrentUser({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function activate() {
    setError(null);
    startTransition(async () => {
      const result = await activateAsCurrentUser(token);
      // On success the action redirects; only failures return.
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-4">
      <button
        type="button"
        onClick={activate}
        disabled={pending}
        className="w-full cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
      >
        {pending ? "Activating..." : "Activate My Account"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-[#f57c00]">
          {error}
        </p>
      )}
    </div>
  );
}
