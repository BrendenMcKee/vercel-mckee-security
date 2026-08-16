/**
 * Lanvac station fields and people-list limits.
 * Police / fire / ambulance are not portal contacts. They are written later
 * via usePoliceNumbers + this city. People map to E1/E2/… from sort_order.
 *
 * Later API write (not wired yet) reads server-only Vercel env:
 * LANVAC_API_BASE, LANVAC_DEALER_ACCOUNT, LANVAC_DEALER_PASSWORD.
 * Never NEXT_PUBLIC_. Password is the WinLinks dealer password.
 */

export const LANVAC_ACCOUNT_CODE_PATTERN = /^[0-9A-Za-z]{1,2}[0-9A-Fa-f]{4}$/;
export const LANVAC_ACCOUNT_CODE_MAX = 6;
export const LANVAC_CITY_MAX = 240;
/** Lanvac `name` max. */
export const LANVAC_CONTACT_NAME_MAX = 30;
/**
 * Lanvac `note` max is 24. We store passcode and later write `PW:{passcode}`.
 */
export const LANVAC_PASSCODE_MAX = 21;

export function parseLanvacAccountCode(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = raw.trim().toUpperCase();
  if (!value) return { ok: true, value: null };
  if (!LANVAC_ACCOUNT_CODE_PATTERN.test(value)) {
    return {
      ok: false,
      error: "Lanvac account must be 5 or 6 characters, like O5985. Include the leading O when the export has one.",
    };
  }
  return { ok: true, value };
}

export function parseLanvacCity(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: true, value: null };
  if (value.length > LANVAC_CITY_MAX) {
    return { ok: false, error: `Dispatch city is too long (${LANVAC_CITY_MAX} max).` };
  }
  return { ok: true, value };
}
