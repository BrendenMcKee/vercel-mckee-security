import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SL_ADMIN_COOKIE, isGateConfigured, isUnlocked } from "./gate";
import { isSupabaseConfigured } from "./supabase-admin";

/** True when the current request carries a valid admin session cookie. */
export async function isAdminUnlocked(): Promise<boolean> {
  const store = await cookies();
  return isUnlocked(store.get(SL_ADMIN_COOKIE)?.value);
}

/**
 * Guard for admin API routes. Returns a NextResponse to short-circuit with when
 * the request is not allowed, or null when it may proceed.
 */
export async function guardAdminApi(): Promise<NextResponse | null> {
  if (!isGateConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Starlink admin is not configured." },
      { status: 503 },
    );
  }
  if (!(await isAdminUnlocked())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

/** Map a Postgres/PostgREST error to a friendly API response. */
export function mapDbError(error: { code?: string; message?: string }): NextResponse {
  // 23P01 = exclusion_violation (overlapping confirmed/active booking)
  if (error.code === "23P01") {
    return NextResponse.json(
      {
        error:
          "Those dates overlap an existing confirmed booking for this unit. Pick different dates or another unit.",
      },
      { status: 409 },
    );
  }
  // 23514 = check_violation. Rental date order has its own copy; everything
  // else (non-negative money, enum checks) gets a generic line so a cost
  // constraint cannot be reported as a pickup/return problem.
  if (error.code === "23514") {
    const dates = /rentals_dates_chk|pickup_date|return_date/i.test(
      error.message ?? "",
    );
    return NextResponse.json(
      {
        error: dates
          ? "Invalid dates. Return must be on or after pickup."
          : "That value isn't allowed.",
      },
      { status: 400 },
    );
  }
  // 23505 = unique_violation
  if (error.code === "23505") {
    return NextResponse.json(
      { error: "That record already exists." },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { error: error.message ?? "Database error." },
    { status: 500 },
  );
}
