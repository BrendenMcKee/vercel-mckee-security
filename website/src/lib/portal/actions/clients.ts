"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireAdmin } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { generateInvitationToken } from "@/lib/portal/invitations";
import { sendInvitationEmail } from "@/lib/portal/emails";
import { siteConfig } from "@/lib/site-config";

const createClientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"))]),
  address: z.string().trim().max(300),
  monitoringTier: z.enum(["", "basic", "standard", "pro"]),
  cloudTier: z.enum(["", "7day", "30day", "90day"]),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export type CreateClientResult =
  | {
      ok: true;
      profileId: string;
      /** Shown once in the admin UI for manual delivery / copy. */
      activateUrl: string;
      emailSent: boolean;
      emailAttempted: boolean;
    }
  | { ok: false; error: string };

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return siteConfig.url;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Admin creates a client (PORTAL_PLAN.md 6.2): profile + services + invitation
 * atomically via the admin_create_client RPC (SECURITY INVOKER: the caller's
 * admin RLS policies authorize the inserts). Email failures never roll back
 * the created client; the admin gets the link to deliver manually.
 */
export async function createClientAction(
  input: CreateClientInput,
): Promise<CreateClientResult> {
  await requireAdmin();

  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { firstName, lastName, email, address, monitoringTier, cloudTier } = parsed.data;

  const { raw, hash } = generateInvitationToken();
  const supabase = await createPortalServerClient();

  const { data: profileId, error } = await supabase.rpc("admin_create_client", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: email || "",
    p_address: address || "",
    p_monitoring_tier: monitoringTier,
    p_cloud_tier: cloudTier,
    p_token_hash: hash,
    p_target_email: email || "",
  });

  if (error || !profileId) {
    console.error("[portal] createClient failed:", error);
    return { ok: false, error: "Could not create the client. Please try again." };
  }

  const activateUrl = `${await getOrigin()}/account/activate?token=${raw}`;

  let emailSent = false;
  if (email) {
    const { data: invitation } = await supabase
      .from("invitations")
      .select("expires_at")
      .eq("profile_id", profileId)
      .is("used_at", null)
      .maybeSingle();
    emailSent = await sendInvitationEmail({
      to: email,
      firstName,
      activateUrl,
      expiresAt: invitation?.expires_at ?? new Date(Date.now() + 7 * 86400_000).toISOString(),
    });
  }

  revalidatePath("/admin-dashboard");
  return { ok: true, profileId, activateUrl, emailSent, emailAttempted: Boolean(email) };
}

export type ResendInviteResult =
  | { ok: true; activateUrl: string; emailSent: boolean; emailAttempted: boolean }
  | { ok: false; error: string };

/**
 * Resend (PORTAL_PLAN.md 6.2): rotate the open invitation in place (new hash,
 * fresh 7-day expiry) so the one-open-invitation-per-profile invariant holds
 * and the old link stops working. Inserts a new row when none is open (e.g.
 * cleaned up after 90 days).
 */
export async function resendInviteAction(profileId: string): Promise<ResendInviteResult> {
  const { user } = await requireAdmin();

  if (!z.uuid().safeParse(profileId).success) {
    return { ok: false, error: "Invalid client." };
  }

  const supabase = await createPortalServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, email, status, user_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "Client not found." };
  if (profile.status !== "pending" || profile.user_id) {
    return { ok: false, error: "This client has already activated their account." };
  }

  const { raw, hash } = generateInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("invitations")
    .update({
      token_hash: hash,
      expires_at: expiresAt,
      target_email: profile.email,
      created_by: user.id,
    })
    .eq("profile_id", profileId)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[portal] resendInvite update failed:", updateError);
    return { ok: false, error: "Could not refresh the invitation. Please try again." };
  }

  if (!updated) {
    const { error: insertError } = await supabase.from("invitations").insert({
      profile_id: profileId,
      token_hash: hash,
      expires_at: expiresAt,
      target_email: profile.email,
      created_by: user.id,
    });
    if (insertError) {
      console.error("[portal] resendInvite insert failed:", insertError);
      return { ok: false, error: "Could not create the invitation. Please try again." };
    }
  }

  const activateUrl = `${await getOrigin()}/account/activate?token=${raw}`;

  let emailSent = false;
  if (profile.email) {
    emailSent = await sendInvitationEmail({
      to: profile.email,
      firstName: profile.first_name,
      activateUrl,
      expiresAt,
    });
  }

  revalidatePath("/admin-dashboard");
  return { ok: true, activateUrl, emailSent, emailAttempted: Boolean(profile.email) };
}

export type DeleteClientResult = { ok: true } | { ok: false; error: string };

/**
 * Permanently deletes a client and every trace of them: auth user (sign-in),
 * profile, and via cascade their services and invitations. Restricted to
 * `role='client'` so an admin can never delete an admin account (or
 * themselves) from this surface. Runs on the service role because it spans
 * Supabase Auth + database; `requireAdmin()` is the authorization gate.
 */
export async function deleteClientAction(profileId: string): Promise<DeleteClientResult> {
  await requireAdmin();

  if (!z.uuid().safeParse(profileId).success) {
    return { ok: false, error: "Invalid client." };
  }

  // Read through the user-context client (admin RLS) so a revoked admin
  // cannot even resolve the target.
  const supabase = await createPortalServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, user_id, first_name, last_name")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "Client not found." };
  if (profile.role !== "client") {
    return { ok: false, error: "Only client accounts can be deleted here." };
  }

  const admin = getPortalAdminClient();

  if (profile.user_id) {
    const { error: authError } = await admin.auth.admin.deleteUser(profile.user_id);
    if (authError) {
      console.error("[portal] deleteClient auth deletion failed:", authError);
      return { ok: false, error: "Could not delete the client's sign-in. Nothing was removed; please try again." };
    }
  }

  const { error: profileError } = await admin.from("profiles").delete().eq("id", profileId);
  if (profileError) {
    // Auth user is already gone; the remaining profile row is orphaned but
    // harmless and this action can be retried from the table.
    console.error("[portal] deleteClient profile deletion failed:", profileError);
    return { ok: false, error: "Sign-in removed, but profile data deletion failed. Retry to finish." };
  }

  revalidatePath("/admin-dashboard");
  return { ok: true };
}
