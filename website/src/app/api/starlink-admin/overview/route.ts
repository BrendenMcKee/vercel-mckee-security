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
  const [unitsRes, rentalsRes, costsRes] = await Promise.all([
    supabase.from("units").select("*").order("created_at", { ascending: true }),
    supabase
      .from("rentals")
      .select(RENTAL_SELECT)
      .order("pickup_date", { ascending: false }),
    supabase
      .from("unit_costs")
      .select("*")
      .order("effective_from", { ascending: true }),
  ]);

  if (unitsRes.error) {
    return NextResponse.json({ error: unitsRes.error.message }, { status: 500 });
  }
  if (rentalsRes.error) {
    return NextResponse.json({ error: rentalsRes.error.message }, { status: 500 });
  }
  // A missing or unreadable cost table must not take down the rest of the
  // admin: Schedule/Rentals/Fleet still work, and Profit just shows $0 cost
  // until the rates can be loaded.
  if (costsRes.error) {
    console.error("[starlink] unit_costs lookup failed:", costsRes.error.message);
  }

  const res = NextResponse.json({
    units: unitsRes.data ?? [],
    rentals: rentalsRes.data ?? [],
    costs: costsRes.error ? [] : (costsRes.data ?? []),
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
