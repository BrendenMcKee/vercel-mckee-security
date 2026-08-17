// Phase 8A cloud-route check. Does not talk to QuickBooks.
// Run: node --env-file=.env.local scripts/qb-bridge-check.mjs [baseUrl]
//
// Creates a throwaway sandbox bridge, hits poll/report/mirror on a running
// Next server, then deletes the fixture rows.

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_* env vars.");
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
const secret = randomBytes(32).toString("base64url");
const secretHash = createHash("sha256").update(secret, "utf8").digest("hex");
const expectedFile =
  "C:\\Users\\Public\\Documents\\Intuit\\QuickBooks\\PORTAL-TEST\\McKee Security PORTAL-TEST do-not-invoice.QBW";
const liveFile =
  "C:\\Users\\Public\\Documents\\Intuit\\QuickBooks\\Company Files\\McKee Security Live.QBW";

let bridgeId = null;
let profileId = null;
const customerListId = `CHECK-${stamp}`;
const txnId = `TXN-${stamp}`;

function headersFor(bearer, id = bridgeId) {
  return {
    authorization: `Bearer ${bearer}`,
    "x-qb-bridge-id": id,
    "content-type": "application/json",
  };
}

try {
  const { data: bridge, error: bridgeError } = await admin
    .from("qb_bridges")
    .insert({
      label: `qb-bridge-check ${stamp}`,
      secret_hash: secretHash,
      mode: "sandbox",
      expected_company_file: expectedFile,
    })
    .select("id")
    .single();
  if (bridgeError) throw bridgeError;
  bridgeId = bridge.id;

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      first_name: "Qb",
      last_name: "Check",
      email: `qb-check-${stamp}@example.com`,
      role: "client",
      status: "pending",
    })
    .select("id")
    .single();
  if (profileError) throw profileError;
  profileId = profile.id;

  const { error: linkError } = await admin.from("qb_customers").insert({
    list_id: customerListId,
    edit_sequence: "1",
    name: "QB CHECK CUSTOMER",
    profile_id: profileId,
  });
  if (linkError) throw linkError;

  const bare = await fetch(`${baseUrl}/api/qb/poll`, { method: "POST" });
  check("poll rejects missing auth", bare.status === 401 || bare.status === 503, `status=${bare.status}`);

  const wrong = await fetch(`${baseUrl}/api/qb/poll`, {
    method: "POST",
    headers: headersFor("wrong-secret"),
  });
  check("poll rejects wrong secret", wrong.status === 401, `status=${wrong.status}`);

  const badId = await fetch(`${baseUrl}/api/qb/poll`, {
    method: "POST",
    headers: headersFor(secret, "not-a-uuid"),
  });
  check("poll rejects invalid bridge id", badId.status === 401, `status=${badId.status}`);

  const poll = await fetch(`${baseUrl}/api/qb/poll`, {
    method: "POST",
    headers: headersFor(secret),
    body: JSON.stringify({
      company_file: expectedFile,
      company_name: "PORTAL TEST",
      qb_version: "2024 R21P",
    }),
  });
  const pollJson = await poll.json();
  check("poll accepts matching sandbox file", poll.ok && pollJson.ok === true && pollJson.file_ok === true, `status=${poll.status}`);
  check("poll returns no write tasks", Array.isArray(pollJson.tasks) && pollJson.tasks.length === 0);

  const quoted = await fetch(`${baseUrl}/api/qb/poll`, {
    method: "POST",
    headers: headersFor(secret),
    body: JSON.stringify({ company_file: `"${expectedFile}"` }),
  });
  const quotedJson = await quoted.json();
  check("poll accepts quoted company path", quoted.ok && quotedJson.file_ok === true, `status=${quoted.status}`);
  const { data: storedFile } = await admin
    .from("qb_bridges")
    .select("qb_company_file")
    .eq("id", bridgeId)
    .single();
  check(
    "quoted company path is stored without quotes",
    storedFile?.qb_company_file === expectedFile,
    `stored=${storedFile?.qb_company_file}`,
  );

  const livePoll = await fetch(`${baseUrl}/api/qb/poll`, {
    method: "POST",
    headers: headersFor(secret),
    body: JSON.stringify({ company_file: liveFile }),
  });
  const livePollJson = await livePoll.json();
  check(
    "sandbox poll with live file is file_ok false, not 409",
    livePoll.status === 200 && livePollJson.file_ok === false,
    `status=${livePoll.status} file_ok=${livePollJson.file_ok}`,
  );

  const { error: liveModeError } = await admin.from("qb_bridges").update({ mode: "live" }).eq("id", bridgeId);
  if (liveModeError) throw liveModeError;

  const liveMismatch = await fetch(`${baseUrl}/api/qb/poll`, {
    method: "POST",
    headers: headersFor(secret),
    body: JSON.stringify({ company_file: expectedFile }),
  });
  check("live poll refuses unexpected file", liveMismatch.status === 409, `status=${liveMismatch.status}`);

  const { error: sandboxAgain } = await admin
    .from("qb_bridges")
    .update({ mode: "sandbox", expected_company_file: expectedFile })
    .eq("id", bridgeId);
  if (sandboxAgain) throw sandboxAgain;

  const reportTasks = await fetch(`${baseUrl}/api/qb/report`, {
    method: "POST",
    headers: headersFor(secret),
    body: JSON.stringify({ results: [{ task_id: "nope" }] }),
  });
  check("report rejects task results until 8B", reportTasks.status === 409, `status=${reportTasks.status}`);

  const report = await fetch(`${baseUrl}/api/qb/report`, {
    method: "POST",
    headers: headersFor(secret),
    body: JSON.stringify({ error: null, company_file: expectedFile }),
  });
  check("report accepts heartbeat", report.ok, `status=${report.status}`);

  const badPay = await fetch(`${baseUrl}/api/qb/mirror`, {
    method: "POST",
    headers: headersFor(secret),
    body: JSON.stringify({
      company_file: expectedFile,
      payments: [
        {
          txn_id: "ZERO",
          edit_sequence: "1",
          customer_list_id: customerListId,
          txn_date: "2026-01-01",
          amount_cents: 0,
        },
      ],
    }),
  });
  check("mirror rejects zero-amount payment", badPay.status === 400, `status=${badPay.status}`);

  const wrongFile = await fetch(`${baseUrl}/api/qb/mirror`, {
    method: "POST",
    headers: headersFor(secret),
    body: JSON.stringify({ company_file: liveFile, customers: [] }),
  });
  check("mirror refuses live file in sandbox", wrongFile.status === 409, `status=${wrongFile.status}`);

  const mirror = await fetch(`${baseUrl}/api/qb/mirror`, {
    method: "POST",
    headers: headersFor(secret),
    body: JSON.stringify({
      company_file: expectedFile,
      company_name: "PORTAL TEST",
      customers: [
        {
          list_id: customerListId,
          edit_sequence: "2",
          name: "QB CHECK CUSTOMER",
          email: "qb-check@example.com",
          is_active: true,
          balance_cents: 1234,
        },
      ],
      invoices: [
        {
          txn_id: txnId,
          edit_sequence: "1",
          customer_list_id: customerListId,
          txn_date: "2024-06-01",
          amount_cents: 33832,
          is_paid: true,
          line_items: [{ name: "Annual Monitoring", amount_cents: 29940, quantity: 12 }],
        },
      ],
      payments: [
        {
          txn_id: `PAY-${stamp}`,
          edit_sequence: "1",
          customer_list_id: customerListId,
          txn_date: "2024-06-02",
          amount_cents: 33832,
          payment_method: "Electronic Funds Transfer",
          deposit_account: "1499",
        },
      ],
      todos: [
        {
          todo_id: `TODO-${stamp}`,
          notes: "QB CHECK CUSTOMER zone 2 smokes 2021",
          is_done: false,
        },
      ],
    }),
  });
  const mirrorJson = await mirror.json();
  check("mirror upserts all four kinds", mirror.ok && mirrorJson.ok === true, `status=${mirror.status}`);
  check(
    "mirror counts",
    mirrorJson.upserted?.customers === 1 &&
      mirrorJson.upserted?.invoices === 1 &&
      mirrorJson.upserted?.payments === 1 &&
      mirrorJson.upserted?.todos === 1,
    JSON.stringify(mirrorJson.upserted),
  );

  const { data: customer } = await admin
    .from("qb_customers")
    .select("profile_id, email, edit_sequence, balance_cents")
    .eq("list_id", customerListId)
    .single();
  check("mirror keeps profile_id", customer?.profile_id === profileId, `profile_id=${customer?.profile_id}`);
  check("mirror refreshed customer fields", customer?.edit_sequence === "2" && customer?.balance_cents === 1234);
} catch (error) {
  console.error(error);
  failures.push("threw");
} finally {
  if (bridgeId) {
    await admin.from("qb_invoices").delete().eq("customer_list_id", customerListId);
    await admin.from("qb_payments").delete().eq("customer_list_id", customerListId);
    await admin.from("qb_todos").delete().like("todo_id", `TODO-${stamp}`);
    await admin.from("qb_customers").delete().eq("list_id", customerListId);
    await admin.from("qb_bridges").delete().eq("id", bridgeId);
  }
  if (profileId) {
    await admin.from("profiles").delete().eq("id", profileId);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll qb-bridge cloud route checks passed.");
