"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  joinCloudBackupInterestAction,
  leaveCloudBackupInterestAction,
} from "@/lib/portal/actions/cloud-backup-interest";

export function CloudBackupInterest({
  initiallyInterested,
  email,
}: {
  initiallyInterested: boolean;
  email: string | null;
}) {
  const router = useRouter();
  const [interested, setInterested] = useState(initiallyInterested);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function join() {
    setError(null);
    startTransition(async () => {
      const result = await joinCloudBackupInterestAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInterested(true);
      router.refresh();
    });
  }

  function leave() {
    setError(null);
    startTransition(async () => {
      const result = await leaveCloudBackupInterestAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInterested(false);
      router.refresh();
    });
  }

  if (interested) {
    return (
      <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div role="status">
          <p className="font-bold text-emerald-200">You&apos;re on the update list.</p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-100/70">
            We&apos;ll email {email ?? "the address on your account"} when Camera
            Cloud Backup becomes available.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={leave}
          className="cursor-pointer text-xs font-bold text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white disabled:cursor-default disabled:opacity-50"
        >
          {pending ? "Removing..." : "Remove me from this list"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-amber-200">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-white/40">
        By selecting Notify Me, you agree that McKee Security may email you
        about Camera Cloud Backup. You can leave the list at any time.
      </p>
      <button
        type="button"
        disabled={pending || !email}
        onClick={join}
        aria-busy={pending}
        className="relative cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-(--primary-hover) disabled:cursor-default disabled:opacity-50"
      >
        <span className={pending ? "invisible" : undefined}>
          {email ? "Notify Me When Available" : "Email Address Required"}
        </span>
        {pending && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          </span>
        )}
      </button>
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
