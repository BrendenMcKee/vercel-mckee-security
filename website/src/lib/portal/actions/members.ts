"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LAST_OWNER_REVOKE_MESSAGE } from "@/lib/portal/account-roles";
import {
  SESSION_ERROR_MESSAGE,
  resolvePortalSession,
  tryRequireAdmin,
} from "@/lib/portal/auth";
import { hasLinkedPortalLogin } from "@/lib/portal/has-linked-login";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/portal/rate-limit";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";

export type RevokeAccountMemberResult = { ok: true } | { ok: false; error: string };

const NOT_FOUND = "Person not found.";

/**
 * Drop one person from an account. Sites stay. Staff or the Account admin
 * on that account may call this. The last Account admin cannot be revoked
 * (transfer first). Leftover `profiles.user_id` on this account is cleared.
 * Auth is deleted only when they have no remaining membership and no
 * remaining home pointer. A failed leftover lookup does not delete Auth.
 */
export async function revokeAccountMemberAction(input: {
  memberId: string;
}): Promise<RevokeAccountMemberResult> {
  const staff = await tryRequireAdmin();
  const session = staff ? null : await resolvePortalSession();
  if (!staff && session?.kind !== "client") {
    return { ok: false, error: SESSION_ERROR_MESSAGE };
  }

  if (!(await checkRateLimit("member-revoke", 10, 3600))) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  if (!z.uuid().safeParse(input.memberId).success) {
    return { ok: false, error: NOT_FOUND };
  }

  const admin = getPortalAdminClient();
  const { data: member, error: memberError } = await admin
    .from("account_members")
    .select("id, account_id, role, user_id, email")
    .eq("id", input.memberId)
    .maybeSingle();
  if (memberError) {
    console.error("[portal] revoke member lookup failed:", memberError);
    return { ok: false, error: "Could not load that person. Please try again." };
  }
  if (!member || (member.role !== "owner" && member.role !== "member")) {
    return { ok: false, error: NOT_FOUND };
  }

  if (!staff) {
    if (session?.kind !== "client") {
      return { ok: false, error: SESSION_ERROR_MESSAGE };
    }
    const mine = session.memberships.find(
      (row) => row.account_id === member.account_id && row.role === "owner",
    );
    if (!mine) {
      return { ok: false, error: NOT_FOUND };
    }
  }

  if (member.role === "owner") {
    const { count, error: ownerCountError } = await admin
      .from("account_members")
      .select("id", { count: "exact", head: true })
      .eq("account_id", member.account_id)
      .eq("role", "owner");
    if (ownerCountError) {
      console.error("[portal] last-owner count failed:", ownerCountError);
      return { ok: false, error: "Could not check who is Account admin. Please try again." };
    }
    if ((count ?? 0) <= 1) {
      return { ok: false, error: LAST_OWNER_REVOKE_MESSAGE };
    }
  }

  const loginId = member.user_id;
  const { error: deleteError } = await admin.from("account_members").delete().eq("id", member.id);
  if (deleteError) {
    console.error("[portal] revoke member delete failed:", deleteError);
    return { ok: false, error: "Could not revoke access. Please try again." };
  }

  if (loginId) {
    const { error: homeClearError } = await admin
      .from("profiles")
      .update({ user_id: null })
      .eq("user_id", loginId)
      .eq("account_id", member.account_id);
    if (homeClearError) {
      console.error("[portal] leftover home user_id clear failed:", homeClearError);
    }

    const leftover = await hasLinkedPortalLogin(admin, loginId);
    if (!leftover.lookupFailed && !leftover.linked) {
      const { error: authError } = await admin.auth.admin.deleteUser(loginId);
      if (authError) {
        console.error("[portal] revoke leftover auth cleanup failed:", authError);
      }
    } else if (leftover.lookupFailed) {
      console.error("[portal] revoke leftover-login lookup failed; Auth user kept");
    }
  }

  revalidatePath("/admin-dashboard", "layout");
  revalidatePath("/user-dashboard", "layout");
  return { ok: true };
}
