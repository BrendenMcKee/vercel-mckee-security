import { NextResponse } from "next/server";
import { guardAdminApi, mapDbError } from "@/lib/starlink/admin-guard";
import { isValidIsoDate, todayIsoToronto } from "@/lib/starlink/dates";
import { unitCostUpsertSchema } from "@/lib/starlink/schemas";
import { getSupabaseAdmin } from "@/lib/starlink/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Record a monthly Starlink subscription rate for this kit. A new row is
 * inserted so past months keep the old rate; saving twice on the same
 * effective date updates that day's row instead of stacking duplicates.
 */
export async function POST(request: Request, { params }: Params) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const parsed = unitCostUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (unitError) return mapDbError(unitError);
  if (!unit) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 });
  }

  const effectiveFrom = parsed.data.effective_from ?? todayIsoToronto();
  if (!isValidIsoDate(effectiveFrom)) {
    return NextResponse.json(
      { error: "Effective from must be a real calendar date." },
      { status: 400 },
    );
  }
  const planName = parsed.data.plan_name?.trim()
    ? parsed.data.plan_name.trim()
    : null;

  const payload = {
    monthly_cost: parsed.data.monthly_cost,
    plan_name: planName,
  };

  const { data: existing, error: existingError } = await supabase
    .from("unit_costs")
    .select("id")
    .eq("unit_id", id)
    .eq("effective_from", effectiveFrom)
    .maybeSingle();

  if (existingError) return mapDbError(existingError);

  if (existing) {
    const { data, error } = await supabase
      .from("unit_costs")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) return mapDbError(error);
    return NextResponse.json({ cost: data });
  }

  const inserted = await supabase
    .from("unit_costs")
    .insert({
      unit_id: id,
      effective_from: effectiveFrom,
      ...payload,
    })
    .select("*")
    .single();

  // Two saves on the same day can race past the lookup; treat the unique hit
  // as "this date already has a rate" and overwrite it.
  if (inserted.error?.code === "23505") {
    const { data, error } = await supabase
      .from("unit_costs")
      .update(payload)
      .eq("unit_id", id)
      .eq("effective_from", effectiveFrom)
      .select("*")
      .single();
    if (error) return mapDbError(error);
    return NextResponse.json({ cost: data });
  }

  if (inserted.error) return mapDbError(inserted.error);
  return NextResponse.json({ cost: inserted.data });
}
