"use client";

import { useState, useTransition } from "react";
import { createPortalBrowserClient } from "@/lib/portal/supabase/client";
import {
  activateWithPassword,
  beginGoogleActivation,
} from "@/lib/portal/actions/activation";

/**
 * Activation chooser (PORTAL_PLAN.md 6.3 step 2 / 6.4 step 1): Google first,
 * or email + password. When the invitation has a target email the field is
 * locked to it, because the link only proves ownership of that inbox.
 */
export function ActivateAccount({
  token,
  targetEmail,
}: {
  token: string;
  targetEmail: string | null;
}) {
  const [email, setEmail] = useState(targetEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);
  const [pending, startTransition] = useTransition();

  async function continueWithGoogle() {
    setError(null);
    setGooglePending(true);
    const begin = await beginGoogleActivation(token);
    if (!begin.ok) {
      setError(begin.error ?? "Could not start Google activation.");
      setGooglePending(false);
      return;
    }
    const supabase = createPortalBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent("/account/activate/complete")}`,
      },
    });
    if (oauthError) {
      setError("Google sign-in is unavailable right now. Please try again or set a password instead.");
      setGooglePending(false);
    }
    // On success the browser navigates away to Google.
  }

  function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    startTransition(async () => {
      const result = await activateWithPassword({ token, email, password });
      // On success the action redirects; we only see a result on failure or
      // when email confirmation is required.
      if (!result.ok) {
        setError(result.error);
      } else if (result.state === "confirm_email") {
        setConfirmEmailSent(true);
      }
    });
  }

  if (confirmEmailSent) {
    return (
      <div className="mt-8 w-full rounded-2xl border border-white/10 bg-surface p-6 text-center">
        <h2 className="text-xl font-bold text-white">Confirm your email</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Your account was created. We sent a confirmation link to{" "}
          <span className="font-bold text-white">{email}</span>. Click it, then
          sign in at Manage Account.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 w-full rounded-2xl border border-white/10 bg-surface p-6">
      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={googlePending || pending}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-neutral-900 transition-all duration-200 hover:bg-white/90 disabled:cursor-default disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        {googlePending ? "Redirecting..." : "Continue with Google"}
      </button>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-widest text-white/40">
          or set a password
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={submitPassword} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-white/80">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            readOnly={Boolean(targetEmail)}
            onChange={(e) => setEmail(e.target.value)}
            className={`rounded-xl border border-white/15 bg-background px-4 py-3 text-white outline-none transition-colors focus:border-primary ${targetEmail ? "opacity-60" : ""}`}
          />
          {targetEmail && (
            <span className="text-xs text-white/40">
              Locked to the email your invitation was sent to.
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-white/80">
          Password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-white/15 bg-background px-4 py-3 text-white outline-none transition-colors focus:border-primary"
          />
          <span className="text-xs text-white/40">At least 8 characters.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-white/80">
          Confirm password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          disabled={pending || googlePending}
          className="cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
        >
          {pending ? "Activating..." : "Activate Account"}
        </button>
      </form>
    </div>
  );
}
