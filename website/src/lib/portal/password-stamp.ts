import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/portal/database.types";

/**
 * First-access password is per Auth user. Stamp every membership for this
 * login, and the leftover home `profiles.password_set_at` when present.
 */
export async function stampPasswordSetAt(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error: memberError } = await admin
    .from("account_members")
    .update({ password_set_at: now })
    .eq("user_id", userId);
  if (memberError) {
    console.error("[portal] account_members password_set_at stamp failed:", memberError);
  }
  const { error: profileError } = await admin
    .from("profiles")
    .update({ password_set_at: now })
    .eq("user_id", userId);
  if (profileError) {
    console.error("[portal] profiles password_set_at stamp failed:", profileError);
  }
}
