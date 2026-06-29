import crypto from "node:crypto";

/**
 * Server-side password gate for the Starlink rental admin portal.
 *
 * Mirrors the Data Drops gate: a single shared password lives only in a Vercel
 * env var (`STARLINK_ADMIN_PASSWORD`). On a correct submission we set an httpOnly
 * cookie whose value is an opaque token derived from the password (optionally
 * salted with `STARLINK_ADMIN_AUTH_SECRET`), so rotating either value invalidates
 * existing sessions. The token never exposes the password and is verified with a
 * constant-time comparison.
 */

export const SL_ADMIN_COOKIE = "sl_admin_auth";
export const SL_ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sha256(input: string): Buffer {
  return crypto.createHash("sha256").update(input).digest();
}

/** Constant-time comparison over fixed-length digests (avoids length leaks). */
function safeEqual(a: string, b: string): boolean {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

/**
 * Opaque cookie token issued once an admin unlocks. Derived from the password so
 * a password change invalidates old cookies. Returns null when not configured.
 */
export function expectedAuthToken(): string | null {
  const password = process.env.STARLINK_ADMIN_PASSWORD;
  if (!password) return null;
  const secret = process.env.STARLINK_ADMIN_AUTH_SECRET ?? "";
  return crypto
    .createHmac("sha256", `${password}:${secret}`)
    .update("starlink-admin-unlock-v1")
    .digest("hex");
}

/** True when the request cookie matches the current expected token. */
export function isUnlocked(cookieValue: string | undefined | null): boolean {
  const expected = expectedAuthToken();
  if (!expected || !cookieValue) return false;
  return safeEqual(cookieValue, expected);
}

/** True when a submitted password matches the configured access password. */
export function isCorrectPassword(submitted: unknown): boolean {
  const password = process.env.STARLINK_ADMIN_PASSWORD;
  if (!password || typeof submitted !== "string" || submitted.length === 0) {
    return false;
  }
  return safeEqual(submitted, password);
}

export function isGateConfigured(): boolean {
  return Boolean(process.env.STARLINK_ADMIN_PASSWORD);
}
