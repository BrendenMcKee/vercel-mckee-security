import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/portal/database.types";

/**
 * Server-only service-role Supabase client for the portal.
 *
 * Bypasses RLS, so its use is restricted by convention (PORTAL_PLAN.md R13) to:
 * - auth.admin operations (activation user creation, admin seeding)
 * - invitation validation before a session exists
 * - Stripe webhook and cron contexts
 *
 * Mirrors the Starlink admin pattern: lazy creation so a missing env var does
 * not crash unrelated routes, `server-only` so a client-component import fails
 * the build.
 */

let cached: SupabaseClient<Database> | null = null;

export function isPortalAdminConfigured(): boolean {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getPortalAdminClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Portal admin client is not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  if (!cached) {
    cached = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return cached;
}
