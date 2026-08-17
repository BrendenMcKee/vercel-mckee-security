// Create or rotate the sandbox QuickBooks bridge row (PORTAL_PLAN.md 8A).
// Run: node --env-file=.env.local scripts/qb-bridge-register.mjs
//      node --env-file=.env.local scripts/qb-bridge-register.mjs --rotate
//
// Prints the raw secret once. Store it on DennisPC later; it is not a Vercel
// env var. The hash is what lands in qb_bridges.secret_hash.

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const OFFICE_LABEL = "Office QuickBooks PC";
const PORTAL_TEST_COMPANY_FILE =
  "C:\\Users\\Public\\Documents\\Intuit\\QuickBooks\\PORTAL-TEST\\McKee Security PORTAL-TEST do-not-invoice.QBW";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const rotate = process.argv.includes("--rotate");
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existing, error: selectError } = await admin
  .from("qb_bridges")
  .select("id, label, mode, expected_company_file")
  .eq("label", OFFICE_LABEL)
  .maybeSingle();
if (selectError) throw selectError;

if (existing && !rotate) {
  console.log(`Bridge already exists (${existing.id}).`);
  console.log(`mode=${existing.mode}`);
  console.log(`expected_company_file=${existing.expected_company_file}`);
  console.log("Re-run with --rotate to issue a new secret. The old secret will stop working.");
  process.exit(0);
}

const secret = randomBytes(32).toString("base64url");
const secret_hash = createHash("sha256").update(secret, "utf8").digest("hex");

if (existing && rotate) {
  const { error } = await admin
    .from("qb_bridges")
    .update({
      secret_hash,
      mode: "sandbox",
      expected_company_file: PORTAL_TEST_COMPANY_FILE,
      last_error: null,
    })
    .eq("id", existing.id);
  if (error) throw error;
  console.log(`Rotated secret for bridge ${existing.id}.`);
  console.log(`X-QB-Bridge-Id: ${existing.id}`);
  console.log(`Authorization: Bearer ${secret}`);
  process.exit(0);
}

const { data, error } = await admin
  .from("qb_bridges")
  .insert({
    label: OFFICE_LABEL,
    secret_hash,
    mode: "sandbox",
    expected_company_file: PORTAL_TEST_COMPANY_FILE,
  })
  .select("id")
  .single();
if (error) throw error;

console.log(`Created sandbox bridge ${data.id}.`);
console.log(`expected_company_file=${PORTAL_TEST_COMPANY_FILE}`);
console.log(`X-QB-Bridge-Id: ${data.id}`);
console.log(`Authorization: Bearer ${secret}`);
console.log("Store the bearer secret on the office PC only. It is not a Vercel env var.");
