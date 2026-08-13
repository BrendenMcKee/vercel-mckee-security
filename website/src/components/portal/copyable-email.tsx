"use client";

import { useState } from "react";

/**
 * Highlighted e-Transfer address. Click / tap copies it. Drag or long-press
 * still selects the text so the usual copy menu works. Not a mailto link.
 */
export function CopyableEmail({
  email,
  className,
}: {
  email: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Selection / long-press copy still works if the clipboard API is blocked.
    }
  }

  function onPointerUp() {
    const selected = window.getSelection()?.toString() ?? "";
    if (selected.length > 0) return;
    void copy();
  }

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span
        onPointerUp={onPointerUp}
        title={copied ? "Copied" : "Click to copy"}
        className={
          className ??
          "inline-block cursor-pointer select-text rounded-md bg-amber-400/20 px-1.5 py-0.5 font-semibold text-amber-50 ring-1 ring-amber-300/40"
        }
      >
        {email}
      </span>
      {copied ? (
        <span className="text-xs font-semibold text-amber-100/80">Copied</span>
      ) : null}
    </span>
  );
}
