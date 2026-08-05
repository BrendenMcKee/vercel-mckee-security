import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/portal/cron/auth";
import { runStarlinkReminderJob } from "@/lib/starlink/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Starlink rental reminders. Runs as part of /api/cron/daily; this route stays
 * live for targeted manual runs.
 */
export async function GET(request: Request) {
  const denied = authorizeCronRequest(request);
  if (denied) return denied;

  try {
    const summary = await runStarlinkReminderJob();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[starlink] rental reminder cron failed:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
