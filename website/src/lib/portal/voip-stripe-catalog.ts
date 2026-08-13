/**
 * VoIP Stripe catalog (R50). Products and prices are found by metadata
 * marker, so the portal does not need Vercel env vars for these IDs.
 * Optional STRIPE_PRICE_VOIP_* overrides still win if set.
 */
export const VOIP_STRIPE_CATALOG = {
  residential: {
    marker: "mckee_voip_residential",
    envVar: "STRIPE_PRICE_VOIP_RESIDENTIAL",
    name: "McKee Security VoIP Residential",
    description:
      "Residential VoIP Service, base system per month. Includes 1 number and 1 user seat. Additional numbers are $4.99 each. Charged once per system, never per phone. Recurring is separate from installation.",
    unitAmount: 3499,
    recurring: true,
  },
  professional: {
    marker: "mckee_voip_professional",
    envVar: "STRIPE_PRICE_VOIP_PROFESSIONAL",
    name: "McKee Security VoIP Commercial",
    description:
      "Commercial VoIP Service, base system per month. Includes 1 number and 1 user seat. Additional numbers $4.99. Additional seats $24.99. Charged once per system, never per phone. Recurring is separate from installation.",
    unitAmount: 5999,
    recurring: true,
  },
  number_port: {
    marker: "mckee_voip_number_port",
    envVar: "STRIPE_PRICE_VOIP_NUMBER_PORT",
    name: "McKee Security VoIP Number Port Fee",
    description:
      "One-time fee per number ported onto a McKee VoIP system. Not recurring. Never part of the monthly subscription or an installation invoice total.",
    unitAmount: 4999,
    recurring: false,
  },
} as const;

export type VoipCatalogKind = keyof typeof VOIP_STRIPE_CATALOG;

export function voipCatalogKindForTier(tier: string): "residential" | "professional" | null {
  if (tier === "residential" || tier === "professional") return tier;
  return null;
}

export function tierFromVoipMarker(
  marker: string | null | undefined,
): { serviceType: "voip"; tier: "residential" | "professional" } | null {
  if (marker === VOIP_STRIPE_CATALOG.residential.marker) {
    return { serviceType: "voip", tier: "residential" };
  }
  if (marker === VOIP_STRIPE_CATALOG.professional.marker) {
    return { serviceType: "voip", tier: "professional" };
  }
  return null;
}
