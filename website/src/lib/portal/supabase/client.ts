"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/portal/database.types";

/**
 * Browser Supabase client for portal client components (sign-in forms, OAuth
 * triggers). Publishable key only; all data access is RLS-scoped.
 */
export function createPortalBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
