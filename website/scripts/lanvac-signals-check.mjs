// Historic color map from docs/LANVAC_STATION.md (O5985 snapshot).
// Run: node --import ./scripts/register-ts-alias.mjs scripts/lanvac-signals-check.mjs

import {
  classifyLanvacSignal,
  formatLanvacHistoricShortWhen,
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
check(
  "AlarmNet brand is not an alarm by itself",
  classifyLanvacSignal({
    description: "AlarmNet supervision check-in",
    signal: "230001",
  }) !== "alarm",
);
check(
  "AlarmNet receiver path is an alarm",
  classifyLanvacSignal({
    description: "SIGNAL COMING FROM AlarmNet Receiver",
    signal: "110011",
  }) === "alarm",
);
check(
  "8-hour summary is not an alarm",
  classifyLanvacSignal({
    description: "[E-MAIL] SUMMARY 10638 Last 8Hrs. Alarm At 20:30",
    signal: "-X0019",
  }) !== "alarm",
);

const parsed = parseLanvacHistoricDate("08-22-2026 14:05:09");
check("historic date parses", parsed.iso === "2026-08-22T14:05:09.000Z" && parsed.display === "08-22-2026 14:05:09");
check(
  "historic display is 12-hour",
  formatLanvacHistoricWhen("08-22-2026 13:56:24") === "August 22, 2026, 1:56 p.m.",
);
check(
  "historic short when keeps the date",
  formatLanvacHistoricShortWhen("08-22-2026 13:56:24") === "Aug 22 · 1:56 p.m.",
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
  grouped.length === 1 && grouped[0].kind === "off_test" && grouped[0].title === "Off Test",
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
  "communication restore is a restore",
  historicKind({
    description: "CUSTOMER RESPONDING/COMMUNICATION RESTORE",
    signalClass: "comm_restore",
  }) === "restore",
);
const comm = presentHistoricSignals([
  {
    occurredAtText: "03-11-2026 15:16:00",
    signal: "350001",
    description: "CUSTOMER RESPONDING/COMMUNICATION RESTORE",
    signalClass: "comm_restore",
  },
]);
check(
  "communication restore is explained",
  comm[0]?.kind === "restore" &&
    comm[0].title === "Communication Restore" &&
    /communicator/i.test(comm[0].summary ?? ""),
);

const callList = presentHistoricSignals([
  {
    occurredAtText: "08-22-2026 14:43:00",
    signal: "-X0071",
    description: "By 10638 Dennis Mckee (Mobi)",
    signalClass: "ops",
  },
  {
    occurredAtText: "08-22-2026 14:43:00",
    signal: "-X0019",
    description: "O5985 · UPDATE CALL-LIST: #1",
    signalClass: "ops",
  },
]);
check(
  "call list is not other",
  callList[0]?.kind === "call_list" &&
    callList[0].title === "Call List Updated · Contact #1" &&
    /Dennis McKee/i.test(callList[0].summary ?? ""),
);

const opening = presentHistoricSignals([
  {
    occurredAtText: "03-06-2026 10:35:00",
    signal: "401002",
    description: "OPENING USER:002 AREA:1",
    signalClass: "open_close",
  },
]);
check(
  "opening is disarmed",
  opening[0]?.kind === "open_close" &&
    opening[0].title === "System Opened (Disarmed) · User 2 · Area 1",
);

const dispatch = presentHistoricSignals([
  {
    occurredAtText: "05-29-2026 18:43:00",
    signal: "-X0011",
    description: "REFERENCE CALL NUMBER · 052926-5046",
    signalClass: "ops",
  },
  {
    occurredAtText: "05-29-2026 18:43:00",
    signal: "-X0011",
    description: "Ring:1 Seconds Call Dur:00:43 · Op:0076 Jillian R",
    signalClass: "ops",
  },
]);
check(
  "reference call is a station call",
  dispatch[0]?.kind === "dispatch" &&
    dispatch[0].title === "Station Call · Reference 052926-5046" &&
    /Ring 1 · 43 seconds · Operator Jillian R/.test(
      [dispatch[0].summary, ...dispatch[0].details].join(" · "),
    ),
);

const override = presentHistoricSignals([
  {
    occurredAtText: "05-29-2026 18:55:00",
    signal: "-X0071",
    description: "SENT TO SUPERVISOR TO OVERIDE: ADV FA",
    signalClass: "ops",
  },
]);
check(
  "override is not other",
  override[0]?.kind === "override" &&
    /Fire alarm/.test(override[0].title) &&
    /supervisor/i.test(override[0].summary ?? ""),
);

const alarmnet = presentHistoricSignals(
  [
    {
      occurredAtText: "05-29-2026 21:04:00",
      signal: "110011",
      description: "SIGNAL COMING FROM AlarmNet Receiver",
      signalClass: "alarm",
    },
    {
      occurredAtText: "05-29-2026 21:04:00",
      signal: "406011",
      description: "RESTORE ZONE:001",
      signalClass: "restore",
    },
  ],
  { zones: [{ zoneNumber: 1, description: "BUNKIE SMOKE DETECTOR'S" }] },
);
check(
  "alarmnet picks up a nearby zone",
  alarmnet.some(
    (event) =>
      event.kind === "alarm" &&
      /Zone 1/i.test([event.title, event.summary, ...event.details].join(" ")),
  ),
);

const fire = presentHistoricSignals([
  {
    occurredAtText: "05-29-2026 18:43:00",
    signal: "110011",
    description: "ALARM((FIRE)) ZONE:001",
    signalClass: "alarm",
  },
]);
check(
  "fire alarm keeps the zone",
  fire[0]?.kind === "alarm" && fire[0].title === "Fire Alarm · Zone 1",
);

const summaryEmail = presentHistoricSignals([
  {
    occurredAtText: "05-29-2026 19:10:00",
    signal: "-X0019",
    description: "SUMMARY 10638 Last 8Hrs. Alarm At 20:30",
    signalClass: "alarm",
  },
]);
check(
  "summary email is not shown as an alarm",
  summaryEmail[0]?.kind === "email",
);

const looseThenAlarm = presentHistoricSignals([
  {
    occurredAtText: "05-29-2026 18:43:00",
    signal: "-X0071",
    description: "By 10638 Dennis Mckee (Mobi)",
    signalClass: "ops",
  },
  {
    occurredAtText: "05-29-2026 18:43:10",
    signal: "110011",
    description: "ALARM((FIRE)) ZONE:001",
    signalClass: "alarm",
  },
]);
check(
  "a by-line does not attach to a later alarm",
  looseThenAlarm.length === 2 &&
    looseThenAlarm[0].kind === "other" &&
    looseThenAlarm[1].kind === "alarm",
);

const farZone = presentHistoricSignals([
  {
    occurredAtText: "05-29-2026 21:04:00",
    signal: "110011",
    description: "SIGNAL COMING FROM AlarmNet Receiver",
    signalClass: "alarm",
  },
  {
    occurredAtText: "05-29-2026 21:04:40",
    signal: "406012",
    description: "RESTORE ZONE:002",
    signalClass: "restore",
  },
]);
check(
  "a zone 40 seconds away is not borrowed",
  farZone[0]?.kind === "alarm" &&
    !/Zone 2/i.test([farZone[0].title, farZone[0].summary, ...farZone[0].details].join(" ")),
);

const communicatorOnly = presentHistoricSignals([
  {
    occurredAtText: "03-11-2026 15:16:00",
    signal: "110011",
    description: "SIGNAL COMING FROM AlarmNet Receiver",
    signalClass: "alarm",
  },
]);
check(
  "zone-less AlarmNet is a communicator event",
  communicatorOnly[0]?.title === "AlarmNet Communicator" &&
    /communicator report/i.test(communicatorOnly[0].summary ?? ""),
);

const bareRestore = presentHistoricSignals([
  {
    occurredAtText: "03-11-2026 15:16:10",
    signal: "350001",
    description: "RESTORE",
    signalClass: "comm_restore",
  },
]);
check(
  "zone-less restore is communicator restore",
  bareRestore[0]?.title === "Communication Restore" &&
    /checked in again/i.test(bareRestore[0].summary ?? ""),
);

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
