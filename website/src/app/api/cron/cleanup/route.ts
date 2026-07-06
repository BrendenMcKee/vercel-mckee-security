import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/portal/cron/auth";
import { runCleanupJob } from "@/lib/portal/cron/cleanup";
import { recordPortalAlert } from "@/lib/portal/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = authorizeCronRequest(request);
  if (denied) return denied;

  try {
    const summary = await runCleanupJob();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[portal] cleanup cron failed:", error);
    await recordPortalAlert("cron_failure", "Cleanup cron failed.", { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
