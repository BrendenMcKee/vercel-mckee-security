import "server-only";
import Stripe from "stripe";
import { voipInvoiceDescription } from "@/lib/portal/billing";
import {
  VOIP_STRIPE_CATALOG,
  voipCatalogKindForTier,
  tierFromVoipMarker,
  type VoipCatalogKind,
} from "@/lib/portal/voip-stripe-catalog";

/**
 * Stripe integration (PORTAL_PLAN.md 9.1). Lazy client so builds and the
 * manual billing rail work before the Stripe account exists (D4).
 *
 * Monitoring (and Track 2 cloud) price IDs still come from env vars:
 *   STRIPE_PRICE_MONITORING_LANDLINE / _CELLULAR / _CELLULAR_TC / _CELLULAR_TC_HOME
 *   STRIPE_PRICE_CLOUD_7DAY / _30DAY / _90DAY
 *
 * VoIP catalog prices (Residential / Commercial bases + Number Port Fee) are
 * found or created by Stripe metadata marker. Optional STRIPE_PRICE_VOIP_*
 * env vars override if set. Configurations above the VoIP base reuse the
 * same product with a matching monthly CAD price at the derived total
 * (quantity 1). Client code never sees or sends price IDs.
 */

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Stripe wants trial_end at least 48h out; use it only when clearly future. */
export function trialEndFor(nextDueOn: string | null): number | undefined {
  if (!nextDueOn) return undefined;
  const dueMs = new Date(`${nextDueOn}T12:00:00Z`).getTime();
  if (dueMs - Date.now() < 3 * 86_400_000) return undefined;
  return Math.floor(dueMs / 1000);
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

/**
 * One portal **site**, one Stripe customer. Reuse this site's stored id, or
 * an existing Stripe customer whose metadata.profile_id is this site.
 * Never pick "first / has-card customer with this email" — two sites may
 * share a contact email after R53.
 */
export async function findOrCreateStripeCustomer(input: {
  existingCustomerId: string | null;
  profileId: string;
  email: string | null;
  name: string;
}): Promise<string> {
  const stripe = getStripeClient();

  if (input.existingCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(input.existingCustomerId);
      if (!existing.deleted) return existing.id;
    } catch {
      // Stored id is gone in Stripe; fall through to a matching metadata row or create.
    }
  }

  if (input.email) {
    const listed = await stripe.customers.list({ email: input.email, limit: 10 });
    const match = listed.data.find((customer) => customer.metadata?.profile_id === input.profileId);
    if (match) {
      await stripe.customers.update(match.id, {
        name: input.name,
        email: input.email,
        metadata: {
          ...match.metadata,
          profile_id: input.profileId,
          portal_deleted_at: "",
        },
      });
      return match.id;
    }
  }

  const created = await stripe.customers.create({
    email: input.email ?? undefined,
    name: input.name,
    metadata: { profile_id: input.profileId },
  });
  return created.id;
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
export function tierForPriceId(
  priceId: string,
  metadata?: Stripe.Metadata | null,
): { serviceType: string; tier: string } | null {
  for (const [key, envKey] of Object.entries(PRICE_ENV_KEYS)) {
    if (process.env[envKey] === priceId) {
      const [serviceType, tier] = key.split(":");
      return { serviceType, tier };
    }
  }
  for (const [kind, spec] of Object.entries(VOIP_STRIPE_CATALOG)) {
    if (kind === "number_port") continue;
    if (process.env[spec.envVar] === priceId) {
      return { serviceType: "voip", tier: kind };
    }
  }
  return tierFromVoipMarker(metadata?.marker);
}

const voipCatalogCache = new Map<VoipCatalogKind, string>();

/**
 * VoIP catalog price: optional env override, otherwise find or create by
 * metadata marker so Vercel does not need these IDs pasted in.
 */
export async function resolveVoipCatalogPriceId(kind: VoipCatalogKind): Promise<string> {
  const cached = voipCatalogCache.get(kind);
  if (cached) return cached;

  const spec = VOIP_STRIPE_CATALOG[kind];
  const fromEnv = process.env[spec.envVar];
  if (fromEnv) {
    voipCatalogCache.set(kind, fromEnv);
    return fromEnv;
  }

  const stripe = getStripeClient();
  const found = await stripe.products.search({
    query: `metadata['marker']:'${spec.marker}' AND active:'true'`,
  });
  let product = found.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: spec.name,
      description: spec.description,
      metadata: { marker: spec.marker },
    });
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const match = prices.data.find((price) => {
    if (price.currency !== "cad" || price.unit_amount !== spec.unitAmount) return false;
    if (spec.recurring) {
      return price.recurring?.interval === "month" && price.recurring.interval_count === 1;
    }
    return !price.recurring;
  });
  if (match) {
    voipCatalogCache.set(kind, match.id);
    return match.id;
  }

  const created = await stripe.prices.create({
    product: product.id,
    currency: "cad",
    unit_amount: spec.unitAmount,
    ...(spec.recurring ? { recurring: { interval: "month" as const } } : {}),
    metadata: { marker: spec.marker },
  });
  voipCatalogCache.set(kind, created.id);
  return created.id;
}

export async function resolveVoipNumberPortPriceId(): Promise<string> {
  return resolveVoipCatalogPriceId("number_port");
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
  const kind = voipCatalogKindForTier(params.tier);
  if (!kind) {
    throw new Error("VoIP product is not configured in Stripe.");
  }
  const stripe = getStripeClient();
  const catalogPriceId = await resolveVoipCatalogPriceId(kind);
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
