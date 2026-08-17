import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getPortalAdminClient, isPortalAdminConfigured } from "@/lib/portal/supabase/admin";
import type { Database } from "@/lib/portal/database.types";

export const QB_BRIDGE_ID_HEADER = "x-qb-bridge-id";

export type QbBridgeRow = Database["public"]["Tables"]["qb_bridges"]["Row"];

export type AuthorizedQbBridge = Pick<
  QbBridgeRow,
  | "id"
  | "label"
  | "mode"
  | "expected_company_file"
  | "qb_company_file"
  | "qb_company_name"
  | "qb_version"
>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DUMMY_HASH_BYTES = Buffer.from(hashBridgeSecret("qb-bridge-missing"), "hex");

export function hashBridgeSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

function hashBytes(hex: string): Buffer | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  return Buffer.from(hex, "hex");
}

function hashesEqual(a: string, b: string): boolean {
  const left = hashBytes(a);
  const right = hashBytes(b);
  const compared = timingSafeEqual(left ?? DUMMY_HASH_BYTES, right ?? DUMMY_HASH_BYTES);
  return Boolean(left && right && compared);
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

/**
 * Per-bridge secret auth (PORTAL_PLAN.md 9.5.1). Same model as camera
 * gateways: raw secret stays on the office PC; only the SHA-256 hash is
 * stored. Requires `Authorization: Bearer` and `X-QB-Bridge-Id`.
 */
export async function authorizeQbBridge(
  request: Request,
): Promise<{ ok: true; bridge: AuthorizedQbBridge } | { ok: false; response: NextResponse }> {
  if (!isPortalAdminConfigured()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "QuickBooks bridge is not configured." }, { status: 503 }),
    };
  }

  const header = request.headers.get("authorization");
  const bearer = header?.match(/^Bearer\s+(.+)$/i);
  const secret = bearer?.[1]?.trim() ?? "";
  const bridgeId = request.headers.get(QB_BRIDGE_ID_HEADER)?.trim() ?? "";
  if (!secret || !UUID_RE.test(bridgeId)) {
    return { ok: false, response: unauthorized() };
  }

  const admin = getPortalAdminClient();
  const { data, error } = await admin
    .from("qb_bridges")
    .select(
      "id, label, mode, expected_company_file, qb_company_file, qb_company_name, qb_version, secret_hash",
    )
    .eq("id", bridgeId)
    .maybeSingle();

  if (error) {
    console.error("[qb] bridge lookup failed:", error);
    return {
      ok: false,
      response: NextResponse.json({ error: "Bridge lookup failed." }, { status: 500 }),
    };
  }

  const incomingHash = hashBridgeSecret(secret);
  const matches = hashesEqual(incomingHash, data?.secret_hash ?? "");
  if (!data || !matches) {
    return { ok: false, response: unauthorized() };
  }

  const allowed = await consumeBridgeRateLimit(data.id);
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Too many requests." }, { status: 429 }),
    };
  }

  return {
    ok: true,
    bridge: {
      id: data.id,
      label: data.label,
      mode: data.mode,
      expected_company_file: data.expected_company_file,
      qb_company_file: data.qb_company_file,
      qb_company_name: data.qb_company_name,
      qb_version: data.qb_version,
    },
  };
}

async function consumeBridgeRateLimit(bridgeId: string): Promise<boolean> {
  try {
    const admin = getPortalAdminClient();
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_key: `qb-bridge:${bridgeId}`,
      p_max: 120,
      p_window_seconds: 60,
    });
    if (error) {
      console.error("[qb] rate limit RPC failed (allowing request):", error);
      return true;
    }
    return data !== false;
  } catch (error) {
    console.error("[qb] rate limit check threw (allowing request):", error);
    return true;
  }
}
