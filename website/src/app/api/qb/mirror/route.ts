import { NextResponse } from "next/server";
import { authorizeQbBridge } from "@/lib/portal/qb/auth";
import {
  evaluateCompanyFile,
  mismatchErrorMessage,
  stampBridgeSeen,
} from "@/lib/portal/qb/heartbeat";
import { ingestQbMirrors, mirrorKeysPresent } from "@/lib/portal/qb/mirrors";
import { qbMirrorBodySchema } from "@/lib/portal/qb/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Read-only QuickBooks mirror ingest (PORTAL_PLAN.md 9.5.2 / 9.5.5).
 * Refuses a company-file mismatch in every mode so sandbox mirrors cannot
 * be filled from live. Does not post, enqueue, or write Lanvac.
 */
export async function POST(request: Request) {
  const auth = await authorizeQbBridge(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = qbMirrorBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid mirror payload.", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }

  const heartbeat = {
    company_file: parsed.data.company_file,
    company_name: parsed.data.company_name ?? null,
    qb_version: parsed.data.qb_version ?? null,
    error: parsed.data.error ?? null,
  };

  const guard = evaluateCompanyFile(auth.bridge, heartbeat.company_file, {
    requireForLive: true,
  });
  const sandboxMismatch = auth.bridge.mode === "sandbox" && guard.ok && guard.match === false;

  if (!guard.ok || sandboxMismatch) {
    const expected = auth.bridge.expected_company_file;
    const reported = heartbeat.company_file;
    try {
      await stampBridgeSeen(auth.bridge.id, heartbeat, {
        last_error: mismatchErrorMessage(expected, reported),
      });
    } catch {
      // File refusal still wins.
    }
    return NextResponse.json(
      {
        ok: false,
        error: "company_file_mismatch",
        expected_company_file: expected,
        reported_company_file: reported,
      },
      { status: 409 },
    );
  }

  try {
    const upserted = await ingestQbMirrors(parsed.data);
    await stampBridgeSeen(auth.bridge.id, heartbeat, {
      last_error: heartbeat.error,
      last_mirror_at: mirrorKeysPresent(parsed.data) ? new Date().toISOString() : undefined,
    });
    return NextResponse.json({ ok: true, upserted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mirror ingest failed.";
    console.error("[qb] mirror ingest failed:", error);
    try {
      await stampBridgeSeen(auth.bridge.id, heartbeat, { last_error: message });
    } catch {
      // Primary error is the ingest failure.
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
