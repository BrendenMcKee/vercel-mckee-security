"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Small (i) control. Click opens a short explanation so the page stays
 * uncluttered. Written for staff; copy should describe live mail behavior.
 * Portaled above the marketing header (z-50) so the dialog is not buried.
 */
export function PortalHelpTip({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [open]);

  const dialog =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-4 sm:items-center">
            <div
              aria-hidden="true"
              className="absolute inset-0 cursor-pointer"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-10 w-full max-w-md rounded-2xl border border-white/15 bg-surface p-5 shadow-2xl sm:p-6"
            >
              <h3 id={titleId} className="text-lg font-bold text-white">
                {title}
              </h3>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/70">{children}</div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="mt-5 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-(--primary-hover)"
              >
                Close
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/25 text-xs font-bold text-white/70 transition-colors hover:border-white/50 hover:bg-white/10 hover:text-white"
      >
        i
      </button>
      {dialog}
    </>
  );
}
