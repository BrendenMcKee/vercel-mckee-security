"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_ERROR_MESSAGE, tryRequireUser } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { formatPhone, normalizePhone } from "@/lib/portal/phone";
import { sendAccountChangeAdminAlert } from "@/lib/portal/emails";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

const accountSchema = z.object({
  phone: z.string().trim().max(40),
  address: z.string().trim().max(300),
});

export type UpdateMyAccountResult = { ok: true } | { ok: false; error: string };
export type UpdateMyPasswordResult = { ok: true } | { ok: false; error: string };

function displayPhone(value: string | null): string {
  if (!value) return "Not on file";
  return formatPhone(value);
}

/**
 * Client updates phone and service address from Settings. Email stays locked
 * (it is the sign-in identity). Writes go through the service-role client
 * because clients have no UPDATE policy on profiles. McKee is emailed so
 * QuickBooks / office records can be updated.
 */
export async function updateMyAccountAction(input: {
  phone: string;
  address: string;
}): Promise<UpdateMyAccountResult> {
  const auth = await tryRequireUser();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  const { user, profile } = auth;
  if (profile.role !== "client") {
    return { ok: false, error: "Account settings are for client profiles." };
  }

  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let phone: string | null = null;
  if (parsed.data.phone) {
    phone = normalizePhone(parsed.data.phone);
    if (!phone) {
      return { ok: false, error: "Enter a valid North American phone number, or leave it blank." };
    }
  }
  const address = parsed.data.address || null;

  const changes: { field: string; from: string; to: string }[] = [];
  if ((profile.phone ?? null) !== phone) {
    changes.push({
      field: "Phone number",
      from: displayPhone(profile.phone),
      to: displayPhone(phone),
    });
  }
  if ((profile.address ?? null) !== address) {
    changes.push({
      field: "Service address",
      from: profile.address?.trim() || "Not on file",
      to: address || "Not on file",
    });
  }
  if (changes.length === 0) {
    return { ok: true };
  }

  const admin = getPortalAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ phone, address })
    .eq("id", profile.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[portal] updateMyAccount failed:", error);
    return { ok: false, error: "Could not save your account details. Please try again." };
  }

  await sendAccountChangeAdminAlert({
    clientName: `${profile.first_name} ${profile.last_name}`,
    clientEmail: profile.email,
    profileId: profile.id,
    kind: "profile",
    changes,
  });

  revalidatePath("/user-dashboard");
  return { ok: true };
}

/**
 * Signed-in client changes their password from Settings. Does not redirect
 * (unlike first-access / reset, which send them to the dashboard).
 */
export async function updateMyPasswordAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<UpdateMyPasswordResult> {
  const auth = await tryRequireUser();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  const { user, profile } = auth;
  if (profile.role !== "client") {
    return { ok: false, error: "Account settings are for client profiles." };
  }

  const parsed = passwordSchema.safeParse(input.password);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false, error: "The two passwords do not match." };
  }

  const supabase = await createPortalServerClient();
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
    console.error("[portal] updateMyPassword failed:", error);
    return { ok: false, error: "Could not update your password. Please try again." };
  }

  const admin = getPortalAdminClient();
  const { error: stampError } = await admin
    .from("profiles")
    .update({ password_set_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (stampError) {
    console.error("[portal] password_set_at stamp failed:", stampError);
  }

  await sendAccountChangeAdminAlert({
    clientName: `${profile.first_name} ${profile.last_name}`,
    clientEmail: profile.email,
    profileId: profile.id,
    kind: "password",
    changes: [{ field: "Portal password", from: "Hidden", to: "Changed by the client" }],
  });

  revalidatePath("/user-dashboard");
  return { ok: true };
}
