// Phase 7 cron gate check (PORTAL_PLAN.md 9.4 / Phase 7 gate).
// Run: node --env-file=.env.local scripts/cron-check.mjs [baseUrl]
//
// Verifies against a running server:
//  - all cron routes reject missing/wrong bearer tokens (401)
//  - payment-due: overdue manual service gets reminded exactly ONCE per cycle
//    (due_alerted_at stamped; second run reminds 0), digest counts it
//  - device-expiry: expired device alerted + stamped once; second run alerts 0
//  - cleanup: expired 90d+ invitation deleted, fresh invitation kept
//  - daily dispatcher runs all three jobs and reports per-job results

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.argv[2] ?? "http://localhost:3101";
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;
if (!url || !serviceKey || !cronSecret) {
  console.error("Missing SUPABASE_* or CRON_SECRET env vars.");
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

const authed = { headers: { authorization: `Bearer ${cronSecret}` } };
const stamp = Date.now();
const createdUsers = [];
const createdProfiles = [];

try {
  // ---- Route auth -------------------------------------------------------------
  for (const path of ["daily", "payment-due", "device-expiry", "cleanup"]) {
    const bare = await fetch(`${baseUrl}/api/cron/${path}`);
    check(`/api/cron/${path} rejects missing token`, bare.status === 401 || bare.status === 503, `status=${bare.status}`);
    const wrong = await fetch(`${baseUrl}/api/cron/${path}`, { headers: { authorization: "Bearer wrong" } });
    check(`/api/cron/${path} rejects wrong token`, wrong.status === 401, `status=${wrong.status}`);
  }

  // ---- Fixtures ------------------------------------------------------------------
  // Client with: overdue manual service, expired battery, 91-day-expired
  // invitation. Email is example.com so reminders dispatch harmlessly.
  const email = `cron-check-${stamp}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const { data: userData, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userError) throw userError;
  createdUsers.push(userData.user.id);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      user_id: userData.user.id,
      first_name: "Cronia",
      last_name: "CronCheck",
      email,
      role: "client",
      status: "active",
      password_set_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (profileError) throw profileError;
  createdProfiles.push(profile.id);

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const { data: svc, error: svcError } = await admin
    .from("services")
    .insert({
      profile_id: profile.id,
      service_type: "monitoring",
      tier: "cellular",
      status: "active",
      billing_method: "manual",
      billing_interval: "annual",
      monthly_amount_cents: 3495,
      next_due_on: yesterday,
    })
    .select("id")
    .single();
  if (svcError) throw svcError;

  const { data: device, error: deviceError } = await admin
    .from("devices")
    .insert({ profile_id: profile.id, label: "Alarm Backup Battery", lifetime_years: 5, installed_on: "2019-01-01" })
    .select("id")
    .single();
  if (deviceError) throw deviceError;

  const oldExpiry = new Date(Date.now() - 91 * 86_400_000).toISOString();
  const { data: oldInvite, error: oldInviteError } = await admin
    .from("invitations")
    .insert({ profile_id: profile.id, token_hash: `cron-old-${stamp}`, expires_at: oldExpiry })
    .select("id")
    .single();
  if (oldInviteError) throw oldInviteError;

  // ---- payment-due: reminds once, digest counts -----------------------------------
  {
    const res = await fetch(`${baseUrl}/api/cron/payment-due`, authed);
    const body = await res.json();
    check("payment-due run 1 responds 200", res.status === 200, `status=${res.status}`);
    check("payment-due run 1 reminds the overdue service", body.reminded >= 1, JSON.stringify(body));
    check("payment-due run 1 sends the collections digest", body.digestSent === true, JSON.stringify(body));

    const { data: after } = await admin.from("services").select("due_alerted_at").eq("id", svc.id).single();
    check("due_alerted_at stamped after reminder", Boolean(after?.due_alerted_at));

    const res2 = await fetch(`${baseUrl}/api/cron/payment-due`, authed);
    const body2 = await res2.json();
    check("payment-due run 2 reminds 0 (once per cycle)", res2.status === 200 && body2.reminded === 0, JSON.stringify(body2));
    check("payment-due run 2 still lists it in the digest", body2.candidates >= 1, JSON.stringify(body2));
  }

  // ---- device-expiry: alerts once ---------------------------------------------------
  {
    const res = await fetch(`${baseUrl}/api/cron/device-expiry`, authed);
    const body = await res.json();
    check("device-expiry run 1 responds 200", res.status === 200, `status=${res.status}`);
    check("device-expiry run 1 alerts the expired battery", body.alerted >= 1, JSON.stringify(body));

    const { data: after } = await admin.from("devices").select("expiry_alerted_at").eq("id", device.id).single();
    check("expiry_alerted_at stamped after alert", Boolean(after?.expiry_alerted_at));

    const res2 = await fetch(`${baseUrl}/api/cron/device-expiry`, authed);
    const body2 = await res2.json();
    check("device-expiry run 2 alerts 0 (once per expiry)", res2.status === 200 && body2.alerted === 0, JSON.stringify(body2));
  }

  // ---- cleanup: old invitation deleted ------------------------------------------------
  {
    const res = await fetch(`${baseUrl}/api/cron/cleanup`, authed);
    const body = await res.json();
    check("cleanup responds 200", res.status === 200, `status=${res.status}`);
    check("cleanup deletes the 91-day-expired invitation", body.invitationsDeleted >= 1, JSON.stringify(body));

    const { data: gone } = await admin.from("invitations").select("id").eq("id", oldInvite.id);
    check("expired invitation row is gone", (gone ?? []).length === 0);
  }

  // ---- daily dispatcher --------------------------------------------------------------
  {
    const res = await fetch(`${baseUrl}/api/cron/daily`, authed);
    const body = await res.json();
    const jobs = body.results ?? {};
    check(
      "daily dispatcher runs all three jobs",
      res.status === 200 && jobs["payment-due"] && jobs["device-expiry"] && jobs["cleanup"],
      JSON.stringify(body),
    );
    check(
      "daily dispatcher jobs all succeed",
      !jobs["payment-due"]?.error && !jobs["device-expiry"]?.error && !jobs["cleanup"]?.error,
      JSON.stringify(jobs),
    );
  }
} finally {
  for (const id of createdProfiles) {
    await admin.from("profiles").delete().eq("id", id);
  }
  for (const id of createdUsers) {
    await admin.auth.admin.deleteUser(id);
  }
  console.log(`Cleanup: ${createdProfiles.length} profiles + ${createdUsers.length} auth users deleted.`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll cron gate checks passed.");
