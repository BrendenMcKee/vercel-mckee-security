import crypto from "node:crypto";

/**
 * Server-side password gate for the Data Drops tool.
 *
 * The page-level "standard access password" lives only in a Vercel env var
 * (`DATA_DROPS_PASSWORD`). When a visitor submits the correct password we set an
 * httpOnly cookie whose value is an opaque token derived from the password, so
 * rotating the password automatically invalidates existing sessions. The token
 * never exposes the password and is verified with a constant-time comparison.
 *
 * This is intentionally separate from the AWS-side admin deletion password,
 * which the UI only collects and forwards to the backend.
 */

export const DD_COOKIE = "dd_auth";
export const DD_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sha256(input: string): Buffer {
  return crypto.createHash("sha256").update(input).digest();
}

/** Constant-time comparison over fixed-length digests (avoids length leaks). */
function safeEqual(a: string, b: string): boolean {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

/**
 * The opaque cookie token issued once a visitor unlocks. Derived from the
 * password (optionally salted with `DATA_DROPS_AUTH_SECRET`) so a password change
 * invalidates old cookies. Returns null when the gate is not configured.
 */
export function expectedAuthToken(): string | null {
  const password = process.env.DATA_DROPS_PASSWORD;
  if (!password) return null;
  const secret = process.env.DATA_DROPS_AUTH_SECRET ?? "";
  return crypto
    .createHmac("sha256", `${password}:${secret}`)
    .update("data-drops-unlock-v1")
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
  const password = process.env.DATA_DROPS_PASSWORD;
  if (!password || typeof submitted !== "string" || submitted.length === 0) {
    return false;
  }
  return safeEqual(submitted, password);
}

export function isGateConfigured(): boolean {
  return Boolean(process.env.DATA_DROPS_PASSWORD);
}
