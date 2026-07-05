"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export type UpdatePasswordResult = { ok: false; error: string };

/**
 * Sets/updates the password for the current session and stamps
 * `profiles.password_set_at`, which releases the forced first-access password
 * gate. Used by both the post-Google-activation setup screen and the
 * forgot-password reset page. Redirects to the dashboard on success.
 */
export async function updatePassword(input: {
  password: string;
}): Promise<UpdatePasswordResult> {
  const parsed = passwordSchema.safeParse(input.password);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  const supabase = await createPortalServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    return { ok: false, error: "Your session has expired. Sign in and try again." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (error.code === "weak_password") {
      return {
        ok: false,
        error: "That password is too weak or has appeared in a known data breach. Please choose a different one.",
      };
    }
    if (error.code === "same_password") {
      return { ok: false, error: "The new password must be different from your current password." };
    }
    console.error("[portal] updatePassword failed:", error);
    return { ok: false, error: "Could not update your password. Please try again." };
  }

  // Service role: clients have no UPDATE policy on profiles by design.
  const admin = getPortalAdminClient();
  const { error: stampError } = await admin
    .from("profiles")
    .update({ password_set_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (stampError) {
    console.error("[portal] password_set_at stamp failed:", stampError);
  }

  redirect("/user-dashboard");
}
