# Lanvac station layer

Status: **read UI + O5985-gated writes / account on-test shipped 2026-08-22. UI close-out 2026-08-23. House/other-CODE write chrome signed off 2026-09-05** (read-only note, not grayed buttons). Caller-ID `fullupdate` stays off until you say go. [`MULTI_SITE_ACCOUNTS.md`](MULTI_SITE_ACCOUNTS.md) is confirmed: zones, Historic, and account on-test stay per site (`profile_id`). **R54 read/write is done. Next implementation is the rest of R53 slice 4** (grouping / Appoint / attach). Do not start that work in this file. **R54b** (show portal actor on Historic / on-test) and **R54c** (optional staff Lanvac passwords) are planned below. Do not build them before the remaining R53 slices.

Re-pull: from `website/`, `node --env-file=.env.local scripts/lanvac-o5985-read.mjs`. Output is `website/.lanvac-o5985/` (gitignored, password stripped).

Authoritative register: `PORTAL_PLAN.md` **R54** (this layer) and **R55** (technician app + Alarmnet, after GO LIVE). Cursor copy: `.cursor/plans/lanvac_station_layer_386b6a97.plan.md`.

Portal `devices` (batteries / smokes) is a **different** list. Zones are what the station thinks the sensors are.

## What we are adding

On every **current monitoring** site that has a Lanvac CODE:

- Zone list: admin fetch / create / edit / delete. Client read-only (number, description, type). Account on-test / off-test sits above the list. Per-zone on-test, uses-call-list, and panel type are cached, not shown.
- Historic signals: paged log for admin and client, grouped and color-coded, at the bottom of the Security tab on both portals. Not a live stream. Dates are 12-hour with the month spelled out. Older pages load as you scroll.
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

**McKee zone writes always send the same extras.** Station delay, per-zone extra notify, and signal/restore codes are not a McKee workflow. The office uses the account caller ID list. GET does not return those extras, so the portal never asks staff for them. Create and update always send `delay = 1`, `useCallList = true`, an empty extra-notify list, and no codes. Edit is on for fire / burglar / low temperature, including pulled live zones. Carbon monoxide still has no proven write code, so those rows stay delete-only. Add only offers unused zone numbers. A create on a number that is already on file is refused (`Zone 1 is already BUNKIE SMOKE DETECTOR'S…`). The reason on the staff email is generated (`Added` / `Updated` / `Deleted zone #n …`). Test create/delete on unused numbers (7 and 8 on O5985).

**`panelType` can be empty.** It is cached and not shown on the Security card. `isDisabled` is a real boolean (`false` on O5985) and shows as "Station disabled" on the account chip. `language` was `en`. `accountType` can be empty.

Zone numbers above 100 are fine to list. We never call Zone/OnTest.

## Access

- New server-only module `website/src/lib/portal/lanvac-api.ts`. Never return the dealer password or raw request body. Cache writes live in `lanvac-station-store.ts` (`server-only`). Do not export cache-clear as a server action.
- **Reads:** any CODE already on a portal profile. On-demand when the client Security tab or the admin client Security tab is open. No cron over all CODEs. Dashboard / Settings / Alerts / admin Account or Billing tabs do not pull Lanvac.
- **Writes:** `O5985` only until you say go. Other sites show on/off-test status and a read-only note. They do not show grayed start/end or zone-edit buttons.
- UI and **server actions** require `hasCurrentMonitoring` and a CODE.
- Every action takes `profileId` from day one. Today: session profile must match (or admin). After R53: `requireSelectedSite`.
- Client SELECT only on cached rows. No client PostgREST write of `on_test`. On-test is a server action that talks to Lanvac, then updates our cache.
- Client never sees delay, signal/restore codes, extra zone notify phones, or dealer fields. Those live on `lanvac_zone_write` (admin SELECT only, service-role writes).
- On-test is **the whole account only**, for staff and for the client Account admin (today: the one login). Duration 30 min / 1 / 2 / 4 / 8 / 12 / **24** hours or custom days+hours (API still 5-3600 minutes). Client 120s cooldown. Staff email. Alerts tab and the Alerts badge use the same clock as the Security chip: `on_test_until` in the future. Stale `lanvac_zones.on_test` rows do not keep the badge on. Off-test clears those zone flags. Writes (on-test and zone edit) stay `O5985` only. Other CODEs show status and a read-only note, not grayed-out buttons. No per-zone on-test UI, column, or action. `on_test_until` is the SoR for the amber On Test / green Off Test chip (Account GET has no on-test field; Historic is a log). OffTest stores a past `on_test_until` so the UI can show when the last test ended. Zone `onTest` does not flip during an account test and is not shown.
- Admin zone delete / overwrite: confirm + generated reason + staff email.
- CODE change: drop or re-pull that profile's cached zones/signals.
- Site delete later: cascade `lanvac_*`. Do not wipe Lanvac.

## Multi-site

Tables keyed by `profile_id` only. One CODE = one site = one zone list. No county mega-form. On-test is per site. R53 is a helper swap, not a rewrite.

## Placement

- Client: **Security tab** only (`/user-dashboard?tab=security`). Header, account on-test chip, Refresh, zone table (number / description / type), account on-test controls, Historic, then caller ID and equipment. Dashboard / Settings / Alerts do not pull Lanvac.
- Admin: client detail **Security tab** (`/admin-dashboard/clients/{id}?tab=security`). Same station block, with Add / Edit / Delete on the zone table (Edit off for carbon monoxide). Devices are their own tab. Create-client still does not require zones. Optional seeder is not in this sitting.

## Persistence (shipped 2026-08-22)

`lanvac_zones`, `lanvac_account_state`, `lanvac_signals` cache (Lanvac is SoR for history), append-only `lanvac_station_events`. Failed pull keeps last good rows and shows stale. Client SELECT own on zones/state/signals. Events are admin-only. No client INSERT/UPDATE/DELETE. All keyed by `profile_id`. Write-only zone fields live on `lanvac_zone_write`. Cache writes are `server-only` (`lanvac-station-store.ts`), not callable actions. Pulls claim an 8s cooldown so two tabs cannot wipe Historic at once. User-facing pull and write errors stay generic. Zone CRUD and **account** on/off test are O5985-gated. Carbon monoxide type writes stay refused.

Pull does **not** clear account `on_test_until` (Account GET has no on-test field). That timestamp is the SoR for the On Test / Off Test chip. Zone `onTest` / trailing `+` stay in the cache if Lanvac already marked a zone; they are not a table column.

## Test protocol

`O5985` only. Snapshot Account / Zone / Historic with the password stripped (`website/scripts/lanvac-o5985-read.mjs`). Restore the exact zone list after any write sitting. **Account** OnTest 5 minutes then OffTest. Never call `Zone/OnTest`. Never leave McKee on test. Never call `Account/status`. PUT of pulled fire / burglar / low-temp is allowed with McKee defaults. Do not PUT carbon monoxide (zones 6 and 9). Use unused 7 or 8 for create/delete tests. Write probe: `website/scripts/lanvac-o5985-write-check.mjs` (account on-test by default; `INCLUDE_ZONE_WRITES=1` for unused zone 7).

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

## Who put this on test (R54b / R54c)

Lanvac Historic attributes the **dealer login** that made the API call, not the portal user. Today every portal write (staff or client) uses `LANVAC_DEALER_ACCOUNT` + `LANVAC_DEALER_PASSWORD` from Vercel. Two staff members therefore look like the same operator in Mobi. A client on-test looks like McKee’s dealer login. That is expected with one shared credential.

**We already store the portal actor.** `lanvac_station_events` is append-only (`on_test`, `off_test`, `zone_write`, `pull`, `code_change`). Each row has `profile_id`, `lanvac_account_code`, `actor_user_id`, `actor_email`, `detail`, `created_at`. `persistLanvacOnTest` and zone writes fill those fields from the signed-in session. Staff also get the on-test email with `changedBy`. Caller-ID already has its own immutable `caller_id_changes` trail. The gap is **display**, not capture.

**Do not build a second audit table for this.** Reuse `lanvac_station_events`.

### R54b. Show the portal actor (required for clients; also helps staff)

When: after remaining R53 slices (grouping / Appoint / attach), not instead of them.

- Historic stays the Lanvac log. Do not rewrite a Lanvac row to pretend it knows the portal user.
- Overlay or pair portal events on the same Security tab: “On test started by {name} · {CODE} · {account}” (and the same for off-test and zone writes).
- Clients must see their own site’s events. Today events are admin-SELECT only; add a membership SELECT (`can_access_profile`) and keep the table append-only (no client insert).
- Staff see the same line plus the actor email.
- Matching is by this site’s `profile_id` and time window, not by parsing Historic text.

### R54c. Optional staff Lanvac passwords (later, not required to know who clicked)

When: only after R54b, and only if Mobi-side attribution still matters after the portal line is visible.

Idea (locked if we build it):

- Username stays `LANVAC_DEALER_ACCOUNT` (`10638`). Only the WinLinks **password** differs per technician.
- Staff Account page: each admin can store their own Lanvac password. Default / fallback is the Vercel env password.
- Server uses that password **only for that admin’s writes**. Reads can stay on the env login.
- **Clients never get a password field.** Client writes always use the env dealer login. R54b is how we know which client and which site.
- Confirm with Lanvac/WinLinks that password-per-operator is how Historic labels the user before we store secrets.

Constraints if this ships:

- Encrypt at rest. Never `NEXT_PUBLIC_`. Never log the password. Never return it after save.
- Staff-only RLS. One secret per admin profile.
- Missing or invalid personal password falls back to env and the portal event still records the signed-in admin.
- Do not send technician passwords from the browser except through the save action.

Until R54c exists, the double trail is: portal event (true actor) + Lanvac Historic (shared dealer login). That is enough to move R53 forward.

## Out of scope

Alarmnet 360, technician Expo / TSheets / shared agent, caller-ID `fullupdate`, QB bridge, real import, GO LIVE, live websockets. Per-admin Lanvac passwords and Historic “Made by” are R54c / R54b, not R53.
