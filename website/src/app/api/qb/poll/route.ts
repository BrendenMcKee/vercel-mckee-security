import { NextResponse } from "next/server";
import { authorizeQbBridge } from "@/lib/portal/qb/auth";
import {
  evaluateCompanyFile,
  mismatchErrorMessage,
  stampBridgeSeen,
} from "@/lib/portal/qb/heartbeat";
import { qbPollBodySchema } from "@/lib/portal/qb/schemas";

export const dynamic = "force-dynamic";

/**
 * Bridge poll (PORTAL_PLAN.md 9.5.2). 8A returns no write tasks — `qb_tasks`
 * is 8B. The response still tells the bridge which file to open and that
 * mirrors are wanted.
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

  const parsed = qbPollBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid poll payload." }, { status: 400 });
  }

  const heartbeat = {
    company_file: parsed.data.company_file ?? null,
    company_name: parsed.data.company_name ?? null,
    qb_version: parsed.data.qb_version ?? null,
    error: parsed.data.error ?? null,
  };

  const guard = evaluateCompanyFile(auth.bridge, heartbeat.company_file, {
    requireForLive: true,
  });

  if (!guard.ok) {
    try {
      await stampBridgeSeen(auth.bridge.id, heartbeat, {
        last_error:
          guard.error === "company_file_required"
            ? `Live mode requires company_file. expected=${guard.expected}`
            : mismatchErrorMessage(guard.expected, guard.reported),
      });
    } catch {
      // Still return the file refusal; heartbeat is best-effort here.
    }
    return NextResponse.json(
      {
        ok: false,
        error: guard.error,
        expected_company_file: guard.expected,
        reported_company_file: guard.reported,
      },
      { status: guard.status },
    );
  }

  const lastError =
    guard.match === false
      ? mismatchErrorMessage(auth.bridge.expected_company_file, heartbeat.company_file)
      : heartbeat.error;

  try {
    await stampBridgeSeen(auth.bridge.id, heartbeat, { last_error: lastError });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Heartbeat failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    file_ok: guard.match,
    bridge: {
      id: auth.bridge.id,
      label: auth.bridge.label,
      mode: auth.bridge.mode,
      expected_company_file: auth.bridge.expected_company_file,
    },
    tasks: [],
    mirror_wanted: ["customers", "invoices", "payments", "todos"],
  });
}
