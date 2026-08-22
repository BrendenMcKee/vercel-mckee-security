import "server-only";

import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { companyFilesMatch, displayCompanyFile } from "@/lib/portal/qb/company-file";
import type { AuthorizedQbBridge } from "@/lib/portal/qb/auth";
import type { QbHeartbeat } from "@/lib/portal/qb/schemas";
import type { TablesUpdate } from "@/lib/portal/database.types";

export type FileGuard =
  | { ok: true; match: boolean | null }
  | { ok: false; status: 409; error: string; expected: string; reported: string | null };

/**
 * Wrong-file guard (PORTAL_PLAN.md 9.5.7). Live refuses poll/mirror on
 * mismatch or a missing path. Sandbox still accepts poll so the bridge can
 * learn the expected path; mirror ingest is refused separately.
 */
export function evaluateCompanyFile(
  bridge: AuthorizedQbBridge,
  reported: string | null | undefined,
  options: { requireForLive: boolean },
): FileGuard {
  const match = companyFilesMatch(bridge.expected_company_file, reported);
  // Anything other than sandbox is treated as live (fail closed).
  if (bridge.mode !== "sandbox") {
    if (options.requireForLive && match == null) {
      return {
        ok: false,
        status: 409,
        error: "company_file_required",
        expected: bridge.expected_company_file,
        reported: reported ?? null,
      };
    }
    if (match === false) {
      return {
        ok: false,
        status: 409,
        error: "company_file_mismatch",
        expected: bridge.expected_company_file,
        reported: reported ?? null,
      };
    }
  }
  return { ok: true, match };
}

export async function stampBridgeSeen(
  bridgeId: string,
  heartbeat: QbHeartbeat,
  extra: { last_error?: string | null; last_mirror_at?: string } = {},
): Promise<void> {
  const admin = getPortalAdminClient();
  const patch: TablesUpdate<"qb_bridges"> = {
    last_seen_at: new Date().toISOString(),
  };
  if (heartbeat.company_file != null) {
    patch.qb_company_file = displayCompanyFile(heartbeat.company_file);
  }
  if (heartbeat.company_name != null) patch.qb_company_name = heartbeat.company_name;
  if (heartbeat.qb_version != null) patch.qb_version = heartbeat.qb_version;
  if ("last_error" in extra) {
    patch.last_error = extra.last_error ?? null;
  } else if (heartbeat.error != null) {
    patch.last_error = heartbeat.error;
  }
  if (extra.last_mirror_at) patch.last_mirror_at = extra.last_mirror_at;

  const { error } = await admin.from("qb_bridges").update(patch).eq("id", bridgeId);
  if (error) {
    console.error("[qb] bridge heartbeat update failed:", error);
    throw new Error("Failed to update bridge heartbeat.");
  }
}

export function mismatchErrorMessage(expected: string, reported: string | null): string {
  return `Open company file does not match expected path. expected=${expected} reported=${reported ?? "(none)"}`;
}
