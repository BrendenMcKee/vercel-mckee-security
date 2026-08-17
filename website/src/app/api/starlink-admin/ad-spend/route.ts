import { NextResponse } from "next/server";
import { guardAdminApi, mapDbError } from "@/lib/starlink/admin-guard";
import { isValidIsoDate, todayIsoToronto } from "@/lib/starlink/dates";
import { adSpendUpsertSchema } from "@/lib/starlink/schemas";
import { getSupabaseAdmin } from "@/lib/starlink/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Record a fleet-wide daily advertising rate. A new row is inserted so past
 * days keep the old spend; saving twice on the same effective date updates
 * that day's row instead of stacking duplicates.
 */
export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const parsed = adSpendUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const effectiveFrom = parsed.data.effective_from ?? todayIsoToronto();
  if (!isValidIsoDate(effectiveFrom)) {
    return NextResponse.json(
      { error: "Effective from must be a real calendar date." },
      { status: 400 },
    );
  }

  const payload = { daily_cost: parsed.data.daily_cost };
  const supabase = getSupabaseAdmin();

  const { data: existing, error: existingError } = await supabase
    .from("ad_spend_rates")
    .select("id")
    .eq("effective_from", effectiveFrom)
    .maybeSingle();

  if (existingError) return mapDbError(existingError);

  if (existing) {
    const { data, error } = await supabase
      .from("ad_spend_rates")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) return mapDbError(error);
    return NextResponse.json({ rate: data });
  }

  const inserted = await supabase
    .from("ad_spend_rates")
    .insert({
      effective_from: effectiveFrom,
      ...payload,
    })
    .select("*")
    .single();

  if (inserted.error?.code === "23505") {
    const { data, error } = await supabase
      .from("ad_spend_rates")
      .update(payload)
      .eq("effective_from", effectiveFrom)
      .select("*")
      .single();
    if (error) return mapDbError(error);
    return NextResponse.json({ rate: data });
  }

  if (inserted.error) return mapDbError(inserted.error);
  return NextResponse.json({ rate: inserted.data });
}
