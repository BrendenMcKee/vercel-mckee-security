"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveAlertAction } from "@/lib/portal/actions/alerts";

export function ResolveAlertButton({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resolve() {
    setError(null);
    startTransition(async () => {
      const result = await resolveAlertAction(alertId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={resolve}
        disabled={pending}
        className="cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Resolving..." : "Resolve"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
