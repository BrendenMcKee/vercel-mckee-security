import { NextResponse } from "next/server";
import { guardAdminApi, mapDbError } from "@/lib/starlink/admin-guard";
import { getSupabaseAdmin } from "@/lib/starlink/supabase-admin";
import { unitCreateSchema } from "@/lib/starlink/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const parsed = unitCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("units")
    .insert({
      name: parsed.data.name,
      color: parsed.data.color,
      notes: parsed.data.notes ?? null,
      active: parsed.data.active ?? true,
    })
    .select("*")
    .single();

  if (error) return mapDbError(error);
  return NextResponse.json({ unit: data });
}
