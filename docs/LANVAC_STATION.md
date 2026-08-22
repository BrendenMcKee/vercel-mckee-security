# Lanvac station layer

Status: **planned. O5985 reads done 2026-08-22** (Account / Zone / Historic all 200). Restore list and color rules below. Zone writes, on/off test, and caller-ID `fullupdate` stay **O5985-only** until you say go. Do not fold this into multi-site (R53). [`MULTI_SITE_ACCOUNTS.md`](MULTI_SITE_ACCOUNTS.md) already treats zones / Historic / on-test as per-site (`profile_id`). After this ships, confirm that file still matches, then implement R53.

Re-pull: from `website/`, `node --env-file=.env.local scripts/lanvac-o5985-read.mjs`. Output is `website/.lanvac-o5985/` (gitignored, password stripped).

Authoritative register: `PORTAL_PLAN.md` **R54** (this layer) and **R55** (technician app + Alarmnet, after GO LIVE). Cursor copy: `.cursor/plans/lanvac_station_layer_386b6a97.plan.md`.

Portal `devices` (batteries / smokes) is a **different** list. Zones are what the station thinks the sensors are.

## What we are adding

On every **current monitoring** site that has a Lanvac CODE:

- Zone list: admin fetch / create / edit / delete. Client read-only (number, description, type, on-test, uses-call-list).
- Historic signals: paged log for admin and client, color-coded, at the bottom of the security block. Not a live stream.
- Panel type + a last-known status chip.
- On/off test with a duration. Admin: account and per-zone. Client Account admin: **account-level only**.

Optional zone entry on create-client / add-monitoring. "Pull from Lanvac" when a CODE is typed. Never required. Import later GETs zones per CODE and stores them. Never auto-writes zones during import.

## API (live OpenAPI)

Base `https://lanvac.mobi:8843`. Auth is dealer `10638` + WinLinks password in the JSON body. Server-only env: `LANVAC_API_BASE`, `LANVAC_DEALER_ACCOUNT`, `LANVAC_DEALER_PASSWORD`. Never `NEXT_PUBLIC_`. Prefer **POST** for reads that need a body.

| Call | Use |
|------|-----|
| `POST /api/Account` | `panelType`, `isDisabled`, name/address. No current-alarm field. No account-on-test field. |
| `POST /api/Zone` | `zoneNumber`, `onTest`, `description`, `zoneType`. Write fields (delay, call list, extra phones, codes) are **not** on the list. |
| `POST /api/Zone/create`, `PUT /api/Zone`, `DELETE /api/Zone` | Admin writes. Create `zoneId` 1-999. |
| `POST /api/Zone/OnTest` / `OffTest` | Zone 1-100, 5-3600 minutes. Admin / future techs only. |
| `POST /api/Account/OnTest` / `OffTest` | 5-3600 minutes. Admin and client Account admin. |
| `POST /api/Historic` | `{ description, signal, date }[]`. `currentPage`, `elementsPerPage`. **50 works** on `O5985`. Dates are `MM-DD-YYYY HH:mm:ss`. |

**Never call:** `POST /api/Account/status` (disable), `POST /api/Account/new` (erase-existing defaults true), `Account/update` two-way address, `emergencynumbers` write.

`POST /api/Account/special` can set `panelType` later. Not in the first UI slice.

## Honesty rules

Historic has no restore flag and no "in alarm now." The chip is last-known:

1. Gray: `isDisabled`
2. Blue: account or any zone on test (our `on_test_until` and/or zone `onTest`)
3. Red / amber: classify the **most recent** Historic row from the `O5985` color map. Unknown = gray, not green
4. Green: none of the above

Copy: "Last signal" / "On test until …" / "Station disabled". Never "all clear" if the log is empty.

**`O5985` Historic is mixed.** Page 1 can be call-list email (`-X0019`) and Mobi admin (`-X0071`), not an alarm. Color from **description keywords first**, then signal prefix. Unknown = gray.

| Class | How we know | Chip |
|-------|-------------|------|
| Fire / burg alarm | Description contains `ALARM((` or `ALARM` and not `RESTORE` / `AFTER ALARM` | Red |
| Restore / after alarm | `RESTORE` or `AFTER ALARM` or signal `406…` | Green-leaning gray (event, not "all clear") |
| Communication / other restore | `350…`, text `RESTORE` / `COMMUNICATION RESTORE` | Gray |
| Open / close | `401…` `OPENING`, `408…` `CLOSING` | Gray |
| On test (log) | `[ON-TEST]`, `-X0070`, `-X0076` begin, `-X0030` end | Blue only if our `on_test_until` is still in the future. A March on-test email is history |
| Station email / Mobi / phone | `-X0019`, `-X0071`, `-X0011`, `LanTEL`, `BUFF60`, `230…`, `285…` | Gray (ops, not an alarm) |

Seen alarm example: signal `110011`, `ALARM((FIRE)) ZONE:001` and matching `RESTORE ZONE:001`.

**Zone list types on GET are English labels, not the 3-char write enum.** Map before create/update: `FIRE` → `FIR`, `BURGLAR` → `BUR`, `LOW TEMPERATURE` → `LOW`. `CARBON MONOXIDE` write code (`CO*` / `CO1` / `CO2`) is **unproven** until the first O5985 write sitting. Do not guess on a live write.

**`panelType` can be empty.** Show "Not on file". `isDisabled` is a real boolean (`false` on O5985). `language` was `en`. `accountType` can be empty.

First admin edit after a pull must collect missing write fields. Defaults if Lanvac did not send them: `useCallList = true`, `delay = 1`, empty notify list. Warn if a zone number is above 100 (cannot OnTest).

## Access

- New server-only module `website/src/lib/portal/lanvac-api.ts`. Never return the dealer password or raw request body.
- **Reads:** any CODE already on a portal profile. On-demand per open page. No cron over all CODEs.
- **Writes:** `O5985` only until you say go. Other sites show the UI and "station writes not live."
- UI and **server actions** require `hasCurrentMonitoring` and a CODE.
- Every action takes `profileId` from day one. Today: session profile must match (or admin). After R53: `requireSelectedSite`.
- Client SELECT only on cached rows. No client PostgREST write of `on_test`. On-test is a server action that talks to Lanvac, then updates our cache.
- Client never sees delay, signal/restore codes, extra zone notify phones, or dealer fields.
- Client on-test: account-level, Account admin only after R53 (today: the one login). Duration 15 / 30 / **60** / 120 or custom 5-3600. 120s cooldown. Staff email. Alerts badge while on test.
- Admin zone delete / overwrite: confirm + short reason + staff email.
- CODE change: drop or re-pull that profile's cached zones/signals.
- Site delete later: cascade `lanvac_*`. Do not wipe Lanvac.

## Multi-site

Tables keyed by `profile_id` only. One CODE = one site = one zone list. No county mega-form. On-test is per site. R53 is a helper swap, not a rewrite.

## Placement

- Client Dashboard, after the monitoring card and before caller ID. Signals at the bottom of that block.
- Admin: extend Monitoring station card. Create-client: optional seeder + pull.

## Persistence (when schema ships)

`lanvac_zones`, `lanvac_account_state`, optional `lanvac_signals` cache (Lanvac is SoR for history), append-only `lanvac_station_events`. Failed pull keeps last good rows and shows stale.

## Test protocol

`O5985` only. Snapshot Account / Zone / Historic with the password stripped. Restore the exact zone list after any write sitting. OnTest 5 minutes then OffTest. Never leave McKee on test. Never call `Account/status`.

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
