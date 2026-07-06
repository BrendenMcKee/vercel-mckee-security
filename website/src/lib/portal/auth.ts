import "server-only";

import { cache } from "react";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import type { Tables } from "@/lib/portal/database.types";

export type PortalProfile = Tables<"profiles">;

export type AuthContext = {
  /** JWT-derived identity, null when signed out. */
  user: {
    id: string;
    email: string | null;
    /** Linked auth providers from JWT app_metadata (e.g. ["google"], ["email"]). */
    providers: string[];
  } | null;
  /** Linked profile row (RLS: own row only), null when signed out or orphaned. */
  profile: PortalProfile | null;
};

/**
 * Session + profile for the current request. `getClaims()` verifies the JWT
 * (PORTAL_PLAN.md R5); the profile is a fresh DB read, so role changes and
 * disables apply immediately (R6), never trusting JWT metadata for roles.
 *
 * Wrapped in React cache: layout and page calls within one request share a
 * single execution.
 */
export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createPortalServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    return { user: null, profile: null };
  }

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", claims.sub)
    .maybeSingle();

  // A transient read failure here would cascade into requireUser/requireAdmin
  // throwing and the whole page hitting its error boundary, so retry once
  // before giving up (observed during Supabase platform blips).
  if (profileError) {
    console.warn("[portal] profile read failed, retrying once:", profileError.message);
    ({ data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", claims.sub)
      .maybeSingle());
  }

  const appMetadata = claims.app_metadata as { providers?: string[] } | undefined;

  return {
    user: {
      id: claims.sub,
      email: (claims.email as string | undefined) ?? null,
      providers: appMetadata?.providers ?? [],
    },
    profile: profile ?? null,
  };
});

/** For server actions available to any signed-in client with a linked profile. */
export async function requireUser(): Promise<{ user: NonNullable<AuthContext["user"]>; profile: PortalProfile }> {
  const { user, profile } = await getAuthContext();
  if (!user || !profile || profile.status === "disabled") {
    throw new Error("Not authenticated.");
  }
  return { user, profile };
}

/**
 * For admin server actions and the admin layout gate. Fresh `profiles.role`
 * check per request (PORTAL_PLAN.md 6.5): demotions apply immediately.
 */
export async function requireAdmin(): Promise<{ user: NonNullable<AuthContext["user"]>; profile: PortalProfile }> {
  const { user, profile } = await getAuthContext();
  if (!user || !profile || profile.role !== "admin" || profile.status !== "active") {
    throw new Error("Not authorized.");
  }
  return { user, profile };
}

/**
 * Shown when a server action is invoked with a stale/expired session. Kept
 * friendly because it reaches end users verbatim.
 */
export const SESSION_ERROR_MESSAGE =
  "Your sign-in session needs a refresh. Reload the page and try again.";

/**
 * Non-throwing variants for server actions: a stale session or a transient
 * auth read becomes an inline `{ ok: false }` error in the form that
 * triggered it, never a full-page error boundary ("Something went wrong /
 * This section failed to load").
 */
export async function tryRequireUser(): Promise<{ user: NonNullable<AuthContext["user"]>; profile: PortalProfile } | null> {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}

export async function tryRequireAdmin(): Promise<{ user: NonNullable<AuthContext["user"]>; profile: PortalProfile } | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}
