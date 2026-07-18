// One-shot: create the VoIP products + monthly CAD prices in Stripe (R42).
// Idempotent: products are found again by their metadata marker, so re-runs
// never duplicate (name/description are re-synced on existing products).
// Prints the env var lines to add.
//
//   node --env-file=.env.local scripts/stripe-voip-setup.mjs
//
// Pricing (stakeholder 2026-07-18, interim while the tier structure settles).
// EVERY plan is PER LINE (subscription quantity = the service's line_count):
//   residential                          $34.99/month + tax per line
//   professional (displayed "Business")  $59.99/month + tax per line
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
      "Residential VoIP phone service, billed per line. Unlimited Canada-wide calling, all features included.",
    unitAmount: 3499,
  },
  {
    marker: "mckee_voip_professional",
    envVar: "STRIPE_PRICE_VOIP_PROFESSIONAL",
    name: "McKee Security VoIP Business",
    description: "Business VoIP phone service, billed per line.",
    unitAmount: 5999,
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
      console.log(`Product renamed: ${product.name} (${product.id})`);
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
  let price = prices.data.find(
    (p) =>
      p.currency === "cad" &&
      p.unit_amount === plan.unitAmount &&
      p.recurring?.interval === "month" &&
      p.recurring?.interval_count === 1,
  );
  if (price) {
    console.log(`Price exists: ${price.id} ($${(plan.unitAmount / 100).toFixed(2)}/month CAD)`);
  } else {
    price = await stripe.prices.create({
      product: product.id,
      currency: "cad",
      unit_amount: plan.unitAmount,
      recurring: { interval: "month" },
      metadata: { marker: plan.marker },
    });
    console.log(`Price created: ${price.id} ($${(plan.unitAmount / 100).toFixed(2)}/month CAD)`);
  }

  envLines.push(`${plan.envVar}=${price.id}`);
}

console.log("\nAdd to website/.env.local AND the Vercel project env:\n");
for (const line of envLines) console.log(line);
