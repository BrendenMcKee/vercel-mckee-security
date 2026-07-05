"use client";

import { useState } from "react";
import { createPortalBrowserClient } from "@/lib/portal/supabase/client";

/** Inline "send me a new reset link" form for expired/invalid recovery links. */
export function ResetLinkRequest() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createPortalBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent("/account/reset-password")}`,
    });
    setPending(false);
    if (resetError) {
      setError("Could not send the reset email right now. Please try again in a few minutes.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="mt-6 max-w-sm text-center text-sm leading-relaxed text-white/65">
        If an account exists for <span className="font-bold text-white">{email}</span>,
        a new reset link is on its way. The link expires after one hour.
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 flex w-full flex-col gap-4 rounded-2xl border border-white/10 bg-surface p-6"
    >
      <label className="flex flex-col gap-1.5 text-sm text-white/80">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-white/15 bg-background px-4 py-3 text-white outline-none transition-colors focus:border-primary"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-[#f57c00]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send New Reset Link"}
      </button>
    </form>
  );
}
