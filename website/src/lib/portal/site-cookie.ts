/** Cookie / `?site=` helpers. No `server-only` so middleware can import this. */

export const PORTAL_SITE_COOKIE = "portal_selected_site";

export const PORTAL_SITE_HEADER = "x-portal-selected-site";

export const SITE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function asSiteId(value: string | null | undefined): string | null {
  if (!value || !SITE_ID_RE.test(value)) return null;
  return value;
}
