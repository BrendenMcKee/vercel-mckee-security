"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortalBrowserClient } from "@/lib/portal/supabase/client";

/**
 * Logged-out state for /user-dashboard and /admin-dashboard (PORTAL_PLAN.md
 * 6.1): prominent Google sign-in, secondary email/password form. Rendered in
 * place by the layout gates; no dedicated /login route exists.
 *
 * `next` controls where the Google OAuth callback lands (email/password uses
 * router.refresh(), which re-renders the current route either way).
 */
export function SignIn({ next = "/user-dashboard" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Incorrect email or password.");
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 py-20">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        McKee Security Client Portal
      </p>
      <h1 className="mt-4 text-center text-3xl font-bold text-white sm:text-4xl">
        Manage Account
      </h1>
      <p className="mt-4 max-w-sm text-center text-base leading-relaxed text-white/65">
        Securely manage your account information, cloud backups, and more.
      </p>

      <div className="mt-8 w-full rounded-2xl border border-white/10 bg-surface p-6">
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
            {pending ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      <p className="mt-6 max-w-sm text-center text-sm text-white/50">
        New to the portal? Access is by invitation. If you received an activation link
        from McKee Security, use it to set up your account, or call{" "}
        <a href="tel:+17054572156" className="font-bold text-white/80 hover:text-white">
          (705) 457-2156
        </a>
        .
      </p>
    </section>
  );
}
