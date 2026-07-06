// Mobile UI audit: loads every portal page at iPhone viewport with real
// sessions, flags horizontal overflow and lists the offending elements, and
// saves screenshots to .mobile-audit/ for visual review.
// Run: node --env-file=.env.local scripts/mobile-audit.mjs [baseUrl]

import { mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { chromium, devices } from "playwright";

const baseUrl = process.argv[2] ?? "http://localhost:3101";
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function ssrClientWithJar() {
  const jar = new Map();
  const ssr = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach((c) => jar.set(c.name, c.value)),
    },
  });
  return { ssr, cookies: () => [...jar].map(([name, value]) => ({ name, value })) };
}

const stamp = Date.now();
const createdUsers = [];
const createdProfiles = [];

async function makeUser(role, firstName) {
  const email = `mob-audit-${firstName.toLowerCase()}-${stamp}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUsers.push(data.user.id);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      user_id: data.user.id,
      first_name: firstName,
      last_name: "MobileAudit",
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

mkdirSync(".mobile-audit", { recursive: true });

const clientUser = await makeUser("client", "Mobilia");
const adminUser = await makeUser("admin", "Adminia");

// Realistic data: services on both rails, contacts, devices, payments.
const { data: svc } = await admin
  .from("services")
  .insert({
    profile_id: clientUser.profileId,
    service_type: "monitoring",
    tier: "cellular_tc",
    status: "active",
    billing_method: "manual",
    billing_interval: "annual",
    monthly_amount_cents: 3995,
    next_due_on: "2027-03-15",
  })
  .select("id")
  .single();
await admin.from("caller_id_contacts").insert([
  { profile_id: clientUser.profileId, phone: "+17055550101", label: "Mobilia MobileAudit (homeowner)", passcode: "bluebird" },
  { profile_id: clientUser.profileId, phone: "+17055550102", label: "Neighbour With A Long Name", passcode: "acorn" },
]);
await admin.from("devices").insert([
  { profile_id: clientUser.profileId, label: "7Ah Security System Battery", category: "system_battery", lifetime_years: 5, installed_on: "2019-02-01" },
  { profile_id: clientUser.profileId, label: "Smoke Detector - Upstairs Hallway", category: "detector", lifetime_years: 10, installed_on: "2024-06-15" },
  { profile_id: clientUser.profileId, label: "Wireless Door Contact - Front", category: "wireless_device", lifetime_years: 10, installed_on: "2022-09-01" },
]);
await admin.from("manual_payments").insert({
  profile_id: clientUser.profileId,
  service_id: svc.id,
  amount_cents: 54172,
  method: "etransfer",
  paid_on: "2026-03-15",
  note: "Annual invoice, e-Transfer ref 99881",
  recorded_by_email: "info@mckeesecurity.ca",
});

const clientSession = ssrClientWithJar();
await clientSession.ssr.auth.signInWithPassword({ email: clientUser.email, password: clientUser.password });
const adminSession = ssrClientWithJar();
await adminSession.ssr.auth.signInWithPassword({ email: adminUser.email, password: adminUser.password });

const browser = await chromium.launch();
// AUDIT_VIEWPORT=1440 turns this into a desktop screenshot pass; default is iPhone.
const desktopWidth = Number.parseInt(process.env.AUDIT_VIEWPORT ?? "", 10);
const emulation = Number.isFinite(desktopWidth)
  ? { viewport: { width: desktopWidth, height: 900 } }
  : devices["iPhone 13"];

async function audit(name, path, session) {
  const context = await browser.newContext({ ...emulation, baseURL: baseUrl });
  if (session) {
    const u = new URL(baseUrl);
    await context.addCookies(
      session.cookies().map((c) => ({ name: c.name, value: c.value, domain: u.hostname, path: "/" })),
    );
  }
  const page = await context.newPage();
  await page.goto(path, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(900);

  const report = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const docW = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0);
    // Deepest elements that spill past the viewport and are not inside a
    // horizontal scroll container (those clip/scroll legitimately).
    const insideScroller = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ov = getComputedStyle(p).overflowX;
        if (ov === "auto" || ov === "scroll" || ov === "hidden" || ov === "clip") return true;
      }
      return false;
    };
    const spills = (el) => {
      const r = el.getBoundingClientRect();
      return (r.right > vw + 1 || r.left < -1) && r.width > 0;
    };
    const leaves = [...document.querySelectorAll("*")]
      .filter((el) => spills(el) && !insideScroller(el))
      .filter((el) => ![...el.children].some(spills));
    const describe = (el) => {
      const r = el.getBoundingClientRect();
      const cls = typeof el.className === "string" ? el.className.slice(0, 100) : "";
      return `<${el.tagName.toLowerCase()}> ${Math.round(r.left)}..${Math.round(r.right)} cls="${cls}"`;
    };
    return {
      vw,
      docW,
      overflow: docW > vw + 1,
      leaves: leaves.slice(0, 8).map((leaf) => {
        const chain = [];
        for (let el = leaf; el && el !== document.body; el = el.parentElement) chain.push(describe(el));
        return chain.slice(0, 7);
      }),
    };
  });

  await page.screenshot({ path: `.mobile-audit/${name}.png`, fullPage: true });
  console.log(`\n=== ${name} (${path}) viewport=${report.vw} docWidth=${report.docW} ${report.overflow ? "!! OVERFLOW" : "ok"}`);
  for (const chain of report.leaves) {
    console.log(`  LEAF ${chain[0]}`);
    for (const line of chain.slice(1)) console.log(`     ^ ${line}`);
  }
  await context.close();
}

try {
  await audit("client-signin", "/user-dashboard", null);
  await audit("client-dashboard", "/user-dashboard", clientSession);
  await audit("admin-signin", "/admin-dashboard", null);
  await audit("admin-overview", "/admin-dashboard", adminSession);
  await audit("admin-clients", "/admin-dashboard?tab=clients", adminSession);
  await audit("admin-billing", "/admin-dashboard?tab=billing", adminSession);
  await audit("admin-devices", "/admin-dashboard?tab=devices", adminSession);
  await audit("admin-alerts", "/admin-dashboard?tab=alerts", adminSession);
  await audit("admin-client-detail", `/admin-dashboard/clients/${clientUser.profileId}`, adminSession);
} finally {
  await browser.close();
  for (const id of createdProfiles) await admin.from("profiles").delete().eq("id", id);
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
  console.log(`\nCleanup: ${createdProfiles.length} profiles + ${createdUsers.length} auth users deleted.`);
}
