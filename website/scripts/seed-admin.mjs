// Seed the first admin user (PORTAL_PLAN.md Section 5, step 5).
// Run: node --env-file=.env.local scripts/seed-admin.mjs <email> <first> <last>
// Idempotent: safe to re-run; existing auth user / profile rows are reused.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const [email, firstName, lastName] = process.argv.slice(2);
if (!email || !firstName || !lastName) {
  console.error("Usage: node --env-file=.env.local scripts/seed-admin.mjs <email> <first> <last>");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 1. Find or create the auth user. Created without a password: sign-in happens
// via Google (Supabase links by verified email) or a later password reset.
let userId = null;
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (match) {
    userId = match.id;
    break;
  }
  if (data.users.length < 200) break;
}

if (userId) {
  console.log(`Auth user already exists (${userId}).`);
} else {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  console.log(`Auth user created (${userId}).`);
}

// 2. Find or create the admin profile and link it.
const { data: existing, error: selectError } = await admin
  .from("profiles")
  .select("id, user_id, role, status")
  .eq("email", email.toLowerCase())
  .maybeSingle();
if (selectError) throw selectError;

if (existing) {
  const { error } = await admin
    .from("profiles")
    .update({ user_id: userId, role: "admin", status: "active" })
    .eq("id", existing.id);
  if (error) throw error;
  console.log(`Existing profile ${existing.id} linked and promoted to active admin.`);
} else {
  const { data, error } = await admin
    .from("profiles")
    .insert({
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase(),
      role: "admin",
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw error;
  console.log(`Admin profile created (${data.id}).`);
}

console.log(`Done: ${email} is an active admin.`);
