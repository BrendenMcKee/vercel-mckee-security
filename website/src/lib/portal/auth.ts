import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import type { Tables } from "@/lib/portal/database.types";
import {
  PORTAL_SITE_COOKIE,
  PORTAL_SITE_HEADER,
  asSiteId,
} from "@/lib/portal/site-cookie";

export type PortalProfile = Tables<"profiles">;
export type PortalMembership = Tables<"account_members">;

export { PORTAL_SITE_COOKIE, asSiteId } from "@/lib/portal/site-cookie";

export type AuthUser = {
  id: string;
  email: string | null;
  /** Linked auth providers from JWT app_metadata (e.g. ["google"], ["email"]). */
  providers: string[];
};

export type AuthContext = {
  /** JWT-derived identity, null when signed out. */
  user: AuthUser | null;
  /** Selected site or staff profile. Null when signed out or orphaned. */
  profile: PortalProfile | null;
};

export type PortalSession =
  | { kind: "signed_out"; user: null }
  | { kind: "admin"; user: AuthUser; profile: PortalProfile }
  | { kind: "orphan"; user: AuthUser }
  | {
      kind: "client_disabled";
      user: AuthUser;
      memberships: PortalMembership[];
      sites: PortalProfile[];
      passwordSet: boolean;
    }
  | {
      kind: "client";
      user: AuthUser;
      memberships: PortalMembership[];
      sites: PortalProfile[];
      selectedSite: PortalProfile;
      isAccountAdmin: boolean;
      passwordSet: boolean;
    };

function userFromClaims(claims: {
  sub: string;
  email?: string;
  app_metadata?: { providers?: string[] };
}): AuthUser {
  return {
    id: claims.sub,
    email: claims.email ?? null,
    providers: claims.app_metadata?.providers ?? [],
  };
}

function pickSelectedSite(
  sites: PortalProfile[],
  preferredId: string | null,
  cookieId: string | null,
  homeId: string | null,
): PortalProfile | null {
  const active = sites.filter((site) => site.status !== "disabled");
  const pick = (id: string | null) =>
    id ? (active.find((site) => site.id === id) ?? null) : null;
  return pick(preferredId) ?? pick(cookieId) ?? pick(homeId) ?? active[0] ?? null;
}

function passwordSetFor(
  memberships: PortalMembership[],
  homeProfile: PortalProfile | null,
): boolean {
  if (memberships.some((row) => row.password_set_at)) return true;
  return Boolean(homeProfile?.password_set_at);
}

/**
 * Cookie / `?site=` are honored only when the member can access that site
 * and it is not disabled. Path `/` so server actions on any portal route
 * see it. httpOnly, Secure in production, SameSite=Lax.
 */
export async function persistSelectedSiteCookie(profileId: string): Promise<void> {
  const siteId = asSiteId(profileId);
  if (!siteId) return;
  const store = await cookies();
  store.set(PORTAL_SITE_COOKIE, siteId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

async function readSelectedSiteCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    return asSiteId(store.get(PORTAL_SITE_COOKIE)?.value);
  } catch {
    return null;
  }
}

/** Middleware copies a valid `?site=` onto this header for the same request. */
async function readSelectedSiteHeader(): Promise<string | null> {
  try {
    const store = await headers();
    return asSiteId(store.get(PORTAL_SITE_HEADER));
  } catch {
    return null;
  }
}

/**
 * One session helper for the client portal (R53 / docs/MULTI_SITE_ACCOUNTS.md
 * items 1, 12, 17, 23). Membership across accounts, selected site authorized,
 * leftover `profiles.user_id` is not the ACL.
 *
 * `preferredSiteId` is the `?site=` query (validated here). Cookie is read
 * when preferred is missing or not accessible.
 */
export const resolvePortalSession = cache(
  async (preferredSiteId?: string | null): Promise<PortalSession> => {
    const supabase = await createPortalServerClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;

    if (!claims?.sub) {
      return { kind: "signed_out", user: null };
    }

    const appMetadata = claims.app_metadata as { providers?: string[] } | undefined;
    const user = userFromClaims({
      sub: claims.sub,
      email: claims.email as string | undefined,
      app_metadata: appMetadata,
    });

    let { data: homeProfile, error: homeError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", claims.sub)
      .maybeSingle();

    if (homeError) {
      console.warn("[portal] profile read failed, retrying once:", homeError.message);
      ({ data: homeProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", claims.sub)
        .maybeSingle());
    }

    if (homeProfile?.role === "admin") {
      return { kind: "admin", user, profile: homeProfile };
    }

    const { data: memberships, error: memberError } = await supabase
      .from("account_members")
      .select("*")
      .eq("user_id", claims.sub);
    if (memberError) {
      console.warn("[portal] membership read failed:", memberError.message);
    }

    const rows = memberships ?? [];
    const accountIds = [...new Set(rows.map((row) => row.account_id))];

    let sites: PortalProfile[] = [];
    if (accountIds.length > 0) {
      const { data: siteRows, error: siteError } = await supabase
        .from("profiles")
        .select("*")
        .in("account_id", accountIds)
        .eq("role", "client");
      if (siteError) {
        console.warn("[portal] site read failed:", siteError.message);
      }
      sites = siteRows ?? [];
    }

    if (rows.length === 0 && !homeProfile) {
      return { kind: "orphan", user };
    }

    const cookieId = await readSelectedSiteCookie();
    const headerId = await readSelectedSiteHeader();
    const selected = pickSelectedSite(
      sites,
      asSiteId(preferredSiteId) ?? headerId,
      cookieId,
      homeProfile?.id ?? null,
    );
    const passwordSet = passwordSetFor(rows, homeProfile);

    if (!selected) {
      return {
        kind: "client_disabled",
        user,
        memberships: rows,
        sites,
        passwordSet,
      };
    }

    const selectedMembership = rows.find((row) => row.account_id === selected.account_id);

    return {
      kind: "client",
      user,
      memberships: rows,
      sites,
      selectedSite: selected,
      isAccountAdmin: selectedMembership?.role === "owner",
      passwordSet,
    };
  },
);

/**
 * Session + selected site (or staff profile) for the current request.
 * `getClaims()` verifies the JWT (PORTAL_PLAN.md R5); sites are a fresh DB
 * read, so role changes and disables apply immediately (R6).
 *
 * Wrapped in React cache: layout and page calls within one request share a
 * single execution.
 */
export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const session = await resolvePortalSession();
  if (session.kind === "signed_out") return { user: null, profile: null };
  if (session.kind === "admin") return { user: session.user, profile: session.profile };
  if (session.kind === "client") return { user: session.user, profile: session.selectedSite };
  return { user: session.user, profile: null };
});

/** For server actions available to any signed-in client with an active site. */
export async function requireUser(): Promise<{ user: AuthUser; profile: PortalProfile }> {
  const session = await resolvePortalSession();
  if (session.kind === "admin" && session.profile.status === "active") {
    return { user: session.user, profile: session.profile };
  }
  if (session.kind !== "client") {
    throw new Error("Not authenticated.");
  }
  return { user: session.user, profile: session.selectedSite };
}

/**
 * 404 unless this login can access `profileId` and the site is not disabled.
 * Staff (`is_admin`) may target any client site.
 */
export async function requireSelectedSite(
  profileId: string,
): Promise<{ user: AuthUser; profile: PortalProfile; isAccountAdmin: boolean }> {
  const siteId = asSiteId(profileId);
  if (!siteId) {
    throw new Error("Not found.");
  }

  const session = await resolvePortalSession();
  if (session.kind === "admin" && session.profile.status === "active") {
    const supabase = await createPortalServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", siteId)
      .eq("role", "client")
      .maybeSingle();
    if (!data || data.status === "disabled") {
      throw new Error("Not found.");
    }
    return { user: session.user, profile: data, isAccountAdmin: false };
  }

  if (session.kind !== "client") {
    throw new Error("Not authenticated.");
  }

  const site = session.sites.find((row) => row.id === siteId && row.status !== "disabled");
  if (!site) {
    throw new Error("Not found.");
  }
  const membership = session.memberships.find((row) => row.account_id === site.account_id);
  return {
    user: session.user,
    profile: site,
    isAccountAdmin: membership?.role === "owner",
  };
}

/**
 * For admin server actions and the admin layout gate. Fresh `profiles.role`
 * check per request (PORTAL_PLAN.md 6.5): demotions apply immediately.
 */
export async function requireAdmin(): Promise<{ user: AuthUser; profile: PortalProfile }> {
  const session = await resolvePortalSession();
  if (session.kind !== "admin" || session.profile.status !== "active") {
    throw new Error("Not authorized.");
  }
  return { user: session.user, profile: session.profile };
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
export async function tryRequireUser(): Promise<{ user: AuthUser; profile: PortalProfile } | null> {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}

export async function tryRequireAdmin(): Promise<{ user: AuthUser; profile: PortalProfile } | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

export async function tryRequireSelectedSite(
  profileId: string,
): Promise<{ user: AuthUser; profile: PortalProfile; isAccountAdmin: boolean } | null> {
  try {
    return await requireSelectedSite(profileId);
  } catch {
    return null;
  }
}

/**
 * Client writes that do not take a profileId: authorize the selected site
 * through requireSelectedSite so a later action cannot write a stale home row.
 */
export async function tryRequireClientSite(): Promise<{
  user: AuthUser;
  profile: PortalProfile;
  isAccountAdmin: boolean;
} | null> {
  const session = await resolvePortalSession();
  if (session.kind !== "client") return null;
  return tryRequireSelectedSite(session.selectedSite.id);
}
