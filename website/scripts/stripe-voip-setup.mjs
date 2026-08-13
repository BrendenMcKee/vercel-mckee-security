// One-shot: create/update the VoIP products + monthly CAD catalog prices
// and the one-time Number Port Fee price in Stripe (R50 / company knowledge 3.12).
// Idempotent: products are found again by their metadata marker, so re-runs
// never duplicate (name/description are re-synced on existing products).
//
// The portal finds these prices by the same marker at runtime. You do not
// need to paste price IDs into Vercel. Optional STRIPE_PRICE_VOIP_* env
// vars still override if you set them.
//
//   node --env-file=.env.local --import ./scripts/register-ts-alias.mjs scripts/stripe-voip-setup.mjs
import Stripe from "stripe";
import { VOIP_STRIPE_CATALOG } from "@/lib/portal/voip-stripe-catalog.ts";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set. Run with --env-file=.env.local");
  process.exit(1);
}
const stripe = new Stripe(key);
const mode = key.startsWith("sk_live") ? "LIVE" : "test";
console.log(`Stripe mode: ${mode}`);

for (const plan of Object.values(VOIP_STRIPE_CATALOG)) {
  const existing = await stripe.products.search({
    query: `metadata['marker']:'${plan.marker}' AND active:'true'`,
  });
  let product = existing.data[0];
  if (product) {
    if (product.name !== plan.name || product.description !== plan.description) {
      product = await stripe.products.update(product.id, {
        name: plan.name,
        description: plan.description,
      });
      console.log(`Product updated: ${product.name} (${product.id})`);
    } else {
      console.log(`Product exists: ${product.name} (${product.id})`);
    }
  } else {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: { marker: plan.marker },
    });
    console.log(`Product created: ${product.name} (${product.id})`);
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = prices.data.find((p) => {
    const amountOk = p.currency === "cad" && p.unit_amount === plan.unitAmount;
    if (!amountOk) return false;
    if (plan.recurring) {
      return p.recurring?.interval === "month" && p.recurring.interval_count === 1;
    }
    return !p.recurring;
  });
  if (price) {
    const cadence = plan.recurring ? "/month CAD" : " one-time CAD";
    console.log(`Price exists: ${price.id} ($${(plan.unitAmount / 100).toFixed(2)}${cadence})`);
  } else {
    price = await stripe.prices.create({
      product: product.id,
      currency: "cad",
      unit_amount: plan.unitAmount,
      ...(plan.recurring ? { recurring: { interval: "month" } } : {}),
      metadata: { marker: plan.marker },
    });
    const cadence = plan.recurring ? "/month CAD" : " one-time CAD";
    console.log(`Price created: ${price.id} ($${(plan.unitAmount / 100).toFixed(2)}${cadence})`);
  }
}

console.log("\nCatalog is live. The portal finds these prices by metadata marker.");
console.log("No Vercel env vars needed. Optional overrides if you ever want them:");
for (const plan of Object.values(VOIP_STRIPE_CATALOG)) {
  console.log(`  ${plan.envVar}`);
}
