import "server-only";
import Stripe from "stripe";

/**
 * Stripe integration (PORTAL_PLAN.md 9.1). Lazy client so builds and the
 * manual billing rail work before the Stripe account exists (D4). Price IDs
 * live server-side only, mapped from env vars, keyed (service_type, tier):
 *
 *   STRIPE_PRICE_MONITORING_BASIC / _STANDARD / _PRO
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
  "monitoring:basic": "STRIPE_PRICE_MONITORING_BASIC",
  "monitoring:standard": "STRIPE_PRICE_MONITORING_STANDARD",
  "monitoring:pro": "STRIPE_PRICE_MONITORING_PRO",
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
