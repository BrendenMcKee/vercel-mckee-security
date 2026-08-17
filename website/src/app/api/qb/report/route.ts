import { NextResponse } from "next/server";
import { authorizeQbBridge } from "@/lib/portal/qb/auth";
import { stampBridgeSeen } from "@/lib/portal/qb/heartbeat";
import { qbReportBodySchema } from "@/lib/portal/qb/schemas";

export const dynamic = "force-dynamic";

/**
 * Bridge report (PORTAL_PLAN.md 9.5.2). 8A stores company-file heartbeat and
 * last_error only. Task result stamps wait for `qb_tasks` in 8B.
 */
export async function POST(request: Request) {
  const auth = await authorizeQbBridge(request);
  if (!auth.ok) return auth.response;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = qbReportBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report payload." }, { status: 400 });
  }

  if (parsed.data.results && parsed.data.results.length > 0) {
    return NextResponse.json(
      { error: "task_queue_not_enabled", detail: "qb_tasks is Phase 8B. Do not post task results yet." },
      { status: 409 },
    );
  }

  const heartbeat = {
    company_file: parsed.data.company_file ?? null,
    company_name: parsed.data.company_name ?? null,
    qb_version: parsed.data.qb_version ?? null,
    error: parsed.data.error ?? null,
  };

  try {
    await stampBridgeSeen(auth.bridge.id, heartbeat, {
      last_error: heartbeat.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Heartbeat failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, accepted: "heartbeat" });
}
