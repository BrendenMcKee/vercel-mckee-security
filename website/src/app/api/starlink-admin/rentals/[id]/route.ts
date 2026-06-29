import { NextResponse } from "next/server";
import { guardAdminApi, mapDbError } from "@/lib/starlink/admin-guard";
import { getSupabaseAdmin } from "@/lib/starlink/supabase-admin";
import { rentalUpdateSchema } from "@/lib/starlink/schemas";
import type { TablesUpdate } from "@/lib/starlink/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const RENTAL_SELECT = "*, unit:units(id,name,color,active)";

export async function PATCH(request: Request, { params }: Params) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const parsed = rentalUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: current, error: currentError } = await supabase
    .from("rentals")
    .select("updated_at, deposit_received, deposit_received_at, deposit_returned, deposit_returned_at")
    .eq("id", id)
    .maybeSingle();

  if (currentError) return mapDbError(currentError);
  if (!current) {
    return NextResponse.json({ error: "Rental not found." }, { status: 404 });
  }

  const { expected_updated_at, ...input } = parsed.data;
  if (expected_updated_at && expected_updated_at !== current.updated_at) {
    return NextResponse.json(
      {
        error:
          "This rental was changed in another tab or by someone else. Refresh and try again.",
      },
      { status: 409 },
    );
  }

  const patch: TablesUpdate<"rentals"> = {};
  const nowIso = new Date().toISOString();

  const directKeys = [
    "unit_id",
    "status",
    "source",
    "customer_name",
    "customer_email",
    "customer_phone",
    "customer_address",
    "usage_location",
    "pickup_date",
    "pickup_time",
    "return_date",
    "daily_rate",
    "quoted_price",
    "deposit_amount",
    "deposit_returned_amount",
    "amount_received",
    "comments",
  ] as const;

  for (const key of directKeys) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined) {
      (patch as Record<string, unknown>)[key] = value;
    }
  }

  if (input.deposit_received !== undefined) {
    patch.deposit_received = input.deposit_received;
    if (input.deposit_received && !current.deposit_received) {
      patch.deposit_received_at = nowIso;
    } else if (!input.deposit_received) {
      patch.deposit_received_at = null;
    }
  }

  if (input.deposit_returned !== undefined) {
    patch.deposit_returned = input.deposit_returned;
    if (input.deposit_returned && !current.deposit_returned) {
      patch.deposit_returned_at = nowIso;
    } else if (!input.deposit_returned) {
      patch.deposit_returned_at = null;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rentals")
    .update(patch)
    .eq("id", id)
    .eq("updated_at", current.updated_at)
    .select(RENTAL_SELECT)
    .maybeSingle();

  if (error) return mapDbError(error);
  if (!data) {
    return NextResponse.json(
      {
        error:
          "This rental was changed in another tab or by someone else. Refresh and try again.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ rental: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("rentals").delete().eq("id", id);
  if (error) return mapDbError(error);
  return NextResponse.json({ ok: true });
}
