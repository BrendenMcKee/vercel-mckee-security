// Phase 4 gate check (PORTAL_PLAN.md Phase 4 gate).
// Run: node --env-file=.env.local scripts/caller-id-check.mjs [baseUrl]
//
// Verifies with real sessions against the running server:
//  - client saves their own list via the transactional RPC: contacts replaced,
//    diff computed, append-only history row with client attribution
//  - admin save WITHOUT authorization/reason is rejected by the DB CHECK
//  - admin save WITH authorization + reason records full audit metadata
//  - caller_id_changes is append-only: UPDATE/DELETE fail for client AND admin
//  - invalid phone format and duplicate numbers are rejected by constraints
//  - cross-profile writes are blocked by RLS (client cannot touch another list)
//  - devices: expired device (2018 battery) renders amber on the client
//    dashboard; admin date update clears it; clients cannot write devices

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
  const email = `cid-check-${firstName.toLowerCase()}-${role}-${stamp}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUsers.push(data.user.id);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      user_id: data.user.id,
      first_name: firstName,
      last_name: "CidCheck",
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
  const clientUser = await makeUser("client", "Callerina");
  const otherClient = await makeUser("client", "Otheria");
  const adminUser = await makeUser("admin", "Adminetta");

  // Caller ID card requires a monitoring service.
  await admin.from("services").insert({ profile_id: clientUser.profileId, service_type: "monitoring", tier: "landline" });

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

  // --- Client saves own list via RPC ----------------------------------------
  {
    const { data, error } = await clientSession.ssr.rpc("save_caller_id_list", {
      p_profile_id: clientUser.profileId,
      p_contacts: [
        { phone: "+17055550101", label: "Callerina (self)", passcode: "ruby" },
        { phone: "+17055550102", label: "Neighbour Ned", passcode: "acorn" },
      ],
      p_changed_via: "client_dashboard",
      p_changed_by_email: clientUser.email,
    });
    check("client RPC save succeeds", !error, error?.message ?? "");
    check(
      "RPC returns exact diff (2 added, 0 removed)",
      data?.added?.length === 2 && data?.removed?.length === 0,
      JSON.stringify({ added: data?.added?.length, removed: data?.removed?.length }),
    );
    check(
      "diff entries carry the passcode",
      (data?.added ?? []).every((e) => typeof e.passcode === "string" && e.passcode.length > 0),
      JSON.stringify((data?.added ?? []).map((e) => e.passcode)),
    );
  }
  {
    const { data } = await admin
      .from("caller_id_contacts")
      .select("phone, passcode")
      .eq("profile_id", clientUser.profileId)
      .eq("phone", "+17055550101")
      .single();
    check("passcode persisted on the contact", data?.passcode === "ruby", data?.passcode ?? "null");
  }
  {
    const { data } = await admin
      .from("caller_id_changes")
      .select("*")
      .eq("profile_id", clientUser.profileId);
    const row = data?.[0];
    check(
      "history row: client attribution (changed_via, changed_by, email)",
      data?.length === 1 &&
        row?.changed_via === "client_dashboard" &&
        row?.changed_by === clientUser.userId &&
        row?.changed_by_email === clientUser.email,
      JSON.stringify({ n: data?.length, via: row?.changed_via }),
    );
  }

  // --- Second save computes remove+add diff ---------------------------------
  {
    const { data, error } = await clientSession.ssr.rpc("save_caller_id_list", {
      p_profile_id: clientUser.profileId,
      p_contacts: [
        { phone: "+17055550101", label: "Callerina (self)", passcode: "ruby" },
        { phone: "+17055550103", label: "Cousin Cal", passcode: "maple" },
      ],
      p_changed_via: "client_dashboard",
      p_changed_by_email: clientUser.email,
    });
    const addedPhones = (data?.added ?? []).map((e) => e.phone);
    const removedPhones = (data?.removed ?? []).map((e) => e.phone);
    check(
      "second save diff: +0103 added, +0102 removed, +0101 untouched",
      !error &&
        addedPhones.length === 1 &&
        addedPhones[0] === "+17055550103" &&
        removedPhones.length === 1 &&
        removedPhones[0] === "+17055550102",
      JSON.stringify({ addedPhones, removedPhones }),
    );
  }

  // --- Passcode-only change audits as remove + add ---------------------------
  {
    const { data, error } = await clientSession.ssr.rpc("save_caller_id_list", {
      p_profile_id: clientUser.profileId,
      p_contacts: [
        { phone: "+17055550101", label: "Callerina (self)", passcode: "garnet" },
        { phone: "+17055550103", label: "Cousin Cal", passcode: "maple" },
      ],
      p_changed_via: "client_dashboard",
      p_changed_by_email: clientUser.email,
    });
    const added = data?.added ?? [];
    const removed = data?.removed ?? [];
    check(
      "passcode change on 0101 audits as remove(ruby) + add(garnet)",
      !error &&
        added.length === 1 && added[0].phone === "+17055550101" && added[0].passcode === "garnet" &&
        removed.length === 1 && removed[0].phone === "+17055550101" && removed[0].passcode === "ruby",
      JSON.stringify({ added, removed }),
    );
  }
  {
    const { data } = await admin
      .from("caller_id_contacts")
      .select("phone")
      .eq("profile_id", clientUser.profileId)
      .order("phone");
    check(
      "live list replaced transactionally",
      data?.length === 2 && data[0].phone === "+17055550101" && data[1].phone === "+17055550103",
      JSON.stringify(data?.map((c) => c.phone)),
    );
  }

  // --- Admin save without authorization is rejected (DB CHECK, R24) ---------
  {
    const { error } = await adminSession.ssr.rpc("save_caller_id_list", {
      p_profile_id: clientUser.profileId,
      p_contacts: [{ phone: "+17055550101", label: "Callerina (self)" }],
      p_changed_via: "admin_dashboard",
      p_changed_by_email: adminUser.email,
    });
    check("admin save without authorization/reason rejected (23514)", error?.code === "23514", error?.code ?? "no error");
  }

  // --- Admin save with authorization records full audit metadata ------------
  {
    const { data, error } = await adminSession.ssr.rpc("save_caller_id_list", {
      p_profile_id: clientUser.profileId,
      p_contacts: [
        { phone: "+17055550101", label: "Callerina (self)" },
        { phone: "+17055550104", label: "Sister Sue" },
      ],
      p_changed_via: "admin_dashboard",
      p_changed_by_email: adminUser.email,
      p_authorized_via: "client_email",
      p_change_reason: "Client emailed asking to add her sister to the call list.",
    });
    check("admin authorized save succeeds", !error && data?.change_id, error?.message ?? "");
    if (data?.change_id) {
      const { data: row } = await admin.from("caller_id_changes").select("*").eq("id", data.change_id).single();
      check(
        "admin history row: full authorization metadata",
        row?.changed_via === "admin_dashboard" &&
          row?.changed_by === adminUser.userId &&
          row?.authorized_via === "client_email" &&
          (row?.change_reason ?? "").includes("sister"),
        JSON.stringify({ via: row?.changed_via, auth: row?.authorized_via }),
      );
    }
  }

  // --- Append-only: UPDATE/DELETE fail for every session role ---------------
  for (const [label, session] of [["client", clientSession], ["admin", adminSession]]) {
    const { data: updated } = await session.ssr
      .from("caller_id_changes")
      .update({ change_reason: "tampered" })
      .eq("profile_id", clientUser.profileId)
      .select("id");
    check(`${label} UPDATE on caller_id_changes affects 0 rows`, (updated ?? []).length === 0);
    const { data: deleted } = await session.ssr
      .from("caller_id_changes")
      .delete()
      .eq("profile_id", clientUser.profileId)
      .select("id");
    check(`${label} DELETE on caller_id_changes affects 0 rows`, (deleted ?? []).length === 0);
  }

  // --- Constraint hardening ---------------------------------------------------
  {
    const { error } = await clientSession.ssr.from("caller_id_contacts").insert({
      profile_id: clientUser.profileId,
      phone: "555-0101",
      label: "Bad format",
    });
    check("invalid phone format rejected by CHECK (23514)", error?.code === "23514", error?.code ?? "no error");
  }
  {
    const { error } = await clientSession.ssr.from("caller_id_contacts").insert({
      profile_id: clientUser.profileId,
      phone: "+17055550101",
      label: "Duplicate",
    });
    check("duplicate phone rejected by UNIQUE (23505)", error?.code === "23505", error?.code ?? "no error");
  }

  // --- Cross-profile writes blocked by RLS -----------------------------------
  {
    const { error } = await clientSession.ssr.rpc("save_caller_id_list", {
      p_profile_id: otherClient.profileId,
      p_contacts: [{ phone: "+17055550199", label: "Intruder" }],
      p_changed_via: "client_dashboard",
      p_changed_by_email: clientUser.email,
    });
    const { data: victimList } = await admin
      .from("caller_id_contacts")
      .select("id")
      .eq("profile_id", otherClient.profileId);
    check(
      "client cannot save another client's list (RLS)",
      Boolean(error) && (victimList ?? []).length === 0,
      error?.code ?? "no error",
    );
  }
  {
    const { error } = await clientSession.ssr.rpc("save_caller_id_list", {
      p_profile_id: clientUser.profileId,
      p_contacts: [{ phone: "+17055550101", label: "Callerina (self)" }],
      p_changed_via: "admin_dashboard",
      p_changed_by_email: clientUser.email,
      p_authorized_via: "client_email",
      p_change_reason: "Client pretending to be an admin should be blocked.",
    });
    check("client cannot record an admin_dashboard change (RLS)", Boolean(error), error?.code ?? "no error");
  }

  // --- UI: client dashboard caller ID card -----------------------------------
  {
    const res = await fetch(`${baseUrl}/user-dashboard`, {
      headers: { cookie: clientSession.cookieHeader() },
    });
    const html = await res.text();
    check(
      "client dashboard renders caller ID card with formatted contact",
      res.status === 200 && html.includes("Alarm Contact List") && html.includes("(705) 555-0101"),
      `status=${res.status}`,
    );
  }

  // --- Devices ---------------------------------------------------------------
  let deviceId = null;
  {
    const { error } = await clientSession.ssr.from("devices").insert({
      profile_id: clientUser.profileId,
      label: "Alarm Backup Battery",
      lifetime_years: 5,
      installed_on: "2018-03-01",
    });
    check("client INSERT on devices denied (RLS)", Boolean(error), error?.code ?? "no error");
  }
  {
    const { data, error } = await adminSession.ssr
      .from("devices")
      .insert({
        profile_id: clientUser.profileId,
        label: "Alarm Backup Battery",
        lifetime_years: 5,
        installed_on: "2018-03-01",
      })
      .select("id")
      .single();
    deviceId = data?.id ?? null;
    check("admin INSERT device succeeds (RLS)", !error, error?.code ?? "");
  }
  {
    const res = await fetch(`${baseUrl}/user-dashboard`, {
      headers: { cookie: clientSession.cookieHeader() },
    });
    const html = await res.text();
    check(
      "2018 battery renders expired (amber) on client dashboard",
      res.status === 200 && html.includes("Replacement was due"),
      `status=${res.status}`,
    );
  }
  {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await adminSession.ssr
      .from("devices")
      .update({ installed_on: today, expiry_alerted_at: null })
      .eq("id", deviceId);
    check("admin device date update succeeds (RLS)", !error, error?.code ?? "");
    const res = await fetch(`${baseUrl}/user-dashboard`, {
      headers: { cookie: clientSession.cookieHeader() },
    });
    const html = await res.text();
    check(
      "date update clears expired state on client dashboard",
      res.status === 200 && !html.includes("Replacement was due") && html.includes("Next replacement due"),
      `status=${res.status}`,
    );
  }

  // --- UI: admin client detail shows caller ID history ------------------------
  {
    const res = await fetch(`${baseUrl}/admin-dashboard/clients/${clientUser.profileId}`, {
      headers: { cookie: adminSession.cookieHeader() },
    });
    const html = await res.text();
    check(
      "admin client detail renders caller ID card + history + devices",
      res.status === 200 && html.includes("Caller ID List") && html.includes("History (") && html.includes("Devices"),
      `status=${res.status}`,
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
console.log("\nAll caller ID gate checks passed.");
