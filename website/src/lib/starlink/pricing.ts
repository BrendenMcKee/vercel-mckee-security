/**
 * Base rental rates for Starlink kits. These are the pre-tax figures we quote
 * from — HST is added when we invoice. Profit still uses `amount_received`,
 * so a one-off discount or a tax-included quote never rewrites the P&L.
 */

export type RateTierInput = {
  min_days: number;
  max_days: number;
  amount: number;
};

/** Live card as of 2026-08-17. 11 days is $250; the $300 band starts at 12. */
export const DEFAULT_RATE_TIERS: RateTierInput[] = [
  { min_days: 1, max_days: 3, amount: 150 },
  { min_days: 4, max_days: 7, amount: 200 },
  { min_days: 8, max_days: 11, amount: 250 },
  { min_days: 12, max_days: 14, amount: 300 },
  { min_days: 15, max_days: 21, amount: 400 },
  { min_days: 22, max_days: 30, amount: 500 },
];

function asMoney(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function sortedTiers(tiers: RateTierInput[]): RateTierInput[] {
  return tiers
    .slice()
    .sort((a, b) => a.min_days - b.min_days || a.max_days - b.max_days);
}

/** Pre-tax quote for an inclusive day count, or null when no band covers it. */
export function quoteForDays(
  tiers: RateTierInput[],
  days: number,
): number | null {
  if (!Number.isFinite(days) || days < 1) return null;
  const match = sortedTiers(tiers).find(
    (tier) => days >= tier.min_days && days <= tier.max_days,
  );
  return match ? asMoney(match.amount) : null;
}

export function validateRateTiers(tiers: RateTierInput[]): string | null {
  if (tiers.length === 0) return "Add at least one rate.";
  const ordered = sortedTiers(tiers);
  for (let i = 0; i < ordered.length; i += 1) {
    const tier = ordered[i];
    if (!Number.isInteger(tier.min_days) || tier.min_days < 1) {
      return "Day ranges start at 1.";
    }
    if (!Number.isInteger(tier.max_days) || tier.max_days < tier.min_days) {
      return "Each range needs a last day on or after the first.";
    }
    if (!Number.isFinite(tier.amount) || tier.amount < 0) {
      return "Each rate must be an amount, for example 150.";
    }
    if (i > 0 && tier.min_days <= ordered[i - 1].max_days) {
      return `Day ranges overlap at ${tier.min_days} days.`;
    }
  }
  return null;
}

export function formatTierRange(
  tier: Pick<RateTierInput, "min_days" | "max_days">,
): string {
  if (tier.min_days === tier.max_days) {
    return `${tier.min_days} day`;
  }
  return `${tier.min_days} to ${tier.max_days} days`;
}
