import { NextResponse } from "next/server";
import { fetchGbpPhotoCatalog } from "@/lib/gbp-photos";

export const revalidate = 86400;

export async function GET() {
  const catalog = await fetchGbpPhotoCatalog();
  if (!catalog) {
    return NextResponse.json(
      { error: "Google Places API is not configured." },
      { status: 503 },
    );
  }

  return NextResponse.json(catalog);
}
