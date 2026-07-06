import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/portal/cron/auth";
import { runPaymentDueJob } from "@/lib/portal/cron/payment-due";
import { runDeviceExpiryJob } from "@/lib/portal/cron/device-expiry";
import { runCleanupJob } from "@/lib/portal/cron/cleanup";
import { recordPortalAlert } from "@/lib/portal/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * The single scheduled entry point (PORTAL_PLAN.md 9.4; one cron fits the
 * Vercel Hobby plan's limits). Runs all three daily jobs; a failure in one
 * never blocks the others, and every failure lands in the Alerts tab.
 * Individual /api/cron/* routes exist for targeted manual runs.
 */
export async function GET(request: Request) {
  const denied = authorizeCronRequest(request);
  if (denied) return denied;

  const results: Record<string, unknown> = {};
  const jobs = [
    ["payment-due", runPaymentDueJob],
    ["device-expiry", runDeviceExpiryJob],
    ["cleanup", runCleanupJob],
  ] as const;

  for (const [name, run] of jobs) {
    try {
      results[name] = await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[portal] cron job ${name} failed:`, error);
      await recordPortalAlert("cron_failure", `Daily cron job "${name}" failed.`, { error: message });
      results[name] = { error: message };
    }
  }

  return NextResponse.json({ ok: true, results });
}
