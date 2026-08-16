/**
 * Lanvac station fields and people-list limits.
 * Police / fire / ambulance are not portal contacts. They are written later
 * via usePoliceNumbers + this city. People map to E1/E2/… from sort_order.
 *
 * Later API write (not wired yet) reads server-only Vercel env
 * (set 2026-08-16): LANVAC_API_BASE, LANVAC_DEALER_ACCOUNT,
 * LANVAC_DEALER_PASSWORD. Never NEXT_PUBLIC_. Password is the WinLinks
 * dealer password. Setting the env does not turn on writes.
 */

import { isLanvacDirectoryCity } from "@/lib/portal/lanvac-cities";

export const LANVAC_ACCOUNT_CODE_PATTERN = /^[0-9A-Za-z]{1,2}[0-9A-Fa-f]{4}$/;
export const LANVAC_ACCOUNT_CODE_MAX = 6;
/** Room to paste O-5985 or similar; we store the 5–6 character CODE. */
export const LANVAC_ACCOUNT_CODE_INPUT_MAX = 12;
export const LANVAC_CITY_MAX = 240;
/** Lanvac `name` max. */
export const LANVAC_CONTACT_NAME_MAX = 30;
/**
 * Lanvac `note` max is 24. We store passcode and later write `PW:{passcode}`.
 */
export const LANVAC_PASSCODE_MAX = 21;

/**
 * Strip dashes/spaces/dots and add the leading O when the admin typed only
 * the four hex digits (5985 → O5985). McKee codes are almost all O + 4 hex.
 */
export function normalizeLanvacAccountInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[\s.\-_]/g, "");
  if (/^[0-9A-F]{4}$/.test(cleaned)) return `O${cleaned}`;
  return cleaned;
}

export function parseLanvacAccountCode(
  raw: string,
  options: { required?: boolean } = {},
): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = normalizeLanvacAccountInput(raw);
  if (!value) {
    return options.required
      ? { ok: false, error: "Lanvac account number is required for security monitoring." }
      : { ok: true, value: null };
  }
  if (!LANVAC_ACCOUNT_CODE_PATTERN.test(value)) {
    return {
      ok: false,
      error: "Lanvac account number must look like O5985. Dashes are fine; include the leading O if the export has one.",
    };
  }
  return { ok: true, value };
}

export function parseLanvacCity(
  raw: string,
  options: { required?: boolean } = {},
): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) {
    return options.required
      ? { ok: false, error: "Dispatch city is required for security monitoring." }
      : { ok: true, value: null };
  }
  if (value.length > LANVAC_CITY_MAX) {
    return { ok: false, error: `Dispatch city is too long (${LANVAC_CITY_MAX} max).` };
  }
  if (!isLanvacDirectoryCity(value)) {
    return { ok: false, error: "Pick a dispatch city from the Lanvac list." };
  }
  return { ok: true, value };
}
