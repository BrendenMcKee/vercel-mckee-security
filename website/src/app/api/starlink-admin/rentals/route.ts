import { NextResponse } from "next/server";
import { guardAdminApi, mapDbError } from "@/lib/starlink/admin-guard";
import { getSupabaseAdmin } from "@/lib/starlink/supabase-admin";
import { rentalCreateSchema } from "@/lib/starlink/schemas";
import type { TablesInsert } from "@/lib/starlink/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RENTAL_SELECT = "*, unit:units(id,name,color,active)";

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const parsed = rentalCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const nowIso = new Date().toISOString();
  const insert: TablesInsert<"rentals"> = {
    unit_id: input.unit_id ?? null,
    status: input.status ?? "requested",
    source: input.source ?? "admin",
    customer_name: input.customer_name,
    customer_email: input.customer_email,
    customer_phone: input.customer_phone ?? null,
    customer_address: input.customer_address ?? null,
    usage_location: input.usage_location ?? null,
    pickup_date: input.pickup_date,
    pickup_time: input.pickup_time ?? null,
    return_date: input.return_date,
    daily_rate: input.daily_rate ?? null,
    quoted_price: input.quoted_price ?? null,
    deposit_amount: input.deposit_amount ?? null,
    deposit_received: input.deposit_received ?? false,
    deposit_received_at: input.deposit_received ? nowIso : null,
    deposit_returned: input.deposit_returned ?? false,
    deposit_returned_at: input.deposit_returned ? nowIso : null,
    deposit_returned_amount: input.deposit_returned_amount ?? null,
    amount_received: input.amount_received ?? null,
    comments: input.comments ?? null,
  };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("rentals")
    .insert(insert)
    .select(RENTAL_SELECT)
    .single();

  if (error) return mapDbError(error);
  return NextResponse.json({ rental: data });
}
