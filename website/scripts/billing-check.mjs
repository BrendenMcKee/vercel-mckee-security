// Phase 5 gate check (PORTAL_PLAN.md Phase 5 gate) — manual rail + RLS +
// webhook hardening. Stripe test-mode flows (checkout, webhook events, plan
// change/cancel sync) additionally require STRIPE_* env vars and are verified
// manually per the human checklist.
// Run: node --env-file=.env.local scripts/billing-check.mjs [baseUrl]
//
// Verifies with real sessions against the running server:
//  - manual_payments: admin INSERT works, client INSERT denied, client SELECT
//    sees only their own rows, ledger is append-only (UPDATE/DELETE affect 0
//    rows for everyone)
//  - billing_events: only service role writes; admin reads everything; client
//    reads only their own invoice.paid rows (payment history), nothing else
//  - unpaid manual service shows amount + payment instructions on the client
//    dashboard; unpaid stripe service shows Pay Now
//  - admin Billing tab renders both boards and flags the overdue manual row
//  - Overview renders billing KPI cards
//  - Stripe webhook endpoint rejects unsigned/unconfigured requests

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const baseUrl = process.argv[2] ?? "http://localhost:3101";
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !serviceKey || !publishableKey) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const failures = [];
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures.push(name);
}

function ssrClientWithJar() {
  const jar = new Map();
  const ssr = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach((c) => jar.set(c.name, c.value)),
    },
  });
  return { ssr, cookieHeader: () => [...jar].map(([n, v]) => `${n}=${v}`).join("; ") };
}

const stamp = Date.now();
const createdUsers = [];
const createdProfiles = [];
const createdEvents = [];

async function makeUser(role, firstName) {
  const email = `bill-check-${role}-${stamp}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUsers.push(data.user.id);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      user_id: data.user.id,
      first_name: firstName,
      last_name: "BillCheck",
      email,
      role,
      status: "active",
      password_set_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (profileError) throw profileError;
  createdProfiles.push(profile.id);
  return { email, password, profileId: profile.id, userId: data.user.id };
}

try {
  const clientUser = await makeUser("client", "Billina");
  const adminUser = await makeUser("admin", "Adminetta");

  // Manual, unpaid, overdue monitoring service + unpaid stripe cloud service.
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const { data: manualService, error: svc1Error } = await admin
    .from("services")
    .insert({
      profile_id: clientUser.profileId,
      service_type: "monitoring",
      tier: "landline",
      status: "unpaid",
      billing_method: "manual",
      monthly_amount_cents: 4500,
      next_due_on: yesterday,
    })
    .select("id")
    .single();
  if (svc1Error) throw svc1Error;
  const { error: svc2Error } = await admin.from("services").insert({
    profile_id: clientUser.profileId,
    service_type: "cloud_backup",
    tier: "30day",
    status: "unpaid",
    billing_method: "stripe",
  });
  if (svc2Error) throw svc2Error;

  const clientSession = ssrClientWithJar();
  {
    const { error } = await clientSession.ssr.auth.signInWithPassword({
      email: clientUser.email,
      password: clientUser.password,
    });
    if (error) throw error;
  }
  const adminSession = ssrClientWithJar();
  {
    const { error } = await adminSession.ssr.auth.signInWithPassword({
      email: adminUser.email,
      password: adminUser.password,
    });
    if (error) throw error;
  }

  // --- manual_payments RLS ----------------------------------------------------
  {
    const { error } = await clientSession.ssr.from("manual_payments").insert({
      service_id: manualService.id,
      profile_id: clientUser.profileId,
      amount_cents: 4500,
      method: "etransfer",
      paid_on: yesterday,
      recorded_by: clientUser.userId,
    });
    check("client INSERT on manual_payments denied (RLS)", Boolean(error), error?.code ?? "no error");
  }
  let paymentId;
  {
    const { data, error } = await adminSession.ssr
      .from("manual_payments")
      .insert({
        service_id: manualService.id,
        profile_id: clientUser.profileId,
        amount_cents: 4500,
        method: "etransfer",
        paid_on: yesterday,
        note: "gate check payment",
        recorded_by: adminUser.userId,
        recorded_by_email: adminUser.email,
      })
      .select("id")
      .single();
    check("admin INSERT on manual_payments succeeds (RLS)", !error, error?.code ?? "");
    paymentId = data?.id;
  }
  {
    const { error } = await adminSession.ssr.from("manual_payments").insert({
      service_id: manualService.id,
      profile_id: clientUser.profileId,
      amount_cents: 100,
      method: "cash",
      paid_on: yesterday,
      recorded_by: clientUser.userId, // spoofed attribution
    });
    check("admin INSERT with spoofed recorded_by denied (RLS)", Boolean(error), error?.code ?? "no error");
  }
  {
    const { data } = await clientSession.ssr.from("manual_payments").select("id, profile_id");
    const rows = data ?? [];
    check(
      "client SELECT on manual_payments sees only own rows (RLS)",
      rows.length >= 1 && rows.every((r) => r.profile_id === clientUser.profileId),
      `rows=${rows.length}`,
    );
  }
  for (const [label, session] of [["client", clientSession], ["admin", adminSession]]) {
    const { data: updated } = await session.ssr
      .from("manual_payments")
      .update({ amount_cents: 1 })
      .eq("id", paymentId)
      .select("id");
    check(`${label} UPDATE on manual_payments affects 0 rows (append-only)`, (updated ?? []).length === 0);
    const { data: deleted } = await session.ssr
      .from("manual_payments")
      .delete()
      .eq("id", paymentId)
      .select("id");
    check(`${label} DELETE on manual_payments affects 0 rows (append-only)`, (deleted ?? []).length === 0);
  }

  // --- billing_events RLS -------------------------------------------------------
  const eventId = `evt_gatecheck_${stamp}`;
  {
    const { error } = await admin.from("billing_events").insert({
      id: eventId,
      type: "invoice.payment_failed",
      profile_id: clientUser.profileId,
      payload: { gate: true },
    });
    createdEvents.push(eventId);
    check("service role INSERT on billing_events succeeds", !error, error?.message ?? "");
  }
  {
    const { error } = await adminSession.ssr.from("billing_events").insert({
      id: `${eventId}_admin`,
      type: "test",
      payload: {},
    });
    check("admin INSERT on billing_events denied (service role only)", Boolean(error), error?.code ?? "no error");
  }
  {
    const { data } = await adminSession.ssr.from("billing_events").select("id").eq("id", eventId);
    check("admin SELECT on billing_events works", (data ?? []).length === 1, `rows=${data?.length}`);
  }
  // A successful card payment (invoice.paid) IS visible to the client — it is
  // their payment history. Everything else in the event stream stays hidden.
  const paidEventId = `evt_gatecheck_paid_${stamp}`;
  {
    const { error } = await admin.from("billing_events").insert({
      id: paidEventId,
      type: "invoice.paid",
      profile_id: clientUser.profileId,
      service_id: manualService.id,
      payload: { amount_paid: 4500 },
    });
    createdEvents.push(paidEventId);
    if (error) throw error;
  }
  {
    const { data } = await clientSession.ssr.from("billing_events").select("id, type");
    const rows = data ?? [];
    check(
      "client SELECT on billing_events sees only own invoice.paid rows",
      rows.length === 1 && rows[0].id === paidEventId,
      `rows=${rows.length}`,
    );
  }

  // --- Client dashboard payment banners ---------------------------------------
  {
    const res = await fetch(`${baseUrl}/user-dashboard`, {
      headers: { cookie: clientSession.cookieHeader() },
    });
    const html = await res.text();
    check(
      "unpaid manual service shows amount + due date + instructions",
      res.status === 200 && html.includes("$45.00") && html.includes("e-Transfer") && html.includes("Payment needed"),
      `status=${res.status}`,
    );
    check("unpaid stripe service shows Pay Now", html.includes("Pay Now"));
    check(
      "client dashboard renders Billing & Payments card with history",
      html.includes("Billing &amp; Payments") && html.includes("Payment history"),
    );
    check("client history shows the automatic card payment", html.includes("Card (automatic)"));
  }

  // --- Admin Billing tab + Overview KPIs ----------------------------------------
  {
    const res = await fetch(`${baseUrl}/admin-dashboard?tab=billing`, {
      headers: { cookie: adminSession.cookieHeader() },
    });
    const html = await res.text();
    check(
      "Billing tab renders direct-pay + card boards",
      res.status === 200 &&
        html.includes("Pay by e-Transfer, cheque, or cash") &&
        html.includes("Automatic card payments"),
      `status=${res.status}`,
    );
    check("overdue manual row flagged", html.includes("overdue"));
    check("failed card payment surfaces on Billing tab", html.includes("Failed card payments"));
  }
  {
    const res = await fetch(`${baseUrl}/admin-dashboard`, {
      headers: { cookie: adminSession.cookieHeader() },
    });
    const html = await res.text();
    check(
      "Overview renders billing KPI row",
      res.status === 200 && html.includes("Booked monthly revenue") && html.includes("Overdue payments to collect"),
      `status=${res.status}`,
    );
  }

  // --- Client detail billing card ------------------------------------------------
  {
    const res = await fetch(`${baseUrl}/admin-dashboard/clients/${clientUser.profileId}`, {
      headers: { cookie: adminSession.cookieHeader() },
    });
    const html = await res.text();
    check(
      "client detail renders billing card + ledger entry",
      res.status === 200 && html.includes("Record a received payment") && html.includes("gate check payment"),
      `status=${res.status}`,
    );
  }

  // --- Webhook hardening -----------------------------------------------------------
  {
    const res = await fetch(`${baseUrl}/api/stripe/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "evt_fake", type: "checkout.session.completed" }),
    });
    check(
      "webhook rejects unsigned/unconfigured requests (503 or 400, never 200)",
      res.status === 503 || res.status === 400,
      `status=${res.status}`,
    );
  }
} finally {
  for (const id of createdEvents) {
    await admin.from("billing_events").delete().eq("id", id);
  }
  for (const id of createdProfiles) {
    await admin.from("profiles").delete().eq("id", id);
  }
  for (const id of createdUsers) {
    await admin.auth.admin.deleteUser(id);
  }
  console.log(`Cleanup: ${createdProfiles.length} profiles + ${createdUsers.length} auth users + ${createdEvents.length} events deleted.`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll billing gate checks passed.");
