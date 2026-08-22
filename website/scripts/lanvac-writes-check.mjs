// Write-gate and zone-type map (R54). No live Lanvac calls.
// Run: node --import ./scripts/register-ts-alias.mjs scripts/lanvac-writes-check.mjs

const {
  applyOnTestPullGrace,
  interpretLanvacZoneRead,
  isCarbonMonoxideZoneType,
  isStationOnTest,
  lanvacWritesLive,
  mapZoneTypeToWrite,
  parseNotifyList,
  recentLanvacZoneTestIntent,
  redactLanvacHistoricText,
  STATION_WRITES_NOT_LIVE,
} = await import("@/lib/portal/lanvac-writes.ts");

const failures = [];
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures.push(name);
}

check("O5985 writes live", lanvacWritesLive("O5985") && lanvacWritesLive("o5985"));
check("other CODE not live", !lanvacWritesLive("O1234"));
check("FIRE maps to FIR", mapZoneTypeToWrite("FIRE").ok && mapZoneTypeToWrite("FIRE").code === "FIR");
check("BURGLAR maps to BUR", mapZoneTypeToWrite("burglar").ok && mapZoneTypeToWrite("burglar").code === "BUR");
check("LOW TEMPERATURE maps to LOW", mapZoneTypeToWrite("LOW TEMPERATURE").ok);
check("carbon monoxide refused", !mapZoneTypeToWrite("CARBON MONOXIDE").ok);
check("CO* refused", isCarbonMonoxideZoneType("CO*") && !mapZoneTypeToWrite("CO*").ok);
check("unknown type refused", !mapZoneTypeToWrite("MEDICAL").ok);
check("notify list capped at 5", parseNotifyList(["a", "b", "c", "d", "e", "f"]).length === 5);
check(
  "account on test is active",
  isStationOnTest({
    onTestUntil: new Date(Date.now() + 60_000).toISOString(),
    anyZoneOnTest: false,
  }),
);
check(
  "expired on-test is not active",
  !isStationOnTest({
    onTestUntil: new Date(Date.now() - 60_000).toISOString(),
    anyZoneOnTest: false,
  }),
);
check("zone on test is active", isStationOnTest({ onTestUntil: null, anyZoneOnTest: true }));
check("not-live copy is set", STATION_WRITES_NOT_LIVE.includes("not live"));
const plusRead = interpretLanvacZoneRead({
  onTest: false,
  description: "BUNKIE MAIN DOOR                                               +",
});
check("padded plus is on test", plusRead.onTest && plusRead.description === "BUNKIE MAIN DOOR");
check(
  "plain description stays off",
  !interpretLanvacZoneRead({ onTest: false, description: "BUNKIE MAIN DOOR" }).onTest,
);
check(
  "pull grace keeps recent on-test",
  applyOnTestPullGrace(false, "on") && !applyOnTestPullGrace(true, "off"),
);
check(
  "historic email is redacted",
  redactLanvacHistoricText("[E-MAIL] >> someone@example.com") === "[E-MAIL] >> [email]",
);
check(
  "recent zone on-test wins",
  recentLanvacZoneTestIntent(
    [
      { createdAt: "2026-08-22T17:45:00.000Z", eventType: "on_test", scope: "zone", zoneNumber: 2 },
      { createdAt: "2026-08-22T17:44:00.000Z", eventType: "off_test", scope: "zone", zoneNumber: 2 },
    ],
    2,
  ) === "on",
);

if (failures.length > 0) {
  console.error(`\n${failures.length} write check(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll Lanvac write-gate checks passed.");
