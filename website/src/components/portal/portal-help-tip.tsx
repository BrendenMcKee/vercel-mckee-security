"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

/**
 * "More info" control. Click opens a short explanation so the page stays
 * uncluttered. Written for staff who do not live in the schema. Copy should
 * describe live mail behavior. Portaled above the marketing header (z-50).
 */
export function PortalHelpSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h4 className="text-sm font-bold text-white">{title}</h4>
      <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-white/75">{children}</div>
    </section>
  );
}

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
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
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
              className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-sky-400/30 bg-surface p-5 shadow-2xl sm:p-6"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-sky-300">More info</p>
              <h3 id={titleId} className="mt-1 text-lg font-bold text-white">
                {title}
              </h3>
              <div className="mt-4 space-y-5">{children}</div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="mt-6 cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-(--primary-hover)"
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
        className="inline-flex min-h-9 items-center gap-1 text-sm font-bold text-sky-300 underline decoration-sky-300/50 underline-offset-2 transition-colors hover:text-sky-200 hover:decoration-sky-200"
      >
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        More info
      </button>
      {dialog}
    </>
  );
}
