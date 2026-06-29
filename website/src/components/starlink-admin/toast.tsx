"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastState = { message: string; tone: "success" | "error" } | null;

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-5 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold shadow-2xl ring-1 ring-inset",
        toast.tone === "success"
          ? "bg-emerald-950/90 text-emerald-200 ring-emerald-500/40"
          : "bg-red-950/90 text-red-200 ring-red-500/40",
      )}
    >
      {toast.tone === "success" ? (
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
      ) : (
        <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      )}
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-1 rounded-md p-0.5 text-white/50 transition-colors hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
