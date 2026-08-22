"use server";

import { revalidatePath } from "next/cache";
import { SESSION_ERROR_MESSAGE, tryRequireAdmin } from "@/lib/portal/auth";
import { CLIENT_MAIL_GO_LIVE_PHRASE } from "@/lib/portal/client-mail-phrase";
import { createPortalServerClient } from "@/lib/portal/supabase/server";

export type SetClientMailResult = { ok: true; enabled: boolean } | { ok: false; error: string };

/**
 * 8C human flip (PORTAL_PLAN.md 9.5.5). Enabling requires the exact
 * GO LIVE phrase so a stray click during import cannot start customer mail.
 * Pausing needs no phrase. RLS UPDATE is the authorization.
 */
export async function setClientMailEnabledAction(input: {
  enabled: boolean;
  confirmPhrase?: string;
}): Promise<SetClientMailResult> {
  const auth = await tryRequireAdmin();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  const { user } = auth;

  if (input.enabled && input.confirmPhrase?.trim() !== CLIENT_MAIL_GO_LIVE_PHRASE) {
    return { ok: false, error: `Type ${CLIENT_MAIL_GO_LIVE_PHRASE} exactly to turn on client email.` };
  }

  const now = new Date().toISOString();
  const supabase = await createPortalServerClient();
  const { data, error } = await supabase
    .from("portal_settings")
    .update(
      input.enabled
        ? {
            client_mail_enabled: true,
            client_mail_enabled_at: now,
            client_mail_enabled_by: user.id,
          }
        : {
            client_mail_enabled: false,
            client_mail_enabled_at: null,
            client_mail_enabled_by: null,
          },
    )
    .eq("id", 1)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[portal] setClientMailEnabled failed:", error);
    return { ok: false, error: "Could not update the client-email setting. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true, enabled: input.enabled };
}
