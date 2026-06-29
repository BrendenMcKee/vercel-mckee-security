/** Client-safe formatting helpers for the Starlink admin UI. */

/** Convert a #rrggbb hex color to an rgba() string with the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return `rgba(148,163,184,${alpha})`;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return cad.format(value);
}

function partsFromIso(iso: string): [number, number, number] | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return [y, m, d];
}

export function formatDateMedium(iso: string): string {
  const parts = partsFromIso(iso);
  if (!parts) return iso;
  const [y, m, d] = parts;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateShort(iso: string): string {
  const parts = partsFromIso(iso);
  if (!parts) return iso;
  const [y, m, d] = parts;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Relative humanized timestamp, e.g. "2 days ago" or "just now". */
export function formatRelative(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return "—";
  const then = Date.parse(isoTimestamp);
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  return `${months} mo ago`;
}
