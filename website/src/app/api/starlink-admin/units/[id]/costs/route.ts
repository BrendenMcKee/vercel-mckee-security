import { NextResponse } from "next/server";
import { guardAdminApi, mapDbError } from "@/lib/starlink/admin-guard";
import { todayIsoToronto } from "@/lib/starlink/dates";
import { unitCostUpsertSchema } from "@/lib/starlink/schemas";
import { getSupabaseAdmin } from "@/lib/starlink/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Record a monthly Starlink subscription rate for this kit. A new row is
 * inserted so past months keep the old rate; saving twice on the same
 * effective date updates that day's row instead of stacking duplicates.
 */
export async function POST(request: Request, { params }: Params) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const { id } = await params;

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
  const planName = parsed.data.plan_name?.trim() ? parsed.data.plan_name.trim() : null;

  const { data: existing, error: existingError } = await supabase
    .from("unit_costs")
    .select("id")
    .eq("unit_id", id)
    .eq("effective_from", effectiveFrom)
    .maybeSingle();

  if (existingError) return mapDbError(existingError);

  const row = existing
    ? await supabase
        .from("unit_costs")
        .update({
          monthly_cost: parsed.data.monthly_cost,
          plan_name: planName,
        })
        .eq("id", existing.id)
        .select("*")
        .single()
    : await supabase
        .from("unit_costs")
        .insert({
          unit_id: id,
          monthly_cost: parsed.data.monthly_cost,
          plan_name: planName,
          effective_from: effectiveFrom,
        })
        .select("*")
        .single();

  if (row.error) return mapDbError(row.error);
  return NextResponse.json({ cost: row.data });
}
