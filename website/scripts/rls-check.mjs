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
} finally {
  for (const u of created) {
    await admin.from("profiles").delete().eq("user_id", u.id);
    await admin.auth.admin.deleteUser(u.id);
  }
  console.log(`Cleanup: ${created.length} test users deleted.`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll RLS checks passed.");
