// Historic color map from docs/LANVAC_STATION.md (O5985 snapshot).
// Run: node --import ./scripts/register-ts-alias.mjs scripts/lanvac-signals-check.mjs

import {
  classifyLanvacSignal,
  formatLanvacHistoricWhen,
  parseLanvacHistoricDate,
  stationStatusChip,
} from "../src/lib/portal/lanvac-signals.ts";
import { historicKind, presentHistoricSignals } from "../src/lib/portal/lanvac-historic.ts";

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
  "account stop testing is on-test",
  classifyLanvacSignal({
    description: "STOP TESTING BY MOBI DENNIS MCKEE",
    signal: "-X0070",
  }) === "on_test",
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
  "historic display is 12-hour",
  formatLanvacHistoricWhen("08-22-2026 13:56:24") === "August 22, 2026, 1:56 p.m.",
);
check("stop testing is off test", historicKind({ description: "STOP TESTING BY MOBI DENNIS MCKEE", signalClass: "on_test" }) === "off_test");
const grouped = presentHistoricSignals([
  {
    occurredAtText: "08-22-2026 13:56:24",
    signal: "-X0076",
    description: "[E-MAIL] ON-TEST END > SENT",
    signalClass: "on_test",
  },
  {
    occurredAtText: "08-22-2026 13:56:24",
    signal: "-X0019",
    description: "[E-MAIL] >> [email]",
    signalClass: "ops",
  },
  {
    occurredAtText: "08-22-2026 13:56:20",
    signal: "-X0070",
    description: "STOP TESTING BY MOBI DENNIS MCKEE",
    signalClass: "on_test",
  },
]);
check(
  "on-test burst collapses",
  grouped.length === 1 && grouped[0].kind === "off_test" && grouped[0].title === "Off test",
);
check(
  "generic email is folded into the burst",
  grouped[0].details.every((line) => line !== "Station email sent"),
);
const dealerOnly = presentHistoricSignals([
  {
    occurredAtText: "08-22-2026 13:45:55",
    signal: "-X0070",
    description: "[ON-TEST] 10638 >> O5985",
    signalClass: "on_test",
  },
]);
check("dealer account line is hidden", dealerOnly[0]?.details.length === 0);

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
  "on-test last signal is not green",
  stationStatusChip({
    isDisabled: false,
    onTestUntil: null,
    anyZoneOnTest: false,
    lastSignalClass: "on_test",
    lastSignalAt: "2026-08-22T14:05:09.000Z",
  }).kind === "unknown",
);
check(
  "restore last signal is green-leaning",
  stationStatusChip({
    isDisabled: false,
    onTestUntil: null,
    anyZoneOnTest: false,
    lastSignalClass: "restore",
    lastSignalAt: "2026-08-22T14:05:09.000Z",
  }).kind === "ok",
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
