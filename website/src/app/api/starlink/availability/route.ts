import { NextResponse } from "next/server";
import { availabilityQuerySchema } from "@/lib/starlink/schemas";
import { computeFullyBookedDates } from "@/lib/starlink/availability";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/starlink/supabase-admin";
import { daysBetweenInclusive } from "@/lib/starlink/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 180;

export async function GET(request: Request) {
  // Never break the public form: if the backend is not wired up yet, report
  // that nothing is blocked and let inquiries flow through.
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ fullyBookedDates: [], activeUnitCount: 0 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    start: searchParams.get("start"),
    end: searchParams.get("end"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid range." },
      { status: 400 },
    );
  }

  const { start, end } = parsed.data;
  if (daysBetweenInclusive(start, end) > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: "Date range too large." },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const [unitsRes, rentalsRes] = await Promise.all([
      supabase
        .from("units")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
      supabase
        .from("rentals")
        .select("pickup_date, return_date")
        .in("status", ["confirmed", "active"])
        .lte("pickup_date", end)
        .gte("return_date", start),
    ]);

    if (unitsRes.error || rentalsRes.error) {
      return NextResponse.json({ fullyBookedDates: [], activeUnitCount: 0 });
    }

    const activeUnitCount = unitsRes.count ?? 0;
    const fullyBookedDates = computeFullyBookedDates({
      activeUnitCount,
      blockingRentals: rentalsRes.data ?? [],
      startIso: start,
      endIso: end,
    });

    const res = NextResponse.json({ fullyBookedDates, activeUnitCount });
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    return res;
  } catch {
    return NextResponse.json({ fullyBookedDates: [], activeUnitCount: 0 });
  }
}
