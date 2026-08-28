import "server-only";

import { getPortalAdminClient } from "@/lib/portal/supabase/admin";

/**
 * First-owner activation: ensure this site's account has an owner member
 * for the newly linked Auth user. Extra-member invites never call this.
 */
export async function upsertOwnerMember(input: {
  profileId: string;
  userId: string;
  email: string | null;
  passwordSetAt?: string | null;
}): Promise<void> {
  const admin = getPortalAdminClient();
  const { data: site, error: siteError } = await admin
    .from("profiles")
    .select("account_id, email")
    .eq("id", input.profileId)
    .maybeSingle();
  if (siteError || !site?.account_id) {
    console.error("[portal] Owner member upsert skipped: no account_id", siteError);
    return;
  }

  const email =
    input.email?.trim() ||
    site.email?.trim() ||
    `${input.userId}@pending.invalid`;

  const { data: existing, error: existingError } = await admin
    .from("account_members")
    .select("id, user_id")
    .eq("account_id", site.account_id)
    .eq("role", "owner")
    .maybeSingle();
  if (existingError) {
    console.error("[portal] Owner member lookup failed:", existingError);
    return;
  }

  if (existing) {
    if (existing.user_id && existing.user_id !== input.userId) return;
    const { error: updateError } = await admin
      .from("account_members")
      .update({
        user_id: input.userId,
        email,
        ...(input.passwordSetAt ? { password_set_at: input.passwordSetAt } : {}),
      })
      .eq("id", existing.id);
    if (updateError) {
      console.error("[portal] Owner member update failed:", updateError);
    }
    return;
  }

  const { error: insertError } = await admin.from("account_members").insert({
    account_id: site.account_id,
    user_id: input.userId,
    email,
    role: "owner",
    password_set_at: input.passwordSetAt ?? null,
  });
  if (insertError) {
    console.error("[portal] Owner member insert failed:", insertError);
  }
}
