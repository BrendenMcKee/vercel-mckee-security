// One-shot: create/update the VoIP products + monthly CAD catalog prices
// and the one-time Number Port Fee price in Stripe (R50 / company knowledge 3.12).
// Idempotent: products are found again by their metadata marker, so re-runs
// never duplicate (name/description are re-synced on existing products).
// Prints the env var lines to add.
//
//   node --env-file=.env.local scripts/stripe-voip-setup.mjs
//
// Catalog prices are the base system only (1 number + 1 seat). Configurations
// above the base reuse the same product with a matching monthly CAD price at
// the derived total (quantity is always 1). The port fee is never on the
// subscription.
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set. Run with --env-file=.env.local");
  process.exit(1);
}
const stripe = new Stripe(key);
const mode = key.startsWith("sk_live") ? "LIVE" : "test";
console.log(`Stripe mode: ${mode}`);

const PLANS = [
  {
    marker: "mckee_voip_residential",
    envVar: "STRIPE_PRICE_VOIP_RESIDENTIAL",
    name: "McKee Security VoIP Residential",
    description:
      "Residential VoIP Service, base system per month. Includes 1 number and 1 user seat. Additional numbers are $4.99 each. Charged once per system, never per phone. Recurring is separate from installation.",
    unitAmount: 3499,
    recurring: true,
  },
  {
    marker: "mckee_voip_professional",
    envVar: "STRIPE_PRICE_VOIP_PROFESSIONAL",
    name: "McKee Security VoIP Commercial",
    description:
      "Commercial VoIP Service, base system per month. Includes 1 number and 1 user seat. Additional numbers $4.99. Additional seats $24.99. Charged once per system, never per phone. Recurring is separate from installation.",
    unitAmount: 5999,
    recurring: true,
  },
  {
    marker: "mckee_voip_number_port",
    envVar: "STRIPE_PRICE_VOIP_NUMBER_PORT",
    name: "McKee Security VoIP Number Port Fee",
    description:
      "One-time fee per number ported onto a McKee VoIP system. Not recurring. Never part of the monthly subscription or an installation invoice total.",
    unitAmount: 4999,
    recurring: false,
  },
];

const envLines = [];

for (const plan of PLANS) {
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

  envLines.push(`${plan.envVar}=${price.id}`);
}

console.log("\nAdd to website/.env.local AND the Vercel project env:\n");
for (const line of envLines) console.log(line);
