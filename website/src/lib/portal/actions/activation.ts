"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ACTIVATION_COOKIE, validateInvitationToken } from "@/lib/portal/invitations";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { getAuthContext } from "@/lib/portal/auth";

export type ActivationResult =
  | { ok: false; error: string }
  /** Account created but unconfirmed (invite had no target email): user must click the confirmation email before signing in. */
  | { ok: true; state: "confirm_email" };

const activateSchema = z.object({
  token: z.string().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const TOKEN_ERROR =
  "This activation link is no longer valid. Please contact McKee Security for a new invitation.";

/**
 * Consume a valid invitation for `userId` (PORTAL_PLAN.md 6.3/6.4): link the
 * profile and mark the invitation used. The linking UPDATE is guarded on
 * `user_id is null` + `status='pending'` so a concurrent activation loses
 * cleanly (zero rows) instead of stealing the profile.
 */
async function linkProfileToUser(profileId: string, invitationId: string, userId: string): Promise<boolean> {
  const admin = getPortalAdminClient();

  const { data: linked, error } = await admin
    .from("profiles")
    .update({ user_id: userId, status: "active" })
    .eq("id", profileId)
    .is("user_id", null)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !linked) {
    console.error("[portal] Profile linking failed:", error ?? "already linked");
    return false;
  }

  const { error: usedError } = await admin
    .from("invitations")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invitationId)
    .is("used_at", null);

  if (usedError) {
    // Profile is linked; the invitation row is now unusable anyway because the
    // profile left 'pending'. Log for reconciliation, don't fail the activation.
    console.error("[portal] Marking invitation used failed:", usedError);
  }
  return true;
}

/**
 * Email/password activation (PORTAL_PLAN.md 6.3). Creates the auth user,
 * links the pending profile, consumes the token, signs the user in, and
 * redirects to the dashboard. Compensates by deleting the auth user if
 * linking fails.
 */
export async function activateWithPassword(input: {
  token: string;
  email: string;
  password: string;
}): Promise<ActivationResult> {
  const parsed = activateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { token, email, password } = parsed.data;

  const validation = await validateInvitationToken(token);
  if (validation.state !== "valid") {
    return { ok: false, error: TOKEN_ERROR };
  }
  const { invitation, profile } = validation;

  // The invite link proves email ownership only for the email it was sent to.
  const targetEmail = invitation.target_email?.toLowerCase() ?? null;
  if (targetEmail && targetEmail !== email) {
    return {
      ok: false,
      error: "This invitation was issued for a different email address. Use the email the invitation was sent to.",
    };
  }

  const admin = getPortalAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: Boolean(targetEmail),
  });

  if (createError || !created.user) {
    if (createError?.code === "email_exists") {
      return {
        ok: false,
        error: "An account with this email already exists. Sign in at Manage Account first, then open your activation link again.",
      };
    }
    if (createError?.code === "weak_password") {
      return {
        ok: false,
        error: "That password is too weak or has appeared in a known data breach. Please choose a different one.",
      };
    }
    console.error("[portal] Activation createUser failed:", createError);
    return { ok: false, error: "Could not create your account. Please try again." };
  }

  const linked = await linkProfileToUser(profile.id, invitation.id, created.user.id);
  if (!linked) {
    await admin.auth.admin.deleteUser(created.user.id).catch((cleanupError) => {
      console.error("[portal] Activation compensation failed:", cleanupError);
    });
    return { ok: false, error: TOKEN_ERROR };
  }

  if (!targetEmail) {
    // No target email: the link doesn't prove inbox ownership, so require
    // Supabase email confirmation before first sign-in (PORTAL_PLAN.md 5).
    const supabase = await createPortalServerClient();
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    if (resendError) {
      console.error("[portal] Confirmation email send failed:", resendError);
    }
    return { ok: true, state: "confirm_email" };
  }

  const supabase = await createPortalServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error("[portal] Post-activation sign-in failed:", signInError);
    // Account is fully activated; the sign-in screen will work.
  }

  redirect("/user-dashboard");
}

/**
 * Step 1 of the Google activation path (PORTAL_PLAN.md 6.4): stash the raw
 * token in a short-lived httpOnly cookie so /account/activate/complete can
 * consume it after the OAuth round-trip.
 */
export async function beginGoogleActivation(token: string): Promise<{ ok: boolean; error?: string }> {
  const validation = await validateInvitationToken(token);
  if (validation.state !== "valid") {
    return { ok: false, error: TOKEN_ERROR };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return { ok: true };
}

/**
 * Activation for a visitor who already holds a session (e.g. signed in with
 * Google before opening the invite, landing in the orphan flow). Same
 * target-email invariant as 6.4.
 */
export async function activateAsCurrentUser(token: string): Promise<ActivationResult> {
  const { user, profile: existingProfile } = await getAuthContext();
  if (!user) {
    return { ok: false, error: "Your session has expired. Please reopen your activation link." };
  }
  if (existingProfile) {
    return { ok: false, error: "You are already signed in to an activated account. Sign out first to activate a different one." };
  }

  const validation = await validateInvitationToken(token);
  if (validation.state !== "valid") {
    return { ok: false, error: TOKEN_ERROR };
  }
  const { invitation, profile } = validation;

  const targetEmail = invitation.target_email?.toLowerCase() ?? null;
  if (targetEmail && targetEmail !== (user.email ?? "").toLowerCase()) {
    return {
      ok: false,
      error: "This invitation was issued for a different email address. Sign out and use the account the invitation was sent to.",
    };
  }

  const linked = await linkProfileToUser(profile.id, invitation.id, user.id);
  if (!linked) {
    return { ok: false, error: TOKEN_ERROR };
  }

  redirect("/user-dashboard");
}
