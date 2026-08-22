# Lanvac station layer

Status: **read UI + O5985-gated writes / account on-test shipped 2026-08-22.** Caller-ID `fullupdate` stays off until you say go. [`MULTI_SITE_ACCOUNTS.md`](MULTI_SITE_ACCOUNTS.md) is confirmed: zones, Historic, and account on-test stay per site (`profile_id`). **Next implementation is R53.** Do not start R53 in this file.

Re-pull: from `website/`, `node --env-file=.env.local scripts/lanvac-o5985-read.mjs`. Output is `website/.lanvac-o5985/` (gitignored, password stripped).

Authoritative register: `PORTAL_PLAN.md` **R54** (this layer) and **R55** (technician app + Alarmnet, after GO LIVE). Cursor copy: `.cursor/plans/lanvac_station_layer_386b6a97.plan.md`.

Portal `devices` (batteries / smokes) is a **different** list. Zones are what the station thinks the sensors are.

## What we are adding

On every **current monitoring** site that has a Lanvac CODE:

- Zone list: admin fetch / create / edit / delete. Client read-only (number, description, type, on-test, uses-call-list).
- Historic signals: paged log for admin and client, color-coded, at the bottom of the security block. Not a live stream.
- Panel type + a last-known status chip.
- On/off test with a duration. **Whole account only** (`Account/OnTest` / `OffTest`). Admin and client Account admin. We do not put a single zone on test. `Zone/OnTest` exists on Lanvac and is unused.

Optional zone entry on create-client / add-monitoring. "Pull from Lanvac" when a CODE is typed. Never required. Import later GETs zones per CODE and stores them. Never auto-writes zones during import.

## API (live OpenAPI)

Base `https://lanvac.mobi:8843`. Auth is dealer `10638` + WinLinks password in the JSON body. Server-only env: `LANVAC_API_BASE`, `LANVAC_DEALER_ACCOUNT`, `LANVAC_DEALER_PASSWORD`. Never `NEXT_PUBLIC_`. Prefer **POST** for reads that need a body.

| Call | Use |
|------|-----|
| `POST /api/Account` | `panelType`, `isDisabled`, name/address. No current-alarm field. No account-on-test field. |
| `POST /api/Zone` | `zoneNumber`, `onTest`, `description`, `zoneType`. Write fields (delay, call list, extra phones, codes) are **not** on the list. `onTest` can lag. While a zone is on test the description is space-padded and ends with `+`; treat that as on test and strip it for display. |
| `POST /api/Zone/create`, `PUT /api/Zone`, `DELETE /api/Zone` | Admin writes. Create `zoneId` 1-999. Zone create/update/delete take about **10s**; use a 20s timeout. Proven 2026-08-22 on unused zone 7: `BUR` create, description PUT, delete all 200. GET type after create is English `BURGLAR`. |
| `POST /api/Zone/OnTest` / `OffTest` | Exists on Lanvac. **Do not call from the portal.** McKee always puts the whole account on test. |
| `POST /api/Account/OnTest` / `OffTest` | **The only on-test path.** 5-3600 minutes. Admin and client Account admin. Fast (~100ms). Account GET has **no** on-test field; our `on_test_until` is the SoR. Zone GET does not flip `onTest` or add `+` while the account is on test. OffTest can 500 if called immediately after OnTest (retry once) or if already off. Historic begin is `[ON-TEST]` / `-X0076` email. |
| `POST /api/Historic` | `{ description, signal, date }[]`. `currentPage`, `elementsPerPage`. **50 works** on `O5985`. Dates are `MM-DD-YYYY HH:mm:ss`. Emails in the description are redacted before we cache (clients SELECT this table). |

**Never call:** `POST /api/Account/status` (disable), `POST /api/Account/new` (erase-existing defaults true), `Account/update` two-way address, `emergencynumbers` write.

`POST /api/Account/special` can set `panelType` later. Not in the first UI slice.

## Honesty rules

Historic has no restore flag and no "in alarm now." The chip is last-known:

1. Gray: `isDisabled`
2. Blue: account on test (`on_test_until`) or a zone that Lanvac already marked `onTest` (read-only; we do not set that)
3. Red: last Historic row is an alarm
4. Green-leaning: last Historic row is a restore
5. Gray: anything else (ops, on-test log, open/close, unknown). Empty log is gray, not green

Copy: "Last signal" / "On test until …" / "Station disabled". Never "all clear" if the log is empty.

**`O5985` Historic is mixed.** Page 1 can be call-list email (`-X0019`) and Mobi admin (`-X0071`), not an alarm. Color from **description keywords first**, then signal prefix. Unknown = gray.

| Class | How we know | Chip |
|-------|-------------|------|
| Fire / burg alarm | Description contains `ALARM((` or `ALARM` and not `RESTORE` / `AFTER ALARM` | Red |
| Restore / after alarm | `RESTORE` or `AFTER ALARM` or signal `406…` | Green-leaning gray (event, not "all clear") |
| Communication / other restore | `350…`, text `RESTORE` / `COMMUNICATION RESTORE` | Gray |
| Open / close | `401…` `OPENING`, `408…` `CLOSING` | Gray |
| On test (log) | `ON-TEST` or `STOP TESTING` in the description first. Account begin can use `-X0070` with `[ON-TEST]` text (same signal as Mobi file viewed when the text is only `CUSTOMER FILE VIEWED`). Begin email `-X0076`. End is `STOP TESTING` plus `-X0030` email. `-X0043` is a leftover zone on-test email | Blue only if our `on_test_until` is still in the future. A March on-test email is history |
| Station email / Mobi / phone | `-X0019`, `-X0071`, `-X0011`, `-X0070` (Mobi file viewed), `LanTEL`, `BUFF60`, `230…`, `285…` | Gray (ops, not an alarm) |

Seen alarm example: signal `110011`, `ALARM((FIRE)) ZONE:001` and matching `RESTORE ZONE:001`.

**Zone list types on GET are English labels, not the 3-char write enum.** Map before create/update: `FIRE` → `FIR`, `BURGLAR` → `BUR`, `LOW TEMPERATURE` → `LOW`. `CARBON MONOXIDE` write code (`CO*` / `CO1` / `CO2`) is **still unproven**. Create/update of that type is refused. Delete is allowed. We do not put a zone on test.

**Do not PUT an existing live zone** unless `lanvac_zone_write` already has delay / call list / codes from a portal create. GET does not return those fields. Defaults (`delay = 1`, empty notify) would overwrite the station. Edit is disabled until write fields exist. Test create/update/delete only on unused numbers (7 and 8 on O5985).

**`panelType` can be empty.** Show "Not on file". `isDisabled` is a real boolean (`false` on O5985). `language` was `en`. `accountType` can be empty.

Zone numbers above 100 are fine to list. We never call Zone/OnTest.

## Access

- New server-only module `website/src/lib/portal/lanvac-api.ts`. Never return the dealer password or raw request body. Cache writes live in `lanvac-station-store.ts` (`server-only`). Do not export cache-clear as a server action.
- **Reads:** any CODE already on a portal profile. On-demand per open page. No cron over all CODEs.
- **Writes:** `O5985` only until you say go. Other sites show the UI and "Station writes are not live on this account."
- UI and **server actions** require `hasCurrentMonitoring` and a CODE.
- Every action takes `profileId` from day one. Today: session profile must match (or admin). After R53: `requireSelectedSite`.
- Client SELECT only on cached rows. No client PostgREST write of `on_test`. On-test is a server action that talks to Lanvac, then updates our cache.
- Client never sees delay, signal/restore codes, extra zone notify phones, or dealer fields. Those live on `lanvac_zone_write` (admin SELECT only, service-role writes).
- On-test is **the whole account only**, for staff and for the client Account admin (today: the one login). Duration 15 / 30 / **60** / 120 or custom 5-3600. Client 120s cooldown. Staff email. Alerts badge while on test. No per-zone on-test UI or action.
- Admin zone delete / overwrite: confirm + short reason + staff email.
- CODE change: drop or re-pull that profile's cached zones/signals.
- Site delete later: cascade `lanvac_*`. Do not wipe Lanvac.

## Multi-site

Tables keyed by `profile_id` only. One CODE = one site = one zone list. No county mega-form. On-test is per site. R53 is a helper swap, not a rewrite.

## Placement

- Client Dashboard, after the monitoring card and before caller ID. Signals at the bottom of that block.
- Admin: extend Monitoring station card. Create-client still does not require zones. Optional seeder is not in this sitting.

## Persistence (shipped 2026-08-22)

`lanvac_zones`, `lanvac_account_state`, `lanvac_signals` cache (Lanvac is SoR for history), append-only `lanvac_station_events`. Failed pull keeps last good rows and shows stale. Client SELECT own on zones/state/signals. Events are admin-only. No client INSERT/UPDATE/DELETE. All keyed by `profile_id`. Write-only zone fields live on `lanvac_zone_write`. Cache writes are `server-only` (`lanvac-station-store.ts`), not callable actions. Pulls claim an 8s cooldown so two tabs cannot wipe Historic at once. User-facing pull and write errors stay generic. Zone CRUD and **account** on/off test are O5985-gated. Carbon monoxide type writes stay refused.

Pull does **not** clear account `on_test_until` (Account GET has no on-test field). That timestamp is the SoR for the blue chip. Zone `onTest` / trailing `+` stay a read-only display if Lanvac already marked a zone.

## Test protocol

`O5985` only. Snapshot Account / Zone / Historic with the password stripped (`website/scripts/lanvac-o5985-read.mjs`). Restore the exact zone list after any write sitting. **Account** OnTest 5 minutes then OffTest. Never call `Zone/OnTest`. Never leave McKee on test. Never call `Account/status`. Do not PUT zones 1-6 or 9 (write fields unknown). Use unused 7 or 8 for create/update/delete only. Write probe: `website/scripts/lanvac-o5985-write-check.mjs` (account on-test by default; `INCLUDE_ZONE_WRITES=1` for unused zone 7).

**Live write sitting 2026-08-22 (restored):** Account OnTest 200. Zone GET stayed off with no `+`. Immediate OffTest can 500 while Historic still has not caught up; retry OffTest is 200. Historic begin: `[ON-TEST]` on `-X0070` plus `-X0076` email. An earlier unused probe also hit Zone 2 OnTest (not a product path) and unused zone 7 `BUR` create / PUT / delete. Site restored to the table below, all `onTest: false`.

**Restore list (pulled 2026-08-22, all `onTest: false`):**

| Zone | Description | GET type |
|------|-------------|----------|
| 1 | BUNKIE SMOKE DETECTOR'S | FIRE |
| 2 | BUNKIE MAIN DOOR | BURGLAR |
| 3 | BUNKIE LIVING ROOM MOTION | BURGLAR |
| 4 | BUNKIE BEDROOM MOTION | BURGLAR |
| 5 | BUNKIE CRAWLSPACE LOW TEMPERATURE | LOW TEMPERATURE |
| 6 | BUNKIE GAS DETECTOR | CARBON MONOXIDE |
| 9 | BUNKIE MAIN FLOOR GAS DETECTOR | CARBON MONOXIDE |

There is no zone 7 or 8. After any write sitting, this table must match again.

## Out of scope

Alarmnet 360, technician Expo / TSheets / shared agent, caller-ID `fullupdate`, QB bridge, real import, GO LIVE, multi-site schema, live websockets.
