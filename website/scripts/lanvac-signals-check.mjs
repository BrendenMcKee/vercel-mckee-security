// Historic color map from docs/LANVAC_STATION.md (O5985 snapshot).
// Run: node --import ./scripts/register-ts-alias.mjs scripts/lanvac-signals-check.mjs

import {
  classifyLanvacSignal,
  parseLanvacHistoricDate,
  stationStatusChip,
} from "../src/lib/portal/lanvac-signals.ts";

const failures = [];
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures.push(name);
}

check(
  "fire alarm",
  classifyLanvacSignal({ description: "ALARM((FIRE)) ZONE:001", signal: "110011" }) === "alarm",
);
check(
  "restore is not alarm",
  classifyLanvacSignal({ description: "RESTORE ZONE:001", signal: "110011" }) === "restore",
);
check(
  "ops email is gray class",
  classifyLanvacSignal({ description: "Call list email", signal: "-X0019" }) === "ops",
);
check(
  "on-test history",
  classifyLanvacSignal({ description: "[ON-TEST] begin", signal: "-X0076" }) === "on_test",
);
check(
  "mobi file viewed is ops",
  classifyLanvacSignal({
    description: "CUSTOMER FILE VIEWED BY MOBI DENNIS MCKEE",
    signal: "-X0070",
  }) === "ops",
);
check(
  "zone on-test email",
  classifyLanvacSignal({
    description: "[E-MAIL] ZONE 2 ON-TEST END > SENT",
    signal: "-X0043",
  }) === "on_test",
);
check(
  "unknown stays unknown",
  classifyLanvacSignal({ description: "Something new", signal: "999999" }) === "unknown",
);

const parsed = parseLanvacHistoricDate("08-22-2026 14:05:09");
check("historic date parses", parsed.iso === "2026-08-22T14:05:09.000Z" && parsed.display === "08-22-2026 14:05:09");

check(
  "empty log is not all clear",
  stationStatusChip({
    isDisabled: false,
    onTestUntil: null,
    anyZoneOnTest: false,
    lastSignalClass: null,
    lastSignalAt: null,
  }).kind === "empty",
);
check(
  "unknown last signal is gray",
  stationStatusChip({
    isDisabled: false,
    onTestUntil: null,
    anyZoneOnTest: false,
    lastSignalClass: "unknown",
    lastSignalAt: "2026-08-22T14:05:09.000Z",
  }).kind === "unknown",
);
check(
  "disabled wins",
  stationStatusChip({
    isDisabled: true,
    onTestUntil: null,
    anyZoneOnTest: true,
    lastSignalClass: "alarm",
    lastSignalAt: "2026-08-22T14:05:09.000Z",
  }).kind === "disabled",
);

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll Lanvac signal checks passed.");
