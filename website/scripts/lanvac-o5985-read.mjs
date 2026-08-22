// Read-only snapshot of McKee CODE O5985 (PORTAL_PLAN R54 / docs/LANVAC_STATION.md).
// Run: node --env-file=.env.local scripts/lanvac-o5985-read.mjs
// Writes website/.lanvac-o5985/ (gitignored). Never logs the dealer password.
// Does not call OnTest, OffTest, status, new, or any zone write.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ACCOUNT = "O5985";
const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "..", ".lanvac-o5985");

const base = (process.env.LANVAC_API_BASE ?? "https://lanvac.mobi:8843").replace(/\/$/, "");
const dealerAccount = process.env.LANVAC_DEALER_ACCOUNT ?? "10638";
const password = process.env.LANVAC_DEALER_PASSWORD;

if (!password) {
  console.error("Missing LANVAC_DEALER_PASSWORD. Set it in website/.env.local (server-only).");
  process.exit(1);
}

function dealerIdentity() {
  return { dealerAccount, password };
}

function redact(value) {
  if (value == null) return value;
  const copy = JSON.parse(JSON.stringify(value));
  if (copy.dealerIdentity) copy.dealerIdentity.password = "[redacted]";
  return copy;
}

async function postJson(path, body) {
  const url = `${base}${path}`;
  const started = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { parseError: true, text: text.slice(0, 500) };
  }
  return {
    path,
    method: "POST",
    status: res.status,
    ms: Date.now() - started,
    ok: res.ok,
    body: json,
  };
}

const accountBody = { dealerIdentity: dealerIdentity(), account: ACCOUNT };
const historic50 = {
  dealerIdentity: dealerIdentity(),
  account: ACCOUNT,
  currentPage: 1,
  elementsPerPage: 50,
};
const historic25 = { ...historic50, elementsPerPage: 25 };
const historic10 = { ...historic50, elementsPerPage: 10 };

console.log(`Read-only POST against ${base} account ${ACCOUNT} (password not logged).`);

const account = await postJson("/api/Account", accountBody);
const zones = await postJson("/api/Zone", accountBody);
let historic = await postJson("/api/Historic", historic50);
let historicPageSize = 50;
if (!historic.ok && historic.status === 400) {
  historic = await postJson("/api/Historic", historic25);
  historicPageSize = 25;
}
if (!historic.ok && historic.status === 400) {
  historic = await postJson("/api/Historic", historic10);
  historicPageSize = 10;
}

await mkdir(outDir, { recursive: true });
const snapshot = {
  pulledAt: new Date().toISOString(),
  account: ACCOUNT,
  base,
  historicPageSize,
  account: redact({ request: accountBody, ...account }),
  zones: redact({ request: accountBody, ...zones }),
  historic: redact({ request: { ...historic50, elementsPerPage: historicPageSize }, ...historic, usedPageSize: historicPageSize }),
};

// Fix key clash: top-level account CODE vs Account response
const file = {
  pulledAt: snapshot.pulledAt,
  lanvacAccount: ACCOUNT,
  base,
  historicPageSize,
  accountRead: snapshot.account,
  zoneRead: snapshot.zones,
  historicRead: snapshot.historic,
};

await writeFile(join(outDir, "snapshot.json"), JSON.stringify(file, null, 2), "utf8");

const zoneList = Array.isArray(zones.body) ? zones.body : [];
const historicList = Array.isArray(historic.body) ? historic.body : [];
const signals = [
  ...new Set(historicList.map((row) => String(row?.signal ?? "")).filter(Boolean)),
];

const summary = {
  pulledAt: file.pulledAt,
  accountOk: account.ok,
  accountStatus: account.status,
  panelType: account.body && !Array.isArray(account.body) ? account.body.panelType : null,
  isDisabled: account.body && !Array.isArray(account.body) ? account.body.isDisabled : null,
  zoneOk: zones.ok,
  zoneStatus: zones.status,
  zoneCount: zoneList.length,
  zones: zoneList.map((z) => ({
    zoneNumber: z.zoneNumber,
    onTest: z.onTest,
    description: z.description,
    zoneType: z.zoneType,
  })),
  historicOk: historic.ok,
  historicStatus: historic.status,
  historicPageSize,
  historicCount: historicList.length,
  distinctSignals: signals,
  sampleDates: historicList.slice(0, 5).map((row) => row?.date ?? null),
};

await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");

console.log(JSON.stringify(summary, null, 2));
console.log(`Wrote ${outDir} (gitignored).`);

if (!account.ok || !zones.ok || !historic.ok) {
  process.exit(2);
}
