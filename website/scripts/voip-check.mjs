// One-shot gate for the VoIP service rail (R42): verifies the hosted schema
// accepts VoIP services, the per-line professional plan stores correctly, the
// tier CHECK rejects junk, the extended admin_create_client RPC works, and the
// Stripe price env vars resolve to real monthly CAD prices.
//
//   node --env-file=.env.local scripts/voip-check.mjs
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

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

// 1. RPC with a VoIP professional plan, 3 lines.
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
  p_voip_lines: 3,
});
check("admin_create_client accepts VoIP args", !rpcError && Boolean(profileId), rpcError?.message);

if (profileId) {
  const { data: service } = await admin
    .from("services")
    .select("id, service_type, tier, line_count, billing_interval, monthly_amount_cents")
    .eq("profile_id", profileId)
    .eq("service_type", "voip")
    .maybeSingle();
  check("VoIP service row created", Boolean(service));
  check("professional plan stored", service?.tier === "professional");
  check("line_count stored (3)", service?.line_count === 3);
  check("VoIP bills monthly", service?.billing_interval === "monthly");

  // 2. Amount prefill happens app-side (createClientAction); emulate it here
  // and confirm the column takes the per-line total.
  if (service) {
    const { error: amountError } = await admin
      .from("services")
      .update({ monthly_amount_cents: 5999 * 3 })
      .eq("id", service.id);
    check("per-line amount (5999 x 3) accepted", !amountError, amountError?.message);
  }

  // 3. Tier CHECK rejects junk VoIP tiers.
  const { error: junkError } = await admin
    .from("services")
    .update({ tier: "enterprise" })
    .eq("id", service?.id ?? "");
  check("tier CHECK rejects unknown VoIP tier", Boolean(junkError), junkError?.code);

  // 4. line_count CHECK rejects zero.
  const { error: zeroError } = await admin
    .from("services")
    .update({ line_count: 0 })
    .eq("id", service?.id ?? "");
  check("line_count CHECK rejects 0", Boolean(zeroError), zeroError?.code);

  // Cleanup: cascade removes the service + invitation.
  const { error: cleanupError } = await admin.from("profiles").delete().eq("id", profileId);
  check("cleanup", !cleanupError, cleanupError?.message);
}

// 5. Stripe prices resolve and are monthly CAD at the confirmed rates.
const stripeKey = process.env.STRIPE_SECRET_KEY;
const priceIds = {
  STRIPE_PRICE_VOIP_RESIDENTIAL: 3499,
  STRIPE_PRICE_VOIP_PROFESSIONAL: 5999,
};
if (!stripeKey) {
  check("Stripe configured", false, "STRIPE_SECRET_KEY missing");
} else {
  const stripe = new Stripe(stripeKey);
  for (const [envVar, cents] of Object.entries(priceIds)) {
    const id = process.env[envVar];
    if (!id) {
      check(`${envVar} set`, false);
      continue;
    }
    try {
      const price = await stripe.prices.retrieve(id);
      check(
        `${envVar} is $${(cents / 100).toFixed(2)}/month CAD`,
        price.currency === "cad" && price.unit_amount === cents && price.recurring?.interval === "month",
        `${price.currency} ${price.unit_amount} /${price.recurring?.interval}`,
      );
    } catch (error) {
      check(`${envVar} resolves`, false, error.message);
    }
  }
}

console.log(failures === 0 ? "\nAll VoIP checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
