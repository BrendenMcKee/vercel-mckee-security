// Phase 2 gate check (PORTAL_PLAN.md): provisioning + activation lifecycle.
// Run: node --env-file=.env.local scripts/activation-check.mjs [baseUrl]
//
// Against a running server + production Supabase, verifies:
//  - admin_create_client RPC works for an admin session and is denied for a
//    client session (RLS-invoker authorization)
//  - /account/activate renders valid / invalid / expired / used states
//  - Google-path completion (/account/activate/complete) links the profile,
//    consumes the token, and the activated user sees their own services (RLS)
//  - token reuse fails; email mismatch fails WITHOUT consuming the token
//  - resend rotation invalidates the old link and the new one works
// Cleans up all test rows and users afterwards.

import { createHash, randomBytes } from "node:crypto";
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

function newToken() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: createHash("sha256").update(raw).digest("hex") };
}

async function sessionCookiesFor(email, password) {
  const jar = new Map();
  const ssr = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach((c) => jar.set(c.name, c.value)),
    },
  });
  const { error } = await ssr.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

const stamp = Date.now();
const createdUsers = [];
const createdProfiles = [];

async function makeAuthUser(email) {
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  createdUsers.push(data.user.id);
  return { id: data.user.id, email, password };
}

/** Signed-in PostgREST client for a given user (user-context RLS). */
async function userClient(email, password) {
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

try {
  // --- setup: one admin, one plain client user ------------------------------
  const adminUser = await makeAuthUser(`act-check-admin-${stamp}@example.com`);
  await admin.from("profiles").insert({
    user_id: adminUser.id,
    first_name: "Adminessa",
    last_name: "ActCheck",
    email: adminUser.email,
    role: "admin",
    status: "active",
  });
  const outsider = await makeAuthUser(`act-check-outsider-${stamp}@example.com`);
  await admin.from("profiles").insert({
    user_id: outsider.id,
    first_name: "Outsider",
    last_name: "ActCheck",
    email: outsider.email,
    role: "client",
    status: "active",
  });

  const adminDb = await userClient(adminUser.email, adminUser.password);
  const outsiderDb = await userClient(outsider.email, outsider.password);

  // --- A: admin RPC creates client A (both services) ------------------------
  const emailA = `act-check-a-${stamp}@example.com`;
  const tokenA = newToken();
  const { data: profileIdA, error: rpcErrorA } = await adminDb.rpc("admin_create_client", {
    p_first_name: "Alice",
    p_last_name: "ActCheck",
    p_email: emailA,
    p_address: "1 Test Lane",
    p_monitoring_tier: "standard",
    p_cloud_tier: "30day",
    p_token_hash: tokenA.hash,
    p_target_email: emailA,
  });
  check("admin RPC creates client", !rpcErrorA && Boolean(profileIdA), rpcErrorA?.message ?? "");
  if (profileIdA) createdProfiles.push(profileIdA);

  const { data: servicesA } = await admin.from("services").select("*").eq("profile_id", profileIdA);
  check("client A has 2 services (standard + 30day)",
    servicesA?.length === 2 &&
    servicesA.some((s) => s.service_type === "monitoring" && s.tier === "standard") &&
    servicesA.some((s) => s.service_type === "cloud_backup" && s.tier === "30day"));

  // --- B: non-admin RPC is denied -------------------------------------------
  const { error: outsiderRpcError } = await outsiderDb.rpc("admin_create_client", {
    p_first_name: "Evil",
    p_last_name: "Outsider",
    p_email: "",
    p_address: "",
    p_monitoring_tier: "basic",
    p_cloud_tier: "",
    p_token_hash: newToken().hash,
    p_target_email: "",
  });
  check("client-role RPC call denied by RLS", Boolean(outsiderRpcError), outsiderRpcError?.code ?? "no error");

  // --- C/D: activation page states ------------------------------------------
  {
    const res = await fetch(`${baseUrl}/account/activate?token=${tokenA.raw}`);
    const html = await res.text();
    check("valid token renders chooser with first name", res.status === 200 && html.includes("Alice") && html.includes("Continue with Google"), `status=${res.status}`);
    check("password fields have reveal eyeballs (hidden by default)", (html.match(/aria-label="Show passwords"/g) ?? []).length === 2);
  }
  {
    const res = await fetch(`${baseUrl}/account/activate?token=not-a-real-token`);
    const html = await res.text();
    check("garbage token renders invalid state", html.includes("not valid"));
  }

  // --- E: expired token ------------------------------------------------------
  const emailE = `act-check-e-${stamp}@example.com`;
  const tokenE = newToken();
  const { data: profileIdE } = await adminDb.rpc("admin_create_client", {
    p_first_name: "Expira",
    p_last_name: "ActCheck",
    p_email: emailE,
    p_address: "",
    p_monitoring_tier: "basic",
    p_cloud_tier: "",
    p_token_hash: tokenE.hash,
    p_target_email: emailE,
  });
  if (profileIdE) createdProfiles.push(profileIdE);
  await admin.from("invitations")
    .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
    .eq("profile_id", profileIdE);
  {
    const res = await fetch(`${baseUrl}/account/activate?token=${tokenE.raw}`);
    const html = await res.text();
    check("expired token renders expired state", html.includes("expired"));
  }

  // --- F: Google-path completion for client A -------------------------------
  // Simulate the post-OAuth state: a session whose email matches target_email
  // plus the activation cookie, hitting /account/activate/complete.
  const googleA = await makeAuthUser(emailA);
  const cookiesA = await sessionCookiesFor(googleA.email, googleA.password);
  {
    const res = await fetch(`${baseUrl}/account/activate/complete`, {
      redirect: "manual",
      headers: { cookie: `${cookiesA}; portal_activation_token=${tokenA.raw}` },
    });
    const location = res.headers.get("location") ?? "";
    check("matching-email completion redirects to dashboard", location.endsWith("/user-dashboard"), `location=${location}`);
  }
  {
    const { data: profileA } = await admin.from("profiles").select("user_id, status").eq("id", profileIdA).single();
    check("profile A linked and active", profileA?.user_id === googleA.id && profileA?.status === "active");
    const { data: invA } = await admin.from("invitations").select("used_at").eq("profile_id", profileIdA).single();
    check("invitation A consumed", Boolean(invA?.used_at));
  }
  {
    // Activated client sees own services through RLS; sees nobody else's.
    const dbA = await userClient(googleA.email, googleA.password);
    const { data: ownServices } = await dbA.from("services").select("service_type, tier");
    check("activated client A sees exactly own 2 services via RLS", ownServices?.length === 2);
  }

  // --- F2: forced password setup after Google activation ---------------------
  // Google-path activations leave password_set_at null, so the dashboard gate
  // must show the set-password screen instead of the dashboard.
  {
    const cookies = await sessionCookiesFor(googleA.email, googleA.password);
    const res = await fetch(`${baseUrl}/user-dashboard`, { headers: { cookie: cookies } });
    const html = await res.text();
    check(
      "google-activated client is forced to set a password",
      res.status === 200 && html.includes("One Last Step") && !html.includes("Welcome,"),
      `status=${res.status}`,
    );
  }
  {
    // Setting a password (simulated: stamp as the updatePassword action does)
    // releases the gate.
    await admin.from("profiles")
      .update({ password_set_at: new Date().toISOString() })
      .eq("id", profileIdA);
    const cookies = await sessionCookiesFor(googleA.email, googleA.password);
    const res = await fetch(`${baseUrl}/user-dashboard`, { headers: { cookie: cookies } });
    const html = await res.text();
    check(
      "dashboard opens once password_set_at is stamped",
      res.status === 200 && html.includes("Alice"),
      `status=${res.status}`,
    );
  }

  // --- F3: reset-password page states ----------------------------------------
  {
    const res = await fetch(`${baseUrl}/account/reset-password`);
    const html = await res.text();
    check("reset page without session shows link-expired state", res.status === 200 && html.includes("Link Expired"), `status=${res.status}`);
  }
  {
    const cookies = await sessionCookiesFor(googleA.email, googleA.password);
    const res = await fetch(`${baseUrl}/account/reset-password`, { headers: { cookie: cookies } });
    const html = await res.text();
    check("reset page with session shows password form", res.status === 200 && html.includes("Reset Your Password"), `status=${res.status}`);
  }

  // --- G: token reuse fails --------------------------------------------------
  {
    const res = await fetch(`${baseUrl}/account/activate?token=${tokenA.raw}`);
    const html = await res.text();
    check("used token renders already-used state", html.includes("already been used"));
  }
  {
    const freshSession = await sessionCookiesFor(googleA.email, googleA.password);
    const res = await fetch(`${baseUrl}/account/activate/complete`, {
      redirect: "manual",
      headers: { cookie: `${freshSession}; portal_activation_token=${tokenA.raw}` },
    });
    const location = res.headers.get("location") ?? "";
    check("completion with used token redirects to error", location.includes("error="), `location=${location}`);
  }

  // --- H: email mismatch does NOT consume the token --------------------------
  const emailM = `act-check-m-${stamp}@example.com`;
  const tokenM = newToken();
  const { data: profileIdM } = await adminDb.rpc("admin_create_client", {
    p_first_name: "Mismatch",
    p_last_name: "ActCheck",
    p_email: emailM,
    p_address: "",
    p_monitoring_tier: "pro",
    p_cloud_tier: "",
    p_token_hash: tokenM.hash,
    p_target_email: emailM,
  });
  if (profileIdM) createdProfiles.push(profileIdM);

  const wrongUser = await makeAuthUser(`act-check-wrong-${stamp}@example.com`);
  const wrongCookies = await sessionCookiesFor(wrongUser.email, wrongUser.password);
  {
    const res = await fetch(`${baseUrl}/account/activate/complete`, {
      redirect: "manual",
      headers: { cookie: `${wrongCookies}; portal_activation_token=${tokenM.raw}` },
    });
    const location = res.headers.get("location") ?? "";
    check("mismatched email redirects to email_mismatch", location.includes("error=email_mismatch"), `location=${location}`);
    const { data: invM } = await admin.from("invitations").select("used_at").eq("profile_id", profileIdM).single();
    const { data: profM } = await admin.from("profiles").select("user_id, status").eq("id", profileIdM).single();
    check("mismatch did NOT consume token or link profile", !invM?.used_at && !profM?.user_id && profM?.status === "pending");
  }

  // --- I: resend rotation ----------------------------------------------------
  const tokenM2 = newToken();
  const { data: rotated, error: rotateError } = await adminDb
    .from("invitations")
    .update({
      token_hash: tokenM2.hash,
      expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
    })
    .eq("profile_id", profileIdM)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  check("admin rotates open invitation (resend)", !rotateError && Boolean(rotated), rotateError?.message ?? "");
  {
    const resOld = await fetch(`${baseUrl}/account/activate?token=${tokenM.raw}`);
    const htmlOld = await resOld.text();
    check("old link dead after resend", htmlOld.includes("not valid"));
    const resNew = await fetch(`${baseUrl}/account/activate?token=${tokenM2.raw}`);
    const htmlNew = await resNew.text();
    check("new link valid after resend", resNew.status === 200 && htmlNew.includes("Mismatch"));
  }

  // --- J: signed-in existing client hitting someone else's invite ------------
  {
    const outsiderCookies = await sessionCookiesFor(outsider.email, outsider.password);
    const res = await fetch(`${baseUrl}/account/activate/complete`, {
      redirect: "manual",
      headers: { cookie: `${outsiderCookies}; portal_activation_token=${tokenM2.raw}` },
    });
    const location = res.headers.get("location") ?? "";
    check("already-linked user redirected without consuming", location.includes("error=already_linked"), `location=${location}`);
    const { data: invM } = await admin.from("invitations").select("used_at").eq("profile_id", profileIdM).single();
    check("invite M still unconsumed after already-linked attempt", !invM?.used_at);
  }
} finally {
  for (const id of createdProfiles) {
    await admin.from("profiles").delete().eq("id", id);
  }
  for (const id of createdUsers) {
    await admin.from("profiles").delete().eq("user_id", id);
    await admin.auth.admin.deleteUser(id);
  }
  console.log(`Cleanup: ${createdProfiles.length} profiles + ${createdUsers.length} auth users deleted.`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll activation gate checks passed.");
