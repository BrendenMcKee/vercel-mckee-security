type LinkLookup = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

/**
 * A login is linked when the auth user owns a leftover home-site
 * `profiles.user_id` or (after R53) any `account_members.user_id` row.
 * Extra members never get `profiles.user_id`; treat them as linked.
 *
 * If either lookup fails, `lookupFailed` is true so callers never delete
 * a real user on a transient read error.
 */
export async function hasLinkedPortalLogin(
  supabase: unknown,
  userId: string,
): Promise<{ linked: boolean; lookupFailed: boolean }> {
  const client = supabase as LinkLookup;
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) return { linked: false, lookupFailed: true };
  if (profile) return { linked: true, lookupFailed: false };

  const { data: member, error: memberError } = await client
    .from("account_members")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (memberError) return { linked: false, lookupFailed: true };
  return { linked: Boolean(member), lookupFailed: false };
}
