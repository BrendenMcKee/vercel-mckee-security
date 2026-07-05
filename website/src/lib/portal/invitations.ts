import "server-only";
import { createHash, randomBytes } from "crypto";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import type { Database } from "@/lib/portal/database.types";

type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/** Short-lived httpOnly cookie carrying the raw token across the Google OAuth round-trip (PORTAL_PLAN.md 6.4). */
export const ACTIVATION_COOKIE = "portal_activation_token";

export type InvitationValidation =
  | { state: "invalid" }
  | { state: "used" }
  | { state: "expired" }
  | { state: "valid"; invitation: InvitationRow; profile: ProfileRow };

/** Raw token goes in the activation link; only the hash is stored (R8). */
export function generateInvitationToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashInvitationToken(raw) };
}

export function hashInvitationToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Pre-session token validation (PORTAL_PLAN.md 6.3 step 1). Runs on the
 * service role because the visitor has no session yet. A token whose profile
 * is already linked or not pending counts as used even if `used_at` slipped.
 */
export async function validateInvitationToken(
  raw: string,
): Promise<InvitationValidation> {
  if (!raw || raw.length > 128) return { state: "invalid" };

  const admin = getPortalAdminClient();
  const { data: invitation, error } = await admin
    .from("invitations")
    .select("*")
    .eq("token_hash", hashInvitationToken(raw))
    .maybeSingle();

  if (error) throw new Error(`Invitation lookup failed: ${error.message}`);
  if (!invitation) return { state: "invalid" };
  if (invitation.used_at) return { state: "used" };
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    return { state: "expired" };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", invitation.profile_id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Invitation profile lookup failed: ${profileError.message}`);
  }
  if (!profile || profile.user_id || profile.status !== "pending") {
    return { state: "used" };
  }

  return { state: "valid", invitation, profile };
}
