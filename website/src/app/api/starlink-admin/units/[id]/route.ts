import { NextResponse } from "next/server";
import { guardAdminApi, mapDbError } from "@/lib/starlink/admin-guard";
import { getSupabaseAdmin } from "@/lib/starlink/supabase-admin";
import { unitUpdateSchema } from "@/lib/starlink/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

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

  const parsed = unitUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("units")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return mapDbError(error);
  if (!data) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 });
  }
  return NextResponse.json({ unit: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // Preserve booking history: refuse to hard-delete a unit that has rentals.
  const { count, error: countError } = await supabase
    .from("rentals")
    .select("id", { count: "exact", head: true })
    .eq("unit_id", id);

  if (countError) return mapDbError(countError);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "This unit has rentals attached. Mark it inactive instead of deleting to keep the history.",
      },
      { status: 409 },
    );
  }

  const { error } = await supabase.from("units").delete().eq("id", id);
  if (error) return mapDbError(error);
  return NextResponse.json({ ok: true });
}
