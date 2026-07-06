"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_ERROR_MESSAGE, tryRequireAdmin } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";

export type ResolveAlertResult = { ok: true } | { ok: false; error: string };

/**
 * Marks an operational alert handled (PORTAL_PLAN.md Phase 7). Runs on the
 * user-context client: the admin RLS UPDATE policy is the authorization.
 * Alerts are never deleted; resolution is a stamp, not an erase.
 */
export async function resolveAlertAction(alertId: string): Promise<ResolveAlertResult> {
  const auth = await tryRequireAdmin();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  const { user } = auth;

  if (!z.uuid().safeParse(alertId).success) {
    return { ok: false, error: "Invalid alert." };
  }

  const supabase = await createPortalServerClient();
  const { error } = await supabase
    .from("portal_alerts")
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq("id", alertId)
    .is("resolved_at", null);

  if (error) {
    console.error("[portal] resolveAlert failed:", error);
    return { ok: false, error: "Could not resolve the alert. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}
