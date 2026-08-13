import "server-only";
import Stripe from "stripe";
import { voipInvoiceDescription } from "@/lib/portal/billing";

/**
 * Stripe integration (PORTAL_PLAN.md 9.1). Lazy client so builds and the
 * manual billing rail work before the Stripe account exists (D4). Price IDs
 * live server-side only, mapped from env vars, keyed (service_type, tier):
 *
 *   STRIPE_PRICE_MONITORING_LANDLINE / _CELLULAR / _CELLULAR_TC / _CELLULAR_TC_HOME
 *     (annual-interval prices: 12 x the monthly rate, plus tax via Stripe Tax
 *      or a tax rate; monitoring is invoiced annually per the site terms)
 *   STRIPE_PRICE_VOIP_RESIDENTIAL / _PROFESSIONAL
 *     (monthly-interval catalog prices for the base system: 1 number + 1 seat.
 *      Configurations above the base reuse the same product and a matching
 *      monthly CAD price at the derived total; quantity is always 1. R50)
 *   STRIPE_PRICE_VOIP_NUMBER_PORT
 *     (one-time CAD price, $49.99 per number ported; never on the subscription)
 *   STRIPE_PRICE_CLOUD_7DAY / _30DAY / _90DAY   (Track 2; test mode only)
 *
 * Client code never sees or sends price IDs; checkout reads the admin-assigned
 * tier from the database (anti-spoofing, handover 9.3).
 */

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured.");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

const PRICE_ENV_KEYS: Record<string, string> = {
  "monitoring:landline": "STRIPE_PRICE_MONITORING_LANDLINE",
  "monitoring:cellular": "STRIPE_PRICE_MONITORING_CELLULAR",
  "monitoring:cellular_tc": "STRIPE_PRICE_MONITORING_CELLULAR_TC",
  "monitoring:cellular_tc_home": "STRIPE_PRICE_MONITORING_CELLULAR_TC_HOME",
  "voip:residential": "STRIPE_PRICE_VOIP_RESIDENTIAL",
  "voip:professional": "STRIPE_PRICE_VOIP_PROFESSIONAL",
  "voip:number_port": "STRIPE_PRICE_VOIP_NUMBER_PORT",
  "cloud_backup:7day": "STRIPE_PRICE_CLOUD_7DAY",
  "cloud_backup:30day": "STRIPE_PRICE_CLOUD_30DAY",
  "cloud_backup:90day": "STRIPE_PRICE_CLOUD_90DAY",
};

export function priceIdFor(serviceType: string, tier: string): string | null {
  const envKey = PRICE_ENV_KEYS[`${serviceType}:${tier}`];
  if (!envKey) return null;
  return process.env[envKey] || null;
}

/** Reverse lookup for subscription.updated tier sync. */
export function tierForPriceId(priceId: string): { serviceType: string; tier: string } | null {
  for (const [key, envKey] of Object.entries(PRICE_ENV_KEYS)) {
    if (process.env[envKey] === priceId) {
      const [serviceType, tier] = key.split(":");
      if (tier === "number_port") return null;
      return { serviceType, tier };
    }
  }
  return null;
}

export function voipNumberPortPriceId(): string | null {
  return process.env.STRIPE_PRICE_VOIP_NUMBER_PORT || null;
}

/**
 * One subscription, one line item (R50). Finds or creates a monthly CAD price
 * on the VoIP product at the derived total so add-ons are never separate
 * Stripe lines. Quantity at checkout is always 1.
 */
export async function priceForVoipAmount(params: {
  tier: string;
  amountCents: number;
  numberCount: number;
  seatCount: number;
}): Promise<string> {
  const stripe = getStripeClient();
  const catalogPriceId = priceIdFor("voip", params.tier);
  if (!catalogPriceId) {
    throw new Error("VoIP product is not configured in Stripe.");
  }
  const catalog = await stripe.prices.retrieve(catalogPriceId);
  if (catalog.unit_amount === params.amountCents && catalog.recurring?.interval === "month") {
    return catalog.id;
  }
  const productId = typeof catalog.product === "string" ? catalog.product : catalog.product.id;
  const existing = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const match = existing.data.find(
    (price) =>
      price.currency === "cad" &&
      price.unit_amount === params.amountCents &&
      price.recurring?.interval === "month" &&
      price.recurring.interval_count === 1,
  );
  if (match) return match.id;

  const created = await stripe.prices.create({
    product: productId,
    currency: "cad",
    unit_amount: params.amountCents,
    recurring: { interval: "month" },
    nickname: voipInvoiceDescription({
      tier: params.tier,
      numberCount: params.numberCount,
      seatCount: params.seatCount,
    }),
    metadata: {
      marker: params.tier === "residential" ? "mckee_voip_residential" : "mckee_voip_professional",
      number_count: String(params.numberCount),
      seat_count: String(params.seatCount),
    },
  });
  return created.id;
}

// ---------------------------------------------------------------------------
// Customer portal configuration: clients can see their card-payment history
// and update their card, but NEVER cancel or change plans themselves (R21;
// service changes go through McKee). Created once via the API, found again by
// its metadata marker, and cached for the life of the server process.
// ---------------------------------------------------------------------------

const PORTAL_CONFIG_MARKER = "mckee-client-portal";
let portalConfigurationId: string | null = null;

export async function getBillingPortalConfigurationId(stripe: Stripe): Promise<string | null> {
  if (portalConfigurationId) return portalConfigurationId;

  try {
    const existing = await stripe.billingPortal.configurations.list({ limit: 100 });
    const match = existing.data.find(
      (c) => c.active && c.metadata?.marker === PORTAL_CONFIG_MARKER,
    );
    if (match) {
      portalConfigurationId = match.id;
      return match.id;
    }

    const created = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: "McKee Security billing and payment history",
      },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: false },
        subscription_cancel: { enabled: false },
        subscription_update: { enabled: false },
      },
      metadata: { marker: PORTAL_CONFIG_MARKER },
    });
    portalConfigurationId = created.id;
    return created.id;
  } catch (error) {
    // Fall back to the account's default portal configuration if one exists.
    console.error("[portal] billing portal configuration setup failed:", error);
    return null;
  }
}
