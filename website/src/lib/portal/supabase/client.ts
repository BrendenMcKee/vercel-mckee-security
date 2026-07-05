"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client for portal client components (sign-in forms, OAuth
 * triggers). Publishable key only; all data access is RLS-scoped.
 */
export function createPortalBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
