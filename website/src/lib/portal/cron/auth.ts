import "server-only";
import { NextResponse } from "next/server";

/**
 * Cron route guard (PORTAL_PLAN.md 9.4): Vercel invokes cron paths with
 * `Authorization: Bearer ${CRON_SECRET}`. Anything else is rejected; a
 * missing secret disables the routes entirely (503) rather than running open.
 */
export function authorizeCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }
  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}
