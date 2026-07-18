"use server";

import { revalidatePath } from "next/cache";
import { SESSION_ERROR_MESSAGE, tryRequireUser } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";

export type CloudBackupInterestResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Explicit client consent for Camera Cloud Backup availability emails.
 * The email comes from the linked profile, never from client-supplied input.
 * RLS independently enforces ownership and that the inserted email matches.
 */
export async function joinCloudBackupInterestAction(): Promise<CloudBackupInterestResult> {
  const auth = await tryRequireUser();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  if (auth.profile.role !== "client") {
    return { ok: false, error: "This update list is for client accounts." };
  }

  const email = auth.profile.email?.trim();
  if (!email) {
    return {
      ok: false,
      error: "Add an email address to your account before joining the update list.",
    };
  }

  const supabase = await createPortalServerClient();
  const { error } = await supabase.from("cloud_backup_interest").insert({
    profile_id: auth.profile.id,
    email,
  });

  // A duplicate means this signed-in client already consented. Treat that as
  // success so a double click or stale page can never produce a scary error.
  if (error && error.code !== "23505") {
    console.error("[portal] cloud backup interest opt-in failed:", error);
    return {
      ok: false,
      error: "We could not add you to the update list. Please try again.",
    };
  }

  revalidatePath("/user-dashboard");
  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}

/** Removes the active consent row; no contact entry remains after withdrawal. */
export async function leaveCloudBackupInterestAction(): Promise<CloudBackupInterestResult> {
  const auth = await tryRequireUser();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  if (auth.profile.role !== "client") {
    return { ok: false, error: "This update list is for client accounts." };
  }

  const supabase = await createPortalServerClient();
  const { error } = await supabase
    .from("cloud_backup_interest")
    .delete()
    .eq("profile_id", auth.profile.id);

  if (error) {
    console.error("[portal] cloud backup interest withdrawal failed:", error);
    return {
      ok: false,
      error: "We could not remove you from the update list. Please try again.",
    };
  }

  revalidatePath("/user-dashboard");
  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}
