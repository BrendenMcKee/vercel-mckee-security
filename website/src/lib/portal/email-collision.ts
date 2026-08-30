import { accountNameFromEmbed } from "@/lib/portal/account-list";
import type { createPortalServerClient } from "@/lib/portal/supabase/server";

export type EmailCollision = {
  accountId: string;
  accountName: string;
};

type CollisionClient = Awaited<ReturnType<typeof createPortalServerClient>>;

function asAccountName(
  accounts: { name: string } | { name: string }[] | null | undefined,
): string {
  return accountNameFromEmbed(accounts);
}

/** Exact case-insensitive match. Do not pass raw input to ilike (wildcards). */
function escapeIlikeExact(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * New client must not silently create a second login when the typed email
 * already belongs to a member or a site contact. Prefer the member account
 * (that is the login) when both exist. Uses limit(1) not maybeSingle so two
 * sites that share a contact email do not fail the lookup.
 */
export async function findEmailCollision(
  supabase: CollisionClient,
  email: string,
): Promise<{ ok: true; collision: EmailCollision | null } | { ok: false }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: true, collision: null };
  const exact = escapeIlikeExact(normalized);

  const [memberResult, siteResult] = await Promise.all([
    supabase
      .from("account_members")
      .select("account_id, accounts(name)")
      .ilike("email", exact)
      .limit(1),
    supabase
      .from("profiles")
      .select("account_id, accounts(name)")
      .eq("role", "client")
      .ilike("email", exact)
      .not("account_id", "is", null)
      .limit(1),
  ]);

  if (memberResult.error || siteResult.error) {
    console.error(
      "[portal] email collision lookup failed:",
      memberResult.error ?? siteResult.error,
    );
    return { ok: false };
  }

  const member = memberResult.data?.[0];
  if (member?.account_id) {
    return {
      ok: true,
      collision: {
        accountId: member.account_id,
        accountName: asAccountName(member.accounts),
      },
    };
  }

  const site = siteResult.data?.[0];
  if (site?.account_id) {
    return {
      ok: true,
      collision: {
        accountId: site.account_id,
        accountName: asAccountName(site.accounts),
      },
    };
  }

  return { ok: true, collision: null };
}
