// RLS penetration check (PORTAL_PLAN.md Phase 1 gate; re-run in Phase 7).
// Run: node --env-file=.env.local scripts/rls-check.mjs
//
// Creates two throwaway client users, verifies isolation through the
// publishable-key client, then deletes them. Exits non-zero on any failure.

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

const stamp = Date.now();
const users = [
  { email: `rls-check-a-${stamp}@example.com`, password: randomBytes(24).toString("base64url") },
  { email: `rls-check-b-${stamp}@example.com`, password: randomBytes(24).toString("base64url") },
];
const created = [];
const extraProfiles = [];

try {
  // Setup: two client users with linked profiles (service role).
  for (const [i, u] of users.entries()) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error) throw error;
    u.id = data.user.id;
    created.push(u);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .insert({
        user_id: u.id,
        first_name: `Test${i}`,
        last_name: "RlsCheck",
        email: u.email,
        role: "client",
        status: "active",
      })
      .select("id")
      .single();
    if (profileError) throw profileError;
    u.profileId = profile.id;
  }

  // 1. Anonymous access: zero rows.
  const anon = createClient(url, publishableKey, { auth: { persistSession: false } });
  {
    const { data, error } = await anon.from("profiles").select("id");
    check("anon reads zero profile rows", !error && data.length === 0, error?.message);
  }

  // 2. User A: sees exactly own row, cannot see B.
  const clientA = createClient(url, publishableKey, { auth: { persistSession: false } });
  {
    const { error } = await clientA.auth.signInWithPassword(users[0]);
    check("user A signs in with password", !error, error?.message);
  }
  {
    const { data, error } = await clientA.from("profiles").select("id, user_id");
    const onlyOwn = !error && data.length === 1 && data[0].user_id === users[0].id;
    check("user A sees exactly own profile row", onlyOwn, error?.message ?? `rows=${data?.length}`);
  }
  {
    const { data } = await clientA.from("profiles").select("id").eq("user_id", users[1].id);
    check("user A cannot read user B's profile", (data ?? []).length === 0);
  }

  // 3. User A cannot INSERT or UPDATE profiles (admin-only policies).
  {
    const { error } = await clientA.from("profiles").insert({
      first_name: "Evil",
      last_name: "Insert",
      role: "admin",
      status: "active",
    });
    check("user A INSERT into profiles denied", Boolean(error), error?.message);
  }
  {
    const { data, error } = await clientA
      .from("profiles")
      .update({ role: "admin" })
      .eq("user_id", users[0].id)
      .select("id");
    // No UPDATE policy for clients: affects 0 rows (or errors).
    check("user A cannot self-promote to admin", Boolean(error) || (data ?? []).length === 0, error?.message);
  }

  // 4. Existing Starlink tables stay closed to authenticated users.
  {
    const { data, error } = await clientA.from("units").select("id");
    check("user A reads zero rows from units", Boolean(error) || (data ?? []).length === 0, error?.message);
  }
  {
    const { data, error } = await clientA.from("rentals").select("id");
    check("user A reads zero rows from rentals", Boolean(error) || (data ?? []).length === 0, error?.message);
  }

  // 5. Station cache: own SELECT, no writes, no cross-tenant, events admin-only.
  await admin.from("lanvac_zones").insert([
    { profile_id: users[0].profileId, zone_number: 1, description: "A smoke" },
    { profile_id: users[1].profileId, zone_number: 1, description: "B smoke" },
  ]);
  await admin.from("lanvac_account_state").insert({
    profile_id: users[1].profileId,
    panel_type: "secret",
  });
  await admin.from("lanvac_station_events").insert({
    profile_id: users[0].profileId,
    event_type: "pull",
    detail: { probe: true },
  });
  await admin.from("lanvac_zone_write").insert({
    profile_id: users[0].profileId,
    zone_number: 1,
    delay: 1,
  });
  {
    const { data, error } = await clientA.from("lanvac_zones").select("zone_number, description");
    const onlyOwn =
      !error &&
      (data ?? []).length === 1 &&
      data[0].description === "A smoke";
    check("user A sees exactly own lanvac zones", onlyOwn, error?.message ?? `rows=${data?.length}`);
  }
  {
    const { data, error } = await clientA
      .from("lanvac_account_state")
      .select("panel_type")
      .eq("profile_id", users[1].profileId);
    check("user A cannot read user B station state", !error && (data ?? []).length === 0, error?.message);
  }
  {
    const { data, error } = await clientA
      .from("lanvac_zones")
      .update({ on_test: true })
      .eq("profile_id", users[0].profileId)
      .select("id");
    check("user A cannot UPDATE own lanvac zones", Boolean(error) || (data ?? []).length === 0, error?.message);
  }
  {
    const { data, error } = await clientA
      .from("lanvac_zones")
      .insert({ profile_id: users[0].profileId, zone_number: 2, description: "Injected" })
      .select("id");
    check("user A cannot INSERT lanvac zones", Boolean(error) || (data ?? []).length === 0, error?.message);
  }
  {
    const { data, error } = await clientA.from("lanvac_station_events").select("id");
    check("user A reads zero station events", Boolean(error) || (data ?? []).length === 0, error?.message);
  }
  {
    const { error } = await clientA
      .from("lanvac_zones")
      .select("delay, notify_list, signal_code, restore_code");
    check("user A cannot select zone write-only columns", Boolean(error), error?.message);
  }
  {
    const { data, error } = await clientA.from("lanvac_zone_write").select("delay");
    check("user A reads zero zone write rows", Boolean(error) || (data ?? []).length === 0, error?.message);
  }

  // 6. R53: insert trigger, second site on the same account, membership ACL.
  {
    const { data: siteA } = await admin
      .from("profiles")
      .select("account_id")
      .eq("id", users[0].profileId)
      .single();
    check("client insert without account_id created an account", Boolean(siteA?.account_id));

    const { data: site2, error: site2Error } = await admin
      .from("profiles")
      .insert({
        account_id: siteA.account_id,
        first_name: "Site",
        last_name: "Two",
        email: `rls-check-a2-${stamp}@example.com`,
        role: "client",
        status: "active",
      })
      .select("id")
      .single();
    check("second site on A's account inserts", !site2Error && Boolean(site2?.id), site2Error?.message);
    if (site2?.id) extraProfiles.push(site2.id);

    const { data: twoSites, error: twoError } = await clientA.from("profiles").select("id");
    const ids = new Set((twoSites ?? []).map((row) => row.id));
    check(
      "user A sees both sites on the account",
      !twoError && ids.has(users[0].profileId) && Boolean(site2?.id) && ids.has(site2.id),
      twoError?.message ?? `rows=${twoSites?.length}`,
    );

    const { data: flipped } = await clientA
      .from("accounts")
      .update({ auto_onboard: false })
      .eq("id", siteA.account_id)
      .select("id");
    const { data: afterFlip } = await admin
      .from("accounts")
      .select("auto_onboard")
      .eq("id", siteA.account_id)
      .single();
    check(
      "user A cannot UPDATE accounts.auto_onboard",
      (flipped ?? []).length === 0 && afterFlip?.auto_onboard === true,
    );

    const memberEmail = `rls-check-member-${stamp}@example.com`;
    const memberPassword = randomBytes(24).toString("base64url");
    const { data: memberAuth, error: memberAuthError } = await admin.auth.admin.createUser({
      email: memberEmail,
      password: memberPassword,
      email_confirm: true,
    });
    check("member-only auth user created", !memberAuthError && Boolean(memberAuth?.user.id), memberAuthError?.message);
    if (memberAuth?.user.id) created.push({ id: memberAuth.user.id });
    if (memberAuth?.user.id && siteA?.account_id) {
      const { error: memberInsertError } = await admin.from("account_members").insert({
        account_id: siteA.account_id,
        user_id: memberAuth.user.id,
        email: memberEmail,
        role: "member",
      });
      check("member row without profiles.user_id inserts", !memberInsertError, memberInsertError?.message);

      const memberClient = createClient(url, publishableKey, { auth: { persistSession: false } });
      const { error: memberSignInError } = await memberClient.auth.signInWithPassword({
        email: memberEmail,
        password: memberPassword,
      });
      check("member-only user signs in", !memberSignInError, memberSignInError?.message);
      const { data: memberSites, error: memberSitesError } = await memberClient
        .from("profiles")
        .select("id");
      const memberIds = new Set((memberSites ?? []).map((row) => row.id));
      check(
        "member without profiles.user_id sees the account sites",
        !memberSitesError && memberIds.has(users[0].profileId),
        memberSitesError?.message ?? `rows=${memberSites?.length}`,
      );
    }
  }
} finally {
  for (const id of extraProfiles) {
    await admin.from("profiles").delete().eq("id", id);
  }
  for (const u of created) {
    await admin.from("profiles").delete().eq("user_id", u.id);
    await admin.auth.admin.deleteUser(u.id);
  }
  console.log(`Cleanup: ${created.length} test users + ${extraProfiles.length} extra sites deleted.`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll RLS checks passed.");
