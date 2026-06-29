import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/starlink/admin-guard";
import { getSupabaseAdmin } from "@/lib/starlink/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RENTAL_SELECT = "*, unit:units(id,name,color,active)";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const [unitsRes, rentalsRes] = await Promise.all([
    supabase.from("units").select("*").order("created_at", { ascending: true }),
    supabase
      .from("rentals")
      .select(RENTAL_SELECT)
      .order("pickup_date", { ascending: false }),
  ]);

  if (unitsRes.error) {
    return NextResponse.json({ error: unitsRes.error.message }, { status: 500 });
  }
  if (rentalsRes.error) {
    return NextResponse.json({ error: rentalsRes.error.message }, { status: 500 });
  }

  const res = NextResponse.json({
    units: unitsRes.data ?? [],
    rentals: rentalsRes.data ?? [],
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
