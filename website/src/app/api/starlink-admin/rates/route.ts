import { NextResponse } from "next/server";
import { guardAdminApi, mapDbError } from "@/lib/starlink/admin-guard";
import { rateTiersReplaceSchema } from "@/lib/starlink/schemas";
import { getSupabaseAdmin } from "@/lib/starlink/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Replace the whole base-rate card. The card is small and edited as a set,
 * so a row-at-a-time upsert would leave stale bands behind.
 */
export async function PUT(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const parsed = rateTiersReplaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const rows = parsed.data.tiers
    .slice()
    .sort((a, b) => a.min_days - b.min_days || a.max_days - b.max_days)
    .map((tier, index) => ({
      min_days: tier.min_days,
      max_days: tier.max_days,
      amount: tier.amount,
      sort_order: index + 1,
    }));

  const supabase = getSupabaseAdmin();
  // Insert the new card first. Deleting up front left an empty table if the
  // insert then failed, and website requests would fall back to stale defaults.
  const { data: existing, error: existingError } = await supabase
    .from("rental_rate_tiers")
    .select("id");
  if (existingError) return mapDbError(existingError);

  const { data, error } = await supabase
    .from("rental_rate_tiers")
    .insert(rows)
    .select("*")
    .order("min_days", { ascending: true });
  if (error) return mapDbError(error);

  const oldIds = (existing ?? []).map((row) => row.id);
  if (oldIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("rental_rate_tiers")
      .delete()
      .in("id", oldIds);
    if (deleteError) return mapDbError(deleteError);
  }

  return NextResponse.json({ rates: data ?? [] });
}
