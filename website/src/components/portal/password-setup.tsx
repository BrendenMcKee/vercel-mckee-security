"use client";

import { useState, useTransition } from "react";
import { updatePassword } from "@/lib/portal/actions/password";

const COPY = {
  "first-access": {
    eyebrow: "McKee Security Client Portal",
    heading: "One Last Step",
    button: "Set Password & Continue",
  },
  reset: {
    eyebrow: "McKee Security Client Portal",
    heading: "Reset Your Password",
    button: "Update Password",
  },
} as const;

/**
 * Password form shared by the forced first-access setup screen (stakeholder
 * 2026-07-05: every client must have a password even after Google activation)
 * and the forgot-password reset page. On success the server action redirects
 * to the dashboard.
 */
export function PasswordSetup({
  variant,
  googleLinked = false,
  email,
}: {
  variant: keyof typeof COPY;
  googleLinked?: boolean;
  email?: string | null;
}) {
  const copy = COPY[variant];
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    startTransition(async () => {
      const result = await updatePassword({ password });
      // On success the action redirects; only failures return.
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 py-20">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        {copy.eyebrow}
      </p>
      <h1 className="mt-4 text-center text-3xl font-bold text-white sm:text-4xl">
        {copy.heading}
      </h1>

      {variant === "first-access" ? (
        <div className="mt-6 w-full space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <span aria-hidden="true" className="mt-0.5 text-emerald-300">✓</span>
            <p className="text-sm leading-relaxed text-emerald-200">
              Your account{email ? (
                <>
                  {" "}for <span className="font-bold">{email}</span>
                </>
              ) : null}{" "}
              is activated{googleLinked ? " and your Google sign-in is linked. You can always use Continue with Google." : "."}
            </p>
          </div>
          <p className="text-center text-sm leading-relaxed text-white/65">
            Now set a password as a backup way to sign in. From then on, either
            method works.
          </p>
        </div>
      ) : (
        <p className="mt-4 max-w-sm text-center text-base leading-relaxed text-white/65">
          Choose a new password{email ? (
            <>
              {" "}for <span className="font-bold text-white">{email}</span>
            </>
          ) : null}
          .
        </p>
      )}

      <form
        onSubmit={submit}
        className="mt-6 flex w-full flex-col gap-4 rounded-2xl border border-white/10 bg-surface p-6"
      >
        <label className="flex flex-col gap-1.5 text-sm text-white/80">
          New password
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
          disabled={pending}
          className="cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
        >
          {pending ? "Saving..." : copy.button}
        </button>
      </form>
    </section>
  );
}
