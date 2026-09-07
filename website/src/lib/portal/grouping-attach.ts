import "server-only";

import type { createPortalServerClient } from "@/lib/portal/supabase/server";

type PortalClient = Awaited<ReturnType<typeof createPortalServerClient>>;

export const TWO_ACCOUNT_ADMINS_MESSAGE =
  "These sites already have two Account admins. Keep them on separate accounts, or transfer so there is one Account admin, then try again.";

type MemberRow = {
  account_id: string;
  email: string;
  role: string;
  user_id: string | null;
  password_set_at: string | null;
};

type SiteRow = {
  id: string;
  account_id: string | null;
  email: string | null;
  user_id: string | null;
};

function ownerKey(row: { user_id: string | null; email: string }): string {
  return row.user_id ?? row.email.trim().toLowerCase();
}

/**
 * Link selected sites onto one account. Members move first so emptying a
 * source account does not cascade-delete people. Unused site invites expire.
 * auto_onboard turns off. Does not send mail.
 */
export async function attachSitesToAccount(
  supabase: PortalClient,
  input: {
    profileIds: string[];
    accountName: string;
  },
): Promise<{ ok: true; accountId: string } | { ok: false; error: string }> {
  const name = input.accountName.trim().replace(/\s+/g, " ");
  const profileIds = [...new Set(input.profileIds)];
  if (name.length < 2) {
    return { ok: false, error: "Enter an account name." };
  }
  if (profileIds.length < 2) {
    return { ok: false, error: "Select at least two sites to link." };
  }

  const { data: sites, error: sitesError } = await supabase
    .from("profiles")
    .select("id, account_id, email, user_id")
    .eq("role", "client")
    .in("id", profileIds);
  if (sitesError || !sites || sites.length !== profileIds.length) {
    console.error("[portal] grouping attach sites failed:", sitesError);
    return { ok: false, error: "Could not load those sites. Please try again." };
  }

  const sourceAccountIds = [
    ...new Set(sites.map((site) => site.account_id).filter((id): id is string => Boolean(id))),
  ];
  if (sourceAccountIds.length === 0) {
    return { ok: false, error: "Those sites have no account to link." };
  }

  const [{ data: siteCounts, error: countError }, { data: members, error: membersError }] =
    await Promise.all([
      supabase.from("profiles").select("id, account_id").eq("role", "client").in("account_id", sourceAccountIds),
      supabase
        .from("account_members")
        .select("account_id, email, role, user_id, password_set_at")
        .in("account_id", sourceAccountIds),
    ]);
  if (countError || membersError || !siteCounts || !members) {
    console.error("[portal] grouping attach account state failed:", countError ?? membersError);
    return { ok: false, error: "Could not load those accounts. Please try again." };
  }

  const owners = members.filter((row) => row.role === "owner");
  const distinctOwners = new Set(owners.map(ownerKey));
  if (distinctOwners.size > 1) {
    return { ok: false, error: TWO_ACCOUNT_ADMINS_MESSAGE };
  }

  const countByAccount = new Map<string, number>();
  for (const row of siteCounts) {
    if (!row.account_id) continue;
    countByAccount.set(row.account_id, (countByAccount.get(row.account_id) ?? 0) + 1);
  }

  const targetId = pickTargetAccountId(sourceAccountIds, countByAccount, members);
  let accountId = targetId;
  let createdAccount = false;

  if (!accountId) {
    const { data: created, error: createError } = await supabase
      .from("accounts")
      .insert({ name, auto_onboard: false })
      .select("id")
      .single();
    if (createError || !created) {
      console.error("[portal] grouping create account failed:", createError);
      return { ok: false, error: "Could not create the account. Please try again." };
    }
    accountId = created.id;
    createdAccount = true;
  } else {
    const { error: updateAccountError } = await supabase
      .from("accounts")
      .update({ name, auto_onboard: false })
      .eq("id", accountId);
    if (updateAccountError) {
      console.error("[portal] grouping rename account failed:", updateAccountError);
      return { ok: false, error: "Could not update the account. Please try again." };
    }
  }

  const migrated = await migrateMembersToAccount(supabase, {
    targetAccountId: accountId,
    members,
    sites,
  });
  if (!migrated.ok) {
    if (createdAccount) {
      await supabase.from("accounts").delete().eq("id", accountId);
    }
    return migrated;
  }

  const { error: moveError } = await supabase
    .from("profiles")
    .update({ account_id: accountId })
    .in("id", profileIds);
  if (moveError) {
    console.error("[portal] grouping move sites failed:", moveError);
    if (createdAccount) {
      await supabase.from("accounts").delete().eq("id", accountId);
    }
    return { ok: false, error: "Could not link the sites. Please try again." };
  }

  const now = new Date().toISOString();
  const { error: expireError } = await supabase
    .from("invitations")
    .update({ expires_at: now })
    .in("profile_id", profileIds)
    .is("used_at", null);
  if (expireError) {
    console.error("[portal] grouping expire invites failed:", expireError);
  }

  return { ok: true, accountId };
}

function pickTargetAccountId(
  sourceAccountIds: string[],
  countByAccount: Map<string, number>,
  members: MemberRow[],
): string | null {
  const multi = sourceAccountIds.filter((id) => (countByAccount.get(id) ?? 0) >= 2);
  if (multi.length === 1) return multi[0]!;
  if (multi.length > 1) {
    const withOwner = multi.find((id) => members.some((row) => row.account_id === id && row.role === "owner"));
    return withOwner ?? multi[0]!;
  }

  const ownerAccounts = sourceAccountIds.filter((id) =>
    members.some((row) => row.account_id === id && row.role === "owner"),
  );
  if (ownerAccounts.length === 1) return ownerAccounts[0]!;
  return null;
}

async function migrateMembersToAccount(
  supabase: PortalClient,
  input: { targetAccountId: string; members: MemberRow[]; sites: SiteRow[] },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing, error: existingError } = await supabase
    .from("account_members")
    .select("email, user_id, role")
    .eq("account_id", input.targetAccountId);
  if (existingError || !existing) {
    console.error("[portal] grouping target members failed:", existingError);
    return { ok: false, error: "Could not load people on that account. Please try again." };
  }

  const takenEmail = new Set(existing.map((row) => row.email.trim().toLowerCase()));
  const takenUser = new Set(existing.map((row) => row.user_id).filter((id): id is string => Boolean(id)));
  let targetHasOwner = existing.some((row) => row.role === "owner");
  const soleOwnerKey = (() => {
    const owners = input.members.filter((row) => row.role === "owner");
    const keys = new Set(owners.map(ownerKey));
    return keys.size === 1 ? [...keys][0]! : null;
  })();

  const toInsert: Array<{
    account_id: string;
    email: string;
    role: "owner" | "member";
    user_id: string | null;
    password_set_at: string | null;
  }> = [];

  function consider(person: {
    email: string;
    user_id: string | null;
    role: string;
    password_set_at: string | null;
  }) {
    const email = person.email.trim();
    if (!email) return;
    const emailKey = email.toLowerCase();
    if (takenEmail.has(emailKey) || (person.user_id && takenUser.has(person.user_id))) return;
    takenEmail.add(emailKey);
    if (person.user_id) takenUser.add(person.user_id);
    const isSoleOwner = soleOwnerKey != null && ownerKey(person) === soleOwnerKey && !targetHasOwner;
    toInsert.push({
      account_id: input.targetAccountId,
      email,
      role: isSoleOwner ? "owner" : "member",
      user_id: person.user_id,
      password_set_at: person.password_set_at,
    });
    if (isSoleOwner) targetHasOwner = true;
  }

  for (const member of input.members) {
    if (member.account_id === input.targetAccountId) continue;
    consider(member);
  }

  for (const site of input.sites) {
    if (!site.user_id || !site.email) continue;
    consider({
      email: site.email,
      user_id: site.user_id,
      role: "member",
      password_set_at: null,
    });
  }

  if (toInsert.length === 0) return { ok: true };

  const { error: insertError } = await supabase.from("account_members").insert(toInsert);
  if (insertError) {
    console.error("[portal] grouping member migrate failed:", insertError);
    if (insertError.code === "23505") {
      return { ok: false, error: TWO_ACCOUNT_ADMINS_MESSAGE };
    }
    return { ok: false, error: "Could not move people onto the account. Please try again." };
  }
  return { ok: true };
}
