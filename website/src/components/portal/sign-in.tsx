"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortalBrowserClient } from "@/lib/portal/supabase/client";
import { hasLinkedPortalLogin } from "@/lib/portal/has-linked-login";
import { AuthFrame } from "@/components/portal/auth-frame";

const COPY = {
  client: {
    eyebrow: "McKee Security Client Portal",
    heading: "Manage Account",
    description: "Securely manage your account information, cloud backups, and more.",
    footer: "invitation",
  },
  admin: {
    eyebrow: "McKee Security Staff Console",
    heading: "Admin Sign In",
    description: "This is the internal office console. Client accounts sign in at Manage Account.",
    footer: "staff",
  },
} as const;

/** Errors handed back by /api/auth/callback via ?auth_error=. */
function mapAuthError(code: string | null, variant: keyof typeof COPY): string | null {
  if (code === "no_account") {
    return variant === "admin"
      ? "That Google account is not set up for McKee Security staff access. No account was created."
      : "There is no McKee Security account for that Google sign-in, so nothing was created. If you received an invitation, use your activation link to set up your account, or contact McKee Security.";
  }
  if (code === "callback") {
    return "Sign-in did not complete. Please try again.";
  }
  return null;
}

/**
 * Logged-out state for /user-dashboard and /admin-dashboard (PORTAL_PLAN.md
 * 6.1): prominent Google sign-in, secondary email/password form. Rendered in
 * place by the layout gates; no dedicated /login route exists.
 *
 * `next` controls where the Google OAuth callback lands (email/password uses
 * router.refresh(), which re-renders the current route either way).
 */
export function SignIn({
  next = "/user-dashboard",
  variant = "client",
}: {
  next?: string;
  variant?: keyof typeof COPY;
}) {
  const copy = COPY[variant];
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "forgot" | "sent">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    mapAuthError(searchParams.get("auth_error"), variant),
  );
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  async function signInWithGoogle() {
    setError(null);
    setGooglePending(true);
    const supabase = createPortalBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) {
      setError("Google sign-in is unavailable right now. Please try again or use your email and password.");
      setGooglePending(false);
    }
    // On success the browser navigates away to Google.
  }

  async function signInWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createPortalBrowserClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Incorrect email or password.");
      setPending(false);
      return;
    }

    // Credentials valid but no linked account: stay on the sign-in screen
    // with a clear message instead of pushing into the portal.
    const link = await hasLinkedPortalLogin(supabase, signInData.user.id);
    if (!link.lookupFailed && !link.linked) {
      await supabase.auth.signOut();
      setError(mapAuthError("no_account", variant));
      setPending(false);
      return;
    }

    router.refresh();
  }

  async function sendResetLink(event: React.FormEvent<HTMLFormElement>) {
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
    setMode("sent");
  }

  if (mode === "sent") {
    return (
      <AuthFrame
        variant={variant}
        eyebrow={copy.eyebrow}
        heading="Check Your Email"
        description={
          <>
            If an account exists for{" "}
            <span className="font-bold text-white">{email}</span>, a password
            reset link is on its way. The link expires after one hour.
          </>
        }
        footer={
          <button
            type="button"
            onClick={() => setMode("signin")}
            className="cursor-pointer text-sm font-bold text-white/70 underline underline-offset-4 hover:text-white"
          >
            Back to sign in
          </button>
        }
      >
        <p className="text-sm leading-relaxed text-white/55">
          Check your inbox and spam folder. The message comes from McKee Security.
        </p>
      </AuthFrame>
    );
  }

  if (mode === "forgot") {
    return (
      <AuthFrame
        variant={variant}
        eyebrow={copy.eyebrow}
        heading="Forgot Password"
        description="Enter your email and we will send you a link to reset your password."
        footer={
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className="cursor-pointer text-sm font-bold text-white/70 underline underline-offset-4 hover:text-white"
          >
            Back to sign in
          </button>
        }
      >
        <form onSubmit={sendResetLink} className="flex flex-col gap-4">
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
            <p role="alert" className="text-center text-sm text-[#f57c00]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className={`cursor-pointer rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition-all duration-200 disabled:cursor-default disabled:opacity-50 ${
              variant === "admin"
                ? "bg-amber-500 shadow-amber-500/20 hover:bg-amber-400"
                : "bg-primary shadow-primary/25 hover:bg-[var(--primary-hover)]"
            }`}
          >
            {pending ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      variant={variant}
      eyebrow={copy.eyebrow}
      heading={copy.heading}
      description={copy.description}
      footer={
        copy.footer === "invitation" ? (
          <>
            New to the portal? Access is by invitation. If you received an activation link
            from McKee Security, use it to set up your account, or call{" "}
            <a href="tel:+17054572156" className="font-bold text-white/80 hover:text-white">
              (705) 457-2156
            </a>
            .
          </>
        ) : (
          <>
            Looking for your client account? Sign in at{" "}
            <a href="/user-dashboard" className="font-bold text-amber-200 underline underline-offset-4 hover:text-white">
              Manage Account
            </a>
            . This page is for McKee Security staff only.
          </>
        )
      }
    >
        <button
          type="button"
          onClick={signInWithGoogle}
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
          <span className="text-xs uppercase tracking-widest text-white/40">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={signInWithEmail} className="flex flex-col gap-4">
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
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-white/15 bg-background px-4 py-3 text-white outline-none transition-colors focus:border-primary"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              setError(null);
            }}
            className="-mt-2 cursor-pointer self-end text-xs font-bold text-white/50 underline underline-offset-4 transition-colors hover:text-white"
          >
            Forgot password?
          </button>

          {error && (
            <p role="alert" className="text-center text-sm text-[#f57c00]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || googlePending}
            className={`cursor-pointer rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition-all duration-200 disabled:cursor-default disabled:opacity-50 ${
              variant === "admin"
                ? "bg-amber-500 shadow-amber-500/20 hover:bg-amber-400"
                : "bg-primary shadow-primary/25 hover:bg-[var(--primary-hover)]"
            }`}
          >
            {pending ? "Signing in..." : "Sign In"}
          </button>
        </form>
    </AuthFrame>
  );
}
