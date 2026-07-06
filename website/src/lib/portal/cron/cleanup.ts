import "server-only";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";

export type CleanupSummary = {
  orphanUsersDeleted: number;
  invitationsDeleted: number;
  rateLimitRowsDeleted: number;
};

/**
 * Hygiene job (PORTAL_PLAN.md 6.6/9.4):
 *  - auth users older than 7 days with no linked profile (orphans from
 *    abandoned Google sign-ins) are deleted;
 *  - expired unused invitations are kept 90 days for audit, then deleted;
 *  - rate-limit counter rows older than a day are purged.
 */
export async function runCleanupJob(): Promise<CleanupSummary> {
  const admin = getPortalAdminClient();

  // Orphan auth users: collect linked user ids first, then walk the auth
  // user list (paged; the platform's user count is small by design).
  const { data: linkedProfiles, error: profilesError } = await admin
    .from("profiles")
    .select("user_id")
    .not("user_id", "is", null);
  if (profilesError) throw new Error(`cleanup profiles query failed: ${profilesError.message}`);
  const linkedIds = new Set((linkedProfiles ?? []).map((p) => p.user_id));

  const cutoff = Date.now() - 7 * 86_400_000;
  let orphanUsersDeleted = 0;
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`cleanup listUsers failed: ${error.message}`);
    for (const user of data.users) {
      const createdAt = new Date(user.created_at).getTime();
      if (!linkedIds.has(user.id) && createdAt < cutoff) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error("[portal] orphan user delete failed:", user.id, deleteError);
        } else {
          orphanUsersDeleted += 1;
        }
      }
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  // Invitations: expired, never used, and past the 90-day audit window.
  const auditCutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: deletedInvites, error: invitesError } = await admin
    .from("invitations")
    .delete()
    .is("used_at", null)
    .lt("expires_at", auditCutoff)
    .select("id");
  if (invitesError) throw new Error(`cleanup invitations failed: ${invitesError.message}`);

  const { data: rateLimitRowsDeleted, error: rateLimitError } = await admin.rpc(
    "cleanup_rate_limits",
  );
  if (rateLimitError) throw new Error(`cleanup rate limits failed: ${rateLimitError.message}`);

  return {
    orphanUsersDeleted,
    invitationsDeleted: (deletedInvites ?? []).length,
    rateLimitRowsDeleted: rateLimitRowsDeleted ?? 0,
  };
}
