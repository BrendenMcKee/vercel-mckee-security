// O5985 write probe (PORTAL_PLAN R54 / docs/LANVAC_STATION.md).
// Run: node --env-file=.env.local scripts/lanvac-o5985-write-check.mjs
// Snapshots first, then account OnTest/OffTest only. McKee puts the whole
// account on test, never a single zone. Zone/OnTest is not called.
// INCLUDE_ZONE_WRITES=1 also creates/updates/deletes unused zone 7.
// Always restores the exact list. Account OffTest is 500 when already off.
// Never calls /api/Account/status or /api/Account/new.
// Never logs the dealer password.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ACCOUNT = "O5985";
const THROW_ZONE = 7;
const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "..", ".lanvac-o5985");

const base = (process.env.LANVAC_API_BASE ?? "https://lanvac.mobi:8843").replace(/\/$/, "");
const dealerAccount = process.env.LANVAC_DEALER_ACCOUNT ?? "10638";
const password = process.env.LANVAC_DEALER_PASSWORD;

if (!password) {
  console.error("Missing LANVAC_DEALER_PASSWORD. Set it in website/.env.local (server-only).");
  process.exit(1);
}

const RESTORE = [
  { zoneNumber: 1, description: "BUNKIE SMOKE DETECTOR'S", zoneType: "FIRE" },
  { zoneNumber: 2, description: "BUNKIE MAIN DOOR", zoneType: "BURGLAR" },
  { zoneNumber: 3, description: "BUNKIE LIVING ROOM MOTION", zoneType: "BURGLAR" },
  { zoneNumber: 4, description: "BUNKIE BEDROOM MOTION", zoneType: "BURGLAR" },
  { zoneNumber: 5, description: "BUNKIE CRAWLSPACE LOW TEMPERATURE", zoneType: "LOW TEMPERATURE" },
  { zoneNumber: 6, description: "BUNKIE GAS DETECTOR", zoneType: "CARBON MONOXIDE" },
  { zoneNumber: 9, description: "BUNKIE MAIN FLOOR GAS DETECTOR", zoneType: "CARBON MONOXIDE" },
];

function dealerIdentity() {
  return { dealerAccount, password };
}

function identity() {
  return { dealerIdentity: dealerIdentity(), account: ACCOUNT };
}

async function call(method, path, body) {
  const started = Date.now();
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json = null;
  let parseOk = true;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    parseOk = false;
    json = { parseError: true, text: text.slice(0, 200) };
  }
  return {
    path,
    method,
    status: res.status,
    ms: Date.now() - started,
    ok: res.ok,
    parseOk,
    body: json,
  };
}

function interpretZone(row) {
  const raw = String(row.description ?? "").replace(/\s+$/, "");
  const marked = raw.endsWith("+");
  const description = marked ? raw.replace(/\s*\+$/, "").replace(/\s+$/, "") : raw;
  return {
    zoneNumber: row.zoneNumber,
    onTest: Boolean(row.onTest) || marked,
    description,
    zoneType: row.zoneType,
    marked,
  };
}

async function listZones() {
  const listed = await call("POST", "/api/Zone", identity());
  const rows = Array.isArray(listed.body) ? listed.body : [];
  return {
    ...listed,
    rows: rows.map(interpretZone),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function accountOffTest() {
  const posted = await call("POST", "/api/Account/OffTest", identity());
  if (posted.ok) return posted;
  if (posted.status === 500) {
    await sleep(1500);
    const retry = await call("POST", "/api/Account/OffTest", identity());
    if (retry.ok || retry.status === 500) {
      return { ...retry, ok: true, extra: retry.ok ? "retry" : "already off" };
    }
    return retry;
  }
  return posted;
}

async function zoneOffTest(zoneNumber) {
  const posted = await call("POST", "/api/Zone/OffTest", { ...identity(), zone: zoneNumber });
  if (posted.ok) return posted;
  const listed = await listZones();
  const row = listed.rows.find((zone) => zone.zoneNumber === zoneNumber);
  if (!row || !row.onTest) {
    return { ...posted, ok: true, extra: "already off" };
  }
  return posted;
}

function zoneKey(zone) {
  return `${zone.zoneNumber}|${zone.description}|${zone.zoneType}|${zone.onTest ? 1 : 0}`;
}

function matchesRestore(rows) {
  if (rows.length !== RESTORE.length) return false;
  const got = new Set(rows.map((row) => `${row.zoneNumber}|${row.description}|${row.zoneType}`));
  return RESTORE.every((row) => got.has(`${row.zoneNumber}|${row.description}|${row.zoneType}`))
    && rows.every((row) => row.onTest === false);
}

const log = [];
function note(step, result) {
  const line = {
    step,
    ok: result.ok,
    status: result.status,
    ms: result.ms,
    extra: result.extra ?? null,
  };
  log.push(line);
  console.log(
    `${result.ok ? "PASS" : "FAIL"}  ${step}  status=${result.status}  ${result.ms}ms${
      result.extra ? `  ${result.extra}` : ""
    }`,
  );
}

async function restore() {
  await accountOffTest();
  const listed = await listZones();
  for (const row of listed.rows) {
    if (row.onTest) {
      await zoneOffTest(row.zoneNumber);
    }
    if (!RESTORE.some((keep) => keep.zoneNumber === row.zoneNumber)) {
      await call("DELETE", "/api/Zone", { ...identity(), zoneId: row.zoneNumber });
    }
  }
  await sleep(1500);
  return listZones();
}

console.log(`O5985 write check against ${base} (password not logged).`);

const before = await listZones();
note("backup zone list", {
  ok: before.ok && matchesRestore(before.rows),
  status: before.status,
  ms: before.ms,
  extra: `count=${before.rows.length}`,
});
if (!before.ok) process.exit(2);

await mkdir(outDir, { recursive: true });
await writeFile(
  join(outDir, "restore-before-write.json"),
  JSON.stringify({ pulledAt: new Date().toISOString(), zones: before.rows }, null, 2),
  "utf8",
);

try {
  const accountOn = await call("POST", "/api/Account/OnTest", {
    ...identity(),
    testDurationInMinutes: 5,
  });
  note("account OnTest 5 min", accountOn);

  let mid = await listZones();
  note("GET zones while account on test", {
    ok: mid.ok && matchesRestore(mid.rows),
    status: mid.status,
    ms: mid.ms,
    extra: `onTestAny=${mid.rows.some((row) => row.onTest)} marked=${mid.rows.filter((row) => row.marked).length}`,
  });
  if (mid.ok && mid.rows.some((row) => row.onTest)) {
    await sleep(2000);
    mid = await listZones();
    note("GET zones after 2s", {
      ok: mid.ok,
      status: mid.status,
      ms: mid.ms,
      extra: `onTestAny=${mid.rows.some((row) => row.onTest)}`,
    });
  }

  const historic = await call("POST", "/api/Historic", {
    ...identity(),
    currentPage: 1,
    elementsPerPage: 8,
  });
  const historicRows = Array.isArray(historic.body) ? historic.body : [];
  const historicSample = historicRows
    .slice(0, 6)
    .map((row) => `${row.signal} ${String(row.description ?? "").replace(/\S+@\S+/g, "[email]").slice(0, 50)}`)
    .join(" | ");
  note("Historic after account OnTest", {
    ok: historic.ok,
    status: historic.status,
    ms: historic.ms,
    extra: historicSample,
  });

  const accountOff = await accountOffTest();
  note("account OffTest", accountOff);

  if (process.env.INCLUDE_ZONE_WRITES === "1") {
  const created = await call("POST", "/api/Zone/create", {
    ...identity(),
    zoneId: THROW_ZONE,
    description: "PORTAL WRITE CHECK",
    zoneType: "BUR",
    useCallList: true,
    delay: 1,
    emailsAndPhoneNumbers: [],
  });
  note("create zone 7 BUR", created);

  const afterCreate = await listZones();
  const throwRow = afterCreate.rows.find((row) => row.zoneNumber === THROW_ZONE);
  note("GET shows zone 7", {
    ok: afterCreate.ok && throwRow?.description === "PORTAL WRITE CHECK",
    status: afterCreate.status,
    ms: afterCreate.ms,
    extra: throwRow ? `${throwRow.zoneType} ${throwRow.description}` : "missing",
  });

  const updated = await call("PUT", "/api/Zone", {
    ...identity(),
    zoneId: THROW_ZONE,
    description: "PORTAL WRITE CHECK EDIT",
    zoneType: "BUR",
    useCallList: true,
    delay: 1,
    emailsAndPhoneNumbers: [],
  });
  note("update zone 7 description", updated);

  const afterUpdate = await listZones();
  const edited = afterUpdate.rows.find((row) => row.zoneNumber === THROW_ZONE);
  note("GET shows zone 7 edit", {
    ok: afterUpdate.ok && edited?.description === "PORTAL WRITE CHECK EDIT",
    status: afterUpdate.status,
    ms: afterUpdate.ms,
    extra: edited?.description ?? "missing",
  });

  const deleted = await call("DELETE", "/api/Zone", { ...identity(), zoneId: THROW_ZONE });
  note("delete zone 7", deleted);
  }
} finally {
  const restored = await restore();
  const ok = restored.ok && matchesRestore(restored.rows);
  note("restore exact list", {
    ok,
    status: restored.status,
    ms: restored.ms,
    extra: restored.rows.map(zoneKey).join(" ; "),
  });
  await writeFile(
    join(outDir, "write-check.json"),
    JSON.stringify(
      {
        pulledAt: new Date().toISOString(),
        lanvacAccount: ACCOUNT,
        log,
        restored: restored.rows,
        restoreOk: ok,
      },
      null,
      2,
    ),
    "utf8",
  );
  if (!ok) {
    console.error("RESTORE FAILED. McKee zone list does not match the restore table.");
    process.exit(3);
  }
}

const failed = log.filter((row) => !row.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} write check(s) FAILED. Restore itself succeeded.`);
  process.exit(1);
}
console.log("\nAll O5985 write checks passed. Restore list matches.");
