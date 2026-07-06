import "server-only";
import { getPortalAdminClient, isPortalAdminConfigured } from "@/lib/portal/supabase/admin";

export type AlertKind = "email_failure" | "cron_failure";

/**
 * Operational alert surface (PORTAL_PLAN.md Phase 7, handover 22.3): failures
 * that would otherwise only live in server logs (email sends, cron runs) are
 * written where an admin will actually see them — the Alerts tab. Best-effort
 * by design: recording an alert must never take down the operation that was
 * trying to report a problem.
 */
export async function recordPortalAlert(
  kind: AlertKind,
  message: string,
  context: Record<string, unknown> = {},
): Promise<void> {
  try {
    if (!isPortalAdminConfigured()) return;
    const admin = getPortalAdminClient();
    const { error } = await admin.from("portal_alerts").insert({
      kind,
      message,
      context: JSON.parse(JSON.stringify(context)),
    });
    if (error) console.error("[portal] recordPortalAlert failed:", error);
  } catch (error) {
    console.error("[portal] recordPortalAlert threw:", error);
  }
}
