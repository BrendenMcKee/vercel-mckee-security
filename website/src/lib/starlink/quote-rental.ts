import "server-only";

import { daysBetweenInclusive } from "./dates";
import { DEFAULT_RATE_TIERS, quoteForDays } from "./pricing";
import { getSupabaseAdmin } from "./supabase-admin";

/**
 * Pre-tax base rate for these inclusive dates. Falls back to the built-in
 * card if the table is missing or empty, so a website request still gets a
 * price when the migration has not landed yet.
 */
export async function quoteForRentalDates(
  pickup: string,
  returnDate: string,
): Promise<number | null> {
  const days = daysBetweenInclusive(pickup, returnDate);
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("rental_rate_tiers")
      .select("min_days, max_days, amount")
      .order("min_days", { ascending: true });
    if (error) {
      console.error("[starlink] rental_rate_tiers lookup failed:", error.message);
      const missing =
        error.code === "42P01" ||
        error.code === "PGRST205" ||
        /does not exist|schema cache/i.test(error.message);
      // Only the built-in card is a safe stand-in when the table is not there
      // yet. Any other failure must not invent a price on a live request.
      return missing ? quoteForDays(DEFAULT_RATE_TIERS, days) : null;
    }
    if (!data?.length) return quoteForDays(DEFAULT_RATE_TIERS, days);
    return quoteForDays(data, days);
  } catch (err) {
    console.error("[starlink] rental_rate_tiers lookup threw:", err);
    return null;
  }
}
