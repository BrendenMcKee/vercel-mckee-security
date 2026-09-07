"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_ERROR_MESSAGE, tryRequireAdmin } from "@/lib/portal/auth";
import { attachSitesToAccount } from "@/lib/portal/grouping-attach";
import { countOpenGroupingSuggestions } from "@/lib/portal/grouping-refresh";
import { createPortalServerClient } from "@/lib/portal/supabase/server";

export type GroupingActionResult = { ok: true } | { ok: false; error: string };

const acceptSchema = z.object({
  suggestionId: z.uuid(),
  accountName: z.string().trim().min(2).max(200),
  profileIds: z.array(z.uuid()).min(2),
});

async function revalidateGrouping() {
  revalidatePath("/admin-dashboard", "layout");
}

/**
 * Attach the checked sites on an open suggestion. Names the account, expires
 * unused per-site invites, and turns automatic onboarding off. No email.
 */
export async function acceptGroupingSuggestionAction(input: {
  suggestionId: string;
  accountName: string;
  profileIds: string[];
}): Promise<GroupingActionResult> {
  const auth = await tryRequireAdmin();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createPortalServerClient();
  const { data: suggestion, error: loadError } = await supabase
    .from("account_group_suggestions")
    .select("id, status, account_group_suggestion_sites(profile_id)")
    .eq("id", parsed.data.suggestionId)
    .maybeSingle();
  if (loadError) {
    console.error("[portal] grouping accept load failed:", loadError);
    return { ok: false, error: "Could not load that suggestion. Please try again." };
  }
  if (!suggestion || suggestion.status !== "open") {
    return { ok: false, error: "That suggestion is no longer open." };
  }

  const allowed = new Set((suggestion.account_group_suggestion_sites ?? []).map((row) => row.profile_id));
  if (parsed.data.profileIds.some((id) => !allowed.has(id))) {
    return { ok: false, error: "A selected site is not on that suggestion." };
  }

  const attached = await attachSitesToAccount(supabase, {
    profileIds: parsed.data.profileIds,
    accountName: parsed.data.accountName,
  });
  if (!attached.ok) return attached;

  const now = new Date().toISOString();
  const { error: closeError } = await supabase
    .from("account_group_suggestions")
    .update({
      status: "accepted",
      suggested_name: parsed.data.accountName.trim().replace(/\s+/g, " "),
      accepted_account_id: attached.accountId,
      reviewed_at: now,
      reviewed_by: auth.user.id,
    })
    .eq("id", suggestion.id)
    .eq("status", "open");
  if (closeError) {
    console.error("[portal] grouping accept close failed:", closeError);
    return { ok: false, error: "Sites were linked, but the suggestion could not be closed. Refresh the board." };
  }

  await revalidateGrouping();
  return { ok: true };
}

/**
 * Dismiss an open suggestion. The same fingerprint does not come back.
 */
export async function rejectGroupingSuggestionAction(input: {
  suggestionId: string;
}): Promise<GroupingActionResult> {
  const auth = await tryRequireAdmin();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  if (!z.uuid().safeParse(input.suggestionId).success) {
    return { ok: false, error: "Suggestion not found." };
  }

  const supabase = await createPortalServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("account_group_suggestions")
    .update({
      status: "rejected",
      reviewed_at: now,
      reviewed_by: auth.user.id,
    })
    .eq("id", input.suggestionId)
    .eq("status", "open")
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[portal] grouping reject failed:", error);
    return { ok: false, error: "Could not reject that suggestion. Please try again." };
  }
  if (!data) return { ok: false, error: "That suggestion is no longer open." };

  await revalidateGrouping();
  return { ok: true };
}

/**
 * Record that a person walked the queue. Allowed only when nothing is open.
 * GO LIVE reads this timestamp.
 */
export async function signOffGroupingAction(): Promise<GroupingActionResult> {
  const auth = await tryRequireAdmin();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const supabase = await createPortalServerClient();
  const openCount = await countOpenGroupingSuggestions(supabase);
  if (openCount > 0) {
    return {
      ok: false,
      error: "Finish every open suggestion first. Accept or reject each one, then sign off.",
    };
  }

  const { data, error } = await supabase
    .from("portal_settings")
    .update({ org_grouping_reviewed_at: new Date().toISOString() })
    .eq("id", 1)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[portal] grouping sign-off failed:", error);
    return { ok: false, error: "Could not save grouping sign-off. Please try again." };
  }

  await revalidateGrouping();
  return { ok: true };
}
