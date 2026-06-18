import { NextResponse } from "next/server";
import {
  DD_COOKIE,
  DD_COOKIE_MAX_AGE,
  expectedAuthToken,
  isCorrectPassword,
  isGateConfigured,
} from "@/lib/data-drops/gate";

const secureCookie = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  if (!isGateConfigured()) {
    return NextResponse.json(
      { error: "Data Drops access is not configured." },
      { status: 500 },
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
  res.cookies.set(DD_COOKIE, expectedAuthToken() as string, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: DD_COOKIE_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DD_COOKIE, "", {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
