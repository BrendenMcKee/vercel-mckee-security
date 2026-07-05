import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/portal/database.types";

/**
 * Per-request Supabase client for Server Components, Server Actions, and
 * Route Handlers in the portal. Uses the publishable key, so every query is
 * subject to RLS under the signed-in user's identity.
 *
 * Always create a fresh client per request (never module-level): it is bound
 * to the request's cookies.
 */
export async function createPortalServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot write cookies. Safe to ignore because
            // src/proxy.ts refreshes sessions and persists cookies for portal
            // routes before render.
          }
        },
      },
    },
  );
}
