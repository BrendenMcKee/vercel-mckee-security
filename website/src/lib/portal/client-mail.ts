import "server-only";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";

export { CLIENT_MAIL_GO_LIVE_PHRASE } from "@/lib/portal/client-mail-phrase";

/**
 * Fail closed: a missing row or a read error means no client mail.
 * Cron, webhooks, and admin actions all go through this so import cannot
 * leak invitations or due-date reminders before the 8C flip.
 */
export async function isClientMailEnabled(): Promise<boolean> {
  try {
    const { data, error } = await getPortalAdminClient()
      .from("portal_settings")
      .select("client_mail_enabled")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      console.error("[portal] portal_settings read failed (client mail stays off):", error);
      return false;
    }
    return data?.client_mail_enabled === true;
  } catch (error) {
    console.error("[portal] portal_settings read failed (client mail stays off):", error);
    return false;
  }
}
