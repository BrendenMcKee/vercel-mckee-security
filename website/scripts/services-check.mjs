// Phase 3 gate check (PORTAL_PLAN.md Phase 3 gate).
// Run: node --env-file=.env.local scripts/services-check.mjs [baseUrl]
//
// Verifies with real sessions against the running server:
//  - admin tier change shows on the client dashboard on next load
//  - client session has no write path to `services` (RLS write attempts fail)
//  - admin client detail renders; non-existent client 404s
//  - cloud backup stays a visible client preview and a disabled admin template

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

async function makeUser(role, firstName) {
  const email = `svc-check-${role}-${stamp}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUsers.push(data.user.id);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      user_id: data.user.id,
      first_name: firstName,
      last_name: "SvcCheck",
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
  const clientUser = await makeUser("client", "Servicia");
  const adminUser = await makeUser("admin", "Adminetta");

  // Client starts with monitoring basic only (no cloud service).
  const { data: service, error: svcError } = await admin
    .from("services")
    .insert({ profile_id: clientUser.profileId, service_type: "monitoring", tier: "landline" })
    .select("id")
    .single();
  if (svcError) throw svcError;

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

  // --- Client dashboard shows the assigned tier + future cloud preview -----
  {
    const res = await fetch(`${baseUrl}/user-dashboard`, {
      headers: { cookie: clientSession.cookieHeader() },
    });
    const html = await res.text();
    check("client dashboard shows monitoring tier Telephone Land Line", res.status === 200 && html.includes("Telephone Land Line"), `status=${res.status}`);
    check(
      "cloud backup preview appears when client has no cloud service",
      html.includes("Camera Cloud Backup") && html.includes("Notify Me When Available"),
    );
    check("client dashboard exposes no tier controls", !html.includes("<select"));
  }

  // --- RLS: client session cannot mutate services ---------------------------
  {
    const { data: updated, error } = await clientSession.ssr
      .from("services")
      .update({ tier: "cellular_tc" })
      .eq("id", service.id)
      .select("id");
    check(
      "client UPDATE on services affects 0 rows (RLS)",
      (updated ?? []).length === 0,
      error ? error.code : "silent zero-row update",
    );
  }
  {
    const { error } = await clientSession.ssr.from("services").insert({
      profile_id: clientUser.profileId,
      service_type: "cloud_backup",
      tier: "7day",
    });
    check("client INSERT on services denied (RLS)", Boolean(error), error?.code ?? "no error");
  }
  {
    const { data: after } = await admin.from("services").select("tier").eq("id", service.id).single();
    check("service tier unchanged after client write attempts", after?.tier === "landline", `tier=${after?.tier}`);
  }

  // --- Admin changes the tier via RLS; client sees it on next load ---------
  {
    const { data: updated, error } = await adminSession.ssr
      .from("services")
      .update({ tier: "cellular_tc" })
      .eq("id", service.id)
      .select("id");
    check("admin UPDATE on services succeeds (RLS)", !error && (updated ?? []).length === 1, error?.code ?? "");
  }
  {
    const res = await fetch(`${baseUrl}/user-dashboard`, {
      headers: { cookie: clientSession.cookieHeader() },
    });
    const html = await res.text();
    check("tier change appears on client dashboard next load", res.status === 200 && html.includes("Cellular + Total Connect 2.0"), `status=${res.status}`);
  }

  // --- Admin sees a disabled cloud-backup planning template ----------------
  {
    const res = await fetch(`${baseUrl}/admin-dashboard/clients/${clientUser.profileId}`, {
      headers: { cookie: adminSession.cookieHeader() },
    });
    const html = await res.text();
    check(
      "admin cloud backup template is visibly in development",
      res.status === 200 &&
        html.includes("Camera Cloud Backup") &&
        html.includes("In Development") &&
        html.includes("Available after launch") &&
        html.includes("7-Day Retention") &&
        html.includes("30-Day Retention") &&
        html.includes("90-Day Retention"),
      `status=${res.status}`,
    );
  }

  // --- Direct RLS fixture proves an assigned future service still renders --
  // The normal portal assignment actions are feature-gated until Track 2.
  {
    const { error } = await adminSession.ssr.from("services").insert({
      profile_id: clientUser.profileId,
      service_type: "cloud_backup",
      tier: "30day",
    });
    check("admin INSERT cloud service succeeds (RLS)", !error, error?.code ?? "");
  }
  {
    const res = await fetch(`${baseUrl}/user-dashboard`, {
      headers: { cookie: clientSession.cookieHeader() },
    });
    const html = await res.text();
    check(
      "cloud backup card appears with 30-Day tier",
      res.status === 200 && html.includes("Camera Cloud Backup") && html.includes("30-Day Retention"),
      `status=${res.status}`,
    );
  }

  // --- Admin surfaces ---------------------------------------------------------
  {
    const res = await fetch(`${baseUrl}/admin-dashboard`, {
      headers: { cookie: adminSession.cookieHeader() },
    });
    const html = await res.text();
    check("admin overview renders KPI cards", res.status === 200 && html.includes("Active clients"), `status=${res.status}`);
  }
  {
    const res = await fetch(`${baseUrl}/admin-dashboard?tab=clients`, {
      headers: { cookie: adminSession.cookieHeader() },
    });
    const html = await res.text();
    check("clients tab lists the test client (search data present)", res.status === 200 && html.includes("Servicia"), `status=${res.status}`);
  }
  {
    const res = await fetch(`${baseUrl}/admin-dashboard/clients/${clientUser.profileId}`, {
      headers: { cookie: adminSession.cookieHeader() },
    });
    const html = await res.text();
    check(
      "client detail renders profile + services",
      res.status === 200 && html.includes("Servicia") && html.includes("Security Monitoring"),
      `status=${res.status}`,
    );
  }
  {
    const res = await fetch(`${baseUrl}/admin-dashboard/clients/00000000-0000-4000-8000-000000000000`, {
      headers: { cookie: adminSession.cookieHeader() },
    });
    const html = await res.text();
    // loading.tsx streams a 200 shell first, so notFound() thrown by the page
    // arrives as a streamed not-found boundary, not an HTTP 404 status.
    check(
      "unknown client detail renders not-found",
      res.status === 404 ||
        (html.includes("NEXT_HTTP_ERROR_FALLBACK;404") && !html.includes("Security Monitoring")),
      `status=${res.status}`,
    );
  }
  {
    const res = await fetch(`${baseUrl}/admin-dashboard/clients/${clientUser.profileId}`, {
      headers: { cookie: clientSession.cookieHeader() },
    });
    check("client session denied on client detail (404)", res.status === 404, `status=${res.status}`);
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
console.log("\nAll services gate checks passed.");
