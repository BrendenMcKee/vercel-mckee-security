// One-off hosted check: McKee Bunkie (O5985) + House (O4964) on one account.
// Creates a throwaway member and stranger, then deletes them. Does not
// delete either McKee site, send mail, or call Lanvac writes.
// Run: node --env-file=.env.local scripts/mckee-two-site-check.mjs

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !serviceKey || !publishableKey) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}

const BUNKIE = "decfe374-2129-4515-9256-5c7c0da275ac";
const HOUSE = "c105e320-e021-4b39-9420-ad4861013ce8";
const ACCOUNT = "6beb4f47-a1a5-428f-8f1e-772a0de9a586";
const OWNER = "25ef77ca-c0ff-4c71-b6e0-006c62a94f4b";

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const failures = [];
let checks = 0;
function check(name, ok, detail = "") {
  checks += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures.push(name);
}

const stamp = Date.now();
const createdUsers = [];
const createdMembers = [];

async function makeAuth(label) {
  const email = `mckee-two-site-${label}-${stamp}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  createdUsers.push(data.user.id);
  const session = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await session.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { session, userId: data.user.id, email };
}

try {
  const { data: sites, error: sitesError } = await admin
    .from("profiles")
    .select("id, first_name, last_name, lanvac_account_code, status, user_id, account_id, email")
    .eq("account_id", ACCOUNT)
    .eq("role", "client")
    .order("lanvac_account_code");
  check("both McKee sites are on the same account", !sitesError && (sites ?? []).length === 2, sitesError?.message);
  const codes = new Set((sites ?? []).map((row) => row.lanvac_account_code));
  check("sites are O5985 (Bunkie) and O4964 (House)", codes.has("O5985") && codes.has("O4964"));
  const bunkie = (sites ?? []).find((row) => row.id === BUNKIE);
  const house = (sites ?? []).find((row) => row.id === HOUSE);
  check("Bunkie keeps leftover home user_id", bunkie?.user_id === OWNER);
  check("House has no profiles.user_id", house?.user_id == null);
  check("site contact email may repeat", bunkie?.email === house?.email && Boolean(bunkie?.email));

  const { data: account } = await admin
    .from("accounts")
    .select("name, auto_onboard")
    .eq("id", ACCOUNT)
    .single();
  check("account auto_onboard is off for two sites", account?.auto_onboard === false);
  check("account is named McKee", account?.name === "McKee");

  const { data: owners } = await admin
    .from("account_members")
    .select("id, role, user_id, email")
    .eq("account_id", ACCOUNT)
    .eq("role", "owner");
  check("exactly one Account admin", (owners ?? []).length === 1 && owners[0].user_id === OWNER);

  const { data: leftoverInvite } = await admin
    .from("invitations")
    .select("id, profile_id")
    .eq("profile_id", HOUSE);
  check("attach did not create a House invitation", (leftoverInvite ?? []).length === 0);

  const member = await makeAuth("member");
  const { error: memberRowError } = await admin.from("account_members").insert({
    account_id: ACCOUNT,
    user_id: member.userId,
    email: member.email,
    role: "member",
  });
  check("throwaway member row inserts", !memberRowError, memberRowError?.message);
  if (!memberRowError) createdMembers.push(member.userId);

  const { data: memberSites, error: memberReadError } = await member.session
    .from("profiles")
    .select("id, lanvac_account_code, user_id");
  const memberIds = new Set((memberSites ?? []).map((row) => row.id));
  check(
    "member without home user_id sees Bunkie and House",
    !memberReadError && memberIds.has(BUNKIE) && memberIds.has(HOUSE),
    memberReadError?.message ?? `rows=${memberSites?.length}`,
  );

  const { data: memberServices } = await member.session
    .from("services")
    .select("profile_id, service_type");
  const serviceSites = new Set((memberServices ?? []).map((row) => row.profile_id));
  check(
    "member sees services on both sites",
    serviceSites.has(BUNKIE) && serviceSites.has(HOUSE),
    `rows=${memberServices?.length}`,
  );

  const { data: flipped } = await member.session
    .from("accounts")
    .update({ auto_onboard: true })
    .eq("id", ACCOUNT)
    .select("id");
  const { data: afterFlip } = await admin.from("accounts").select("auto_onboard").eq("id", ACCOUNT).single();
  check(
    "member cannot flip auto_onboard",
    (flipped ?? []).length === 0 && afterFlip?.auto_onboard === false,
  );

  const stranger = await makeAuth("stranger");
  const { data: strangerSites } = await stranger.session
    .from("profiles")
    .select("id")
    .in("id", [BUNKIE, HOUSE]);
  check("stranger sees neither McKee site", (strangerSites ?? []).length === 0);

  const { error: disableError } = await admin.from("profiles").update({ status: "disabled" }).eq("id", HOUSE);
  check("House can be disabled with no user_id", !disableError, disableError?.message);
  const { data: afterDisable } = await member.session.from("profiles").select("id, status");
  const disabledHouse = (afterDisable ?? []).find((row) => row.id === HOUSE);
  const activeBunkie = (afterDisable ?? []).find((row) => row.id === BUNKIE);
  check("member still reads Bunkie after House disable", activeBunkie?.status === "active");
  check("House disable is per-site (row still readable, status disabled)", disabledHouse?.status === "disabled");
  const { error: enableError } = await admin.from("profiles").update({ status: "active" }).eq("id", HOUSE);
  check("House re-enable works with user_id null", !enableError, enableError?.message);

  const { data: remainingMembers } = await admin
    .from("account_members")
    .select("id")
    .eq("user_id", OWNER);
  const { data: remainingHome } = await admin.from("profiles").select("id").eq("user_id", OWNER);
  check(
    "deleting House would not wipe the shared login",
    (remainingMembers ?? []).length >= 1 && (remainingHome ?? []).length >= 1,
  );
} finally {
  for (const userId of createdMembers) {
    await admin.from("account_members").delete().eq("user_id", userId).eq("account_id", ACCOUNT);
  }
  await admin.from("profiles").update({ status: "active" }).eq("id", HOUSE);
  for (const id of createdUsers) {
    await admin.auth.admin.deleteUser(id);
  }
  const { data: leftover } = await admin
    .from("account_members")
    .select("id, email")
    .eq("account_id", ACCOUNT)
    .like("email", "mckee-two-site-%");
  if ((leftover ?? []).length > 0) {
    console.error("Leftover throwaway members:", leftover);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length}/${checks} checks FAILED.`);
  process.exit(1);
}
console.log(`\nAll ${checks} McKee two-site checks passed.`);
