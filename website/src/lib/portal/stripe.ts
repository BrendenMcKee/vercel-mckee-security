import "server-only";
import Stripe from "stripe";

/**
 * Stripe integration (PORTAL_PLAN.md 9.1). Lazy client so builds and the
 * manual billing rail work before the Stripe account exists (D4). Price IDs
 * live server-side only, mapped from env vars, keyed (service_type, tier):
 *
 *   STRIPE_PRICE_MONITORING_LANDLINE / _CELLULAR / _CELLULAR_TC / _CELLULAR_TC_HOME
 *     (annual-interval prices: 12 x the monthly rate, plus tax via Stripe Tax
 *      or a tax rate — monitoring is invoiced annually per the site terms)
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
      return { serviceType, tier };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Customer portal configuration: clients can see their card-payment history
// and update their card, but NEVER cancel or change plans themselves (R21 —
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
        headline: "McKee Security — billing and payment history",
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
