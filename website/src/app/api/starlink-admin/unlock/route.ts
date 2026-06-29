import { NextResponse } from "next/server";
import {
  SL_ADMIN_COOKIE,
  SL_ADMIN_COOKIE_MAX_AGE,
  expectedAuthToken,
  isCorrectPassword,
  isGateConfigured,
} from "@/lib/starlink/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const secureCookie = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  if (!isGateConfigured()) {
    return NextResponse.json(
      { error: "Starlink admin access is not configured." },
      { status: 503 },
    );
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (!isCorrectPassword(password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SL_ADMIN_COOKIE, expectedAuthToken() as string, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: SL_ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SL_ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
