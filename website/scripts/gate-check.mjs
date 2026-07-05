// Layout-gate end-to-end check (PORTAL_PLAN.md Phase 1 gate).
// Run: node --env-file=.env.local scripts/gate-check.mjs [baseUrl]
//
// Creates throwaway client + admin users, signs them in, and hits the running
// server with real session cookies to verify: client sees dashboard, client is
// denied on admin portal (404), admin reaches admin portal. Cleans up after.

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

/** Sign in through @supabase/ssr with an in-memory jar so cookie names,
 * chunking, and encoding match exactly what the browser would send. */
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
const created = [];

async function makeUser(role, firstName) {
  const email = `gate-check-${role}-${stamp}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  created.push(data.user.id);
  const { error: profileError } = await admin.from("profiles").insert({
    user_id: data.user.id,
    first_name: firstName,
    last_name: "GateCheck",
    email,
    role,
    status: "active",
    // These users authenticate with a password, so the first-access password
    // gate must not intercept them.
    password_set_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;
  return { email, password };
}

try {
  const clientUser = await makeUser("client", "Clientina");
  const adminUser = await makeUser("admin", "Adminessa");

  const clientCookies = await sessionCookiesFor(clientUser.email, clientUser.password);
  const adminCookies = await sessionCookiesFor(adminUser.email, adminUser.password);

  {
    const res = await fetch(`${baseUrl}/user-dashboard`, { headers: { cookie: clientCookies } });
    const html = await res.text();
    // JSX text interpolation splits SSR text nodes with <!-- -->, so match the name alone.
    check(
      "client session sees dashboard with welcome header",
      res.status === 200 && html.includes("Clientina"),
      `status=${res.status}`,
    );
    check("client dashboard does not show sign-in form", !html.includes("Continue with Google"));
  }

  {
    const res = await fetch(`${baseUrl}/admin-dashboard`, { headers: { cookie: clientCookies } });
    check("client session denied on admin portal (404)", res.status === 404, `status=${res.status}`);
  }

  {
    const res = await fetch(`${baseUrl}/admin-dashboard`, { headers: { cookie: adminCookies } });
    const html = await res.text();
    check(
      "admin session reaches admin dashboard",
      res.status === 200 && html.includes("Admin Dashboard"),
      `status=${res.status}`,
    );
  }

  {
    const res = await fetch(`${baseUrl}/user-dashboard`, { headers: { cookie: adminCookies } });
    const html = await res.text();
    check(
      "admin session also sees client dashboard shell",
      res.status === 200 && html.includes("Adminessa"),
      `status=${res.status}`,
    );
  }
} finally {
  for (const id of created) {
    await admin.from("profiles").delete().eq("user_id", id);
    await admin.auth.admin.deleteUser(id);
  }
  console.log(`Cleanup: ${created.length} test users deleted.`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll gate checks passed.");
