// Gate for the VoIP rate card (R50 / company knowledge 3.12): worked figures,
// schema (numbers/seats/ports), residential seat lock, RPC args, and Stripe
// catalog prices including the one-time port fee.
//
//   node --env-file=.env.local --import ./scripts/register-ts-alias.mjs scripts/voip-check.mjs
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  voipMonthlyCents,
  voipPortFeeCents,
  voipUnchargedPorts,
  withHstCents,
} from "@/lib/portal/billing.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures += 1;
}

const figures = [
  { name: "Residential 1 number 1 seat", tier: "residential", numbers: 1, seats: 1, preTax: 3499, withHst: 3954 },
  { name: "Commercial 1 number 1 seat", tier: "professional", numbers: 1, seats: 1, preTax: 5999, withHst: 6779 },
  { name: "Commercial 2 numbers 1 seat (Vision Care)", tier: "professional", numbers: 2, seats: 1, preTax: 6498, withHst: 7343 },
  { name: "Commercial 1 number 3 seats", tier: "professional", numbers: 1, seats: 3, preTax: 10997, withHst: 12427 },
];

for (const row of figures) {
  const preTax = voipMonthlyCents({
    tier: row.tier,
    numberCount: row.numbers,
    seatCount: row.seats,
  });
  const taxed = withHstCents(preTax);
  check(`${row.name} pre-tax`, preTax === row.preTax, `${preTax} vs ${row.preTax}`);
  check(`${row.name} with HST`, taxed === row.withHst, `${taxed} vs ${row.withHst}`);
}

check("Residential seats are ignored", voipMonthlyCents({
  tier: "residential",
  numberCount: 1,
  seatCount: 4,
}) === 3499);
check("Port fee 2 numbers", voipPortFeeCents(2) === 9998);
check("Uncharged ports after a partial charge", voipUnchargedPorts(3, 1) === 2);
check("Uncharged ports after a full charge", voipUnchargedPorts(2, 2) === 0);

const { data: profileId, error: rpcError } = await admin.rpc("admin_create_client", {
  p_first_name: "VoIP",
  p_last_name: "Checkrun",
  p_email: "",
  p_address: "",
  p_monitoring_tier: "",
  p_cloud_tier: "",
  p_token_hash: `voip-check-${Date.now()}`,
  p_target_email: "",
  p_voip_tier: "professional",
  p_voip_numbers: 2,
  p_voip_seats: 3,
  p_voip_ports: 1,
});
check("admin_create_client accepts VoIP args", !rpcError && Boolean(profileId), rpcError?.message);

if (profileId) {
  const { data: service } = await admin
    .from("services")
    .select("id, service_type, tier, number_count, seat_count, port_count, port_fee_charged_count, billing_interval, monthly_amount_cents")
    .eq("profile_id", profileId)
    .eq("service_type", "voip")
    .maybeSingle();
  check("VoIP service row created", Boolean(service));
  check("professional plan stored", service?.tier === "professional");
  check("number_count stored (2)", service?.number_count === 2);
  check("seat_count stored (3)", service?.seat_count === 3);
  check("port_count stored (1)", service?.port_count === 1);
  check("port fee not yet charged", service?.port_fee_charged_count === 0);
  check("VoIP bills monthly", service?.billing_interval === "monthly");

  if (service) {
    const amount = voipMonthlyCents({
      tier: "professional",
      numberCount: 2,
      seatCount: 3,
    });
    const { error: amountError } = await admin
      .from("services")
      .update({ monthly_amount_cents: amount })
      .eq("id", service.id);
    check(`derived amount (${amount}) accepted`, !amountError, amountError?.message);

    const { error: junkError } = await admin
      .from("services")
      .update({ tier: "enterprise" })
      .eq("id", service.id);
    check("tier CHECK rejects unknown VoIP tier", Boolean(junkError), junkError?.code);

    const { error: zeroError } = await admin
      .from("services")
      .update({ number_count: 0 })
      .eq("id", service.id);
    check("number_count CHECK rejects 0", Boolean(zeroError), zeroError?.code);

    const { error: seatError } = await admin
      .from("services")
      .update({ tier: "residential", seat_count: 2, number_count: 1 })
      .eq("id", service.id);
    check("residential seat_count > 1 rejected", Boolean(seatError), seatError?.code);

    const { error: portsError } = await admin
      .from("services")
      .update({ port_count: 5, number_count: 2, seat_count: 3, tier: "professional" })
      .eq("id", service.id);
    check("port_count > number_count rejected", Boolean(portsError), portsError?.code);

    const { error: annualError } = await admin
      .from("services")
      .update({ billing_interval: "annual" })
      .eq("id", service.id);
    check("VoIP annual interval rejected", Boolean(annualError), annualError?.code);
  }

  const { error: cleanupError } = await admin.from("profiles").delete().eq("id", profileId);
  check("cleanup", !cleanupError, cleanupError?.message);
}

const stripeKey = process.env.STRIPE_SECRET_KEY;
const priceIds = {
  STRIPE_PRICE_VOIP_RESIDENTIAL: { cents: 3499, recurring: "month" },
  STRIPE_PRICE_VOIP_PROFESSIONAL: { cents: 5999, recurring: "month" },
  STRIPE_PRICE_VOIP_NUMBER_PORT: { cents: 4999, recurring: null },
};
if (!stripeKey) {
  check("Stripe configured", false, "STRIPE_SECRET_KEY missing");
} else {
  const stripe = new Stripe(stripeKey);
  for (const [envVar, expect] of Object.entries(priceIds)) {
    const id = process.env[envVar];
    if (!id) {
      check(`${envVar} set`, false);
      continue;
    }
    try {
      const price = await stripe.prices.retrieve(id);
      const recurringOk = expect.recurring
        ? price.recurring?.interval === expect.recurring
        : !price.recurring;
      const label = expect.recurring
        ? `$${(expect.cents / 100).toFixed(2)}/month CAD`
        : `$${(expect.cents / 100).toFixed(2)} one-time CAD`;
      check(
        `${envVar} is ${label}`,
        price.currency === "cad" && price.unit_amount === expect.cents && recurringOk,
        `${price.currency} ${price.unit_amount} /${price.recurring?.interval ?? "one-time"}`,
      );
    } catch (error) {
      check(`${envVar} resolves`, false, error.message);
    }
  }
}

console.log(failures === 0 ? "\nAll VoIP checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
