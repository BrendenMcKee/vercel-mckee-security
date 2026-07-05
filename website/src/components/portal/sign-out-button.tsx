"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortalBrowserClient } from "@/lib/portal/supabase/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const supabase = createPortalBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className={
        className ??
        "cursor-pointer rounded-xl border border-white/20 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:border-white/50 hover:bg-white/5 disabled:cursor-default disabled:opacity-50"
      }
    >
      {pending ? "Signing out..." : "Sign Out"}
    </button>
  );
}
