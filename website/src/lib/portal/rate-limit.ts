import "server-only";
import { headers } from "next/headers";
import { getPortalAdminClient, isPortalAdminConfigured } from "@/lib/portal/supabase/admin";

/**
 * Per-IP rate limiting for the anonymous activation surface (PORTAL_PLAN.md
 * 6.6): a Postgres counter behind the service-role-only consume_rate_limit
 * RPC. Serverless instances share no memory, so the counter lives in the DB.
 *
 * Fail-open: if the RPC errors (DB blip), the request proceeds; activation
 * links are already single-use hashed tokens, so rate limiting is a brake on
 * enumeration, not the security boundary.
 */

export const RATE_LIMIT_MESSAGE =
  "Too many attempts from your network. Please wait a few minutes and try again.";

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Returns true when the request is allowed. `bucket` names the endpoint
 * (e.g. "activate"), `max` requests per `windowSeconds` per IP.
 */
export async function checkRateLimit(
  bucket: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!isPortalAdminConfigured()) return true;
  try {
    const ip = await getClientIp();
    const admin = getPortalAdminClient();
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_key: `${bucket}:${ip}`,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[portal] rate limit RPC failed (allowing request):", error);
      return true;
    }
    if (data === false) {
      // Observability (handover 22.3): denials are logged without credentials.
      console.warn(`[portal] rate limit exceeded: bucket=${bucket} ip=${ip}`);
    }
    return data !== false;
  } catch (error) {
    console.error("[portal] rate limit check threw (allowing request):", error);
    return true;
  }
}
