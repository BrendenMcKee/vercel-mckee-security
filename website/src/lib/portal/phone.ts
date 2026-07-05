/**
 * NANP phone handling for caller ID lists (PORTAL_PLAN.md 4.2): normalized
 * storage form is E.164 `+1NXXNXXXXXX`, mirrored by the DB CHECK constraint.
 */

const NANP_E164 = /^\+1[2-9]\d{9}$/;

/**
 * Normalize free-form input ("705-457-2156", "(705) 457 2156", "+1 705...")
 * to E.164. Returns null when the input is not a valid NANP number.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let national: string;
  if (digits.length === 10) {
    national = digits;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    national = digits.slice(1);
  } else {
    return null;
  }
  const e164 = `+1${national}`;
  return NANP_E164.test(e164) ? e164 : null;
}

/** `+17054572156` -> `(705) 457-2156` for display. */
export function formatPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (!m) return e164;
  return `(${m[1]}) ${m[2]}-${m[3]}`;
}
