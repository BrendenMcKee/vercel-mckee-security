"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Loader2 } from "lucide-react";
import { images } from "@/lib/site-config";

export function DataDropsLock() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/data-drops/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Re-run the server gate, which now sees the auth cookie.
        router.refresh();
        return;
      }
      setError(
        res.status === 401
          ? "Incorrect password. Please try again."
          : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-8 shadow-2xl shadow-black/40">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-4 h-16 w-16">
            <Image
              src={images.shieldLogo}
              alt="McKee Security"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-white">
            Data Drops
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Restricted access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="dd-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/60"
            >
              Password
            </label>
            <input
              id="dd-password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary"
              placeholder="Enter access password"
            />
          </div>

          {error ? (
            <p className="text-sm text-primary" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || password.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Unlocking
              </>
            ) : (
              "Unlock"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
