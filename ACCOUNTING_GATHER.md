# Accounting gather

Tick a box when that item is in. **No further integration (bridge, posting code, or cloud queue) until every required box below is checked.** Answers and screenshots-as-text live in `ACCOUNTING_GATHER_DATA.md`. Later items (Stripe go-live, profitability) are tracked but do not block the start of Phase 8 once the required list is complete.

Portal truth: monitoring is annual, VoIP is monthly, one line each, plus 13% HST. Clients send the after-HST amount to `dennis@mckeesecurity.ca`. The books must match that. VoIP live today: Pirocchi (wrong annual memorized), Haliburton Auto (install only), Currie (install/upgrade, no monthly). Vision Care is pipeline only. Enter live ones by hand later.

VoIP is not booked correctly today. **Create new items. Do not rename** the item those customers sit on. In QuickBooks Desktop a rename rewrites every old invoice that used that item.

## Status

**Next:** Client email is paused on hosted (`portal_settings.client_mail_enabled = false`). **Do not start the Windows bridge or a real import yet.** R54 read + O5985-gated writes shipped. R53 slices 1–3 shipped. Next product work is slices 4–6 (`docs/MULTI_SITE_ACCOUNTS.md`), then the CUA portal test (`docs/PORTAL_CUA_TEST.md`). After that: Windows bridge on DennisPC against PORTAL-TEST, then import with a human grouping pass, then `GO LIVE` only after grouping is signed off, the portal is trusted, and the bridge is on the live QuickBooks file. 8A cloud routes are shipped (`/api/qb/poll|report|mirror`; contract in `PORTAL_PLAN.md` 9.5.2A). Create the sandbox row with `website/scripts/qb-bridge-register.mjs` (label `Office QuickBooks PC`) when you are ready to store a secret — not a Vercel env var. Always confirm PORTAL-TEST is open and Web Connector is quit. Do not start the Lanvac `fullupdate` write until you say go. Do not delete `McKee Security Live.*`.

Required before any integration starts:

- [x] Which QuickBooks PC (`DennisPC`, Windows 11 Home 25H2)
- [x] Remote access: Parsec. Brenden, Andi, Dennis, Brenda.
- [x] Stays on after hours (usually on; sometimes off; queue covers downtime)
- [x] F2: QuickBooks Desktop Pro 2024 R21P 64-bit (meets 2024 R18+; Canadian file lineage)
- [x] File is local on DennisPC (`…\Company Files\McKee Security Live.QBW`; hosting = local files only)
- [x] Accountant's Copy outstanding? **No.** Title bar is normal (`McKee Security & Audio Systems - QuickBooks Desktop Pro (multi-user) (Admin(ServerDB))`). No "Accountant's Copy exists" banner.
- [x] Current monitoring sale PDF (`monitoring-current.pdf` ACM-DESIGNS, $39.95 × 12, item `Annual Monitoring`, class `Monitoring`, HST extra)
- [x] Old-rate / odd monitoring (screenshots): $39.99 and item `Semi-Annual` used for a full year
- [x] VoIP sales: no monthly subscription invoices. Pirocchi has a stale **annual** memorized `$4,057.22`. Auto and Currie have install/monitoring only. Vision Care is quote-only.
- [x] Mixed VoIP + install (HALIBURTON AUTO REPAIR #31303: VoIP install `Product Sale`, no monthly line)
- [x] Item List (Type + Account): `Annual Monitoring` and `VoIP Phone Service` both → 4000 · Product Sales
- [x] Chart of Accounts: 1000 CIBC, 1200 AR, 1499 Undeposited Funds, 2300 HST, 4000/4100 income, `*Stripe` Bank
- [x] Memorized Transaction List (top + bottom): annual invoices at after-HST tier totals
- [x] Active monitoring count: **650** memorized invoices at the four after-HST tiers; **725** unique annual-invoice names; 3 customers with two memorized invoices. Plus 9 at `$677.32` (`$49.95`/mo) and ~70 bundle/odd amounts. Sales-by-item PDF was only 1–16 Aug 2026, not a year count.
- [x] VoIP names: Pirocchi (residential), Halliburton Auto Repair (commercial 1+1), Mr. J. Currie (residential), Vision Care pipeline (commercial 2+1, `$64.98`)
- [x] HST exceptions: none for portal billing (always pre-tax + 13%). Reopen only if a tax-exempt customer appears.
- [x] Posting model: **sales receipt when the portal has collected the money** (card or recorded e-transfer/cheque/cash). Customer "paid invoice" is portal + Stripe, never a QuickBooks email.
- [x] Monitoring item / income: keep `Annual Monitoring` → **4000 · Product Sales**. Distinguish services with **classes**, not a new income account.
- [x] Amounts: pre-tax × qty, then HST 13% (already how invoices and the portal work).
- [x] Stripe path: card sale to `*Stripe` (gross + HST), payout net to **1000 CIBC**, actual Stripe fee to **5800**. **McKee absorbs the Stripe fee.** Portal customers pay the plan plus 13% HST only; there is no 2% surcharge on portal card payments. The QB `Credit Card Fee` (2%) item is for old invoice/in-person card sales, not the portal. Do not book the bank deposit as income.
- [x] E-transfer / cheque: payment methods `Electronic Funds Transfer` and `Cheque`; both Deposit To **1499 · Undeposited Funds** (KILBURN GREG 2025-06-18; HIGHLANDS OUTDOOR 2024-07-17). Portal card uses `Stripe`. Do not create `e-Transfer`.
- [x] Classes (names locked): `Security - Monitoring` (dash rename of today's `Security Monitoring`), `Security - Installation` (rename of `Security`), `VoIP - Installation`, `VoIP - Subscription`. No four-tier monitoring split.
- [x] Classes created in live 2026-08-16, dash-format confirmed: `Security - Monitoring`, `Security - Installation`, `VoIP - Installation`, `VoIP - Subscription`.
- [x] Bookkeeper: QuickBooks Admin user name (`Admin(ServerDB)` on the login dialog)
- [x] Live items created: `VoIP - Residential`, `VoIP - Commercial`, `VoIP - Number Port Fee` on **4000 · Product Sales**, price `$0`, tax **HST 13%** exclusive (file default; same outcome as code H). `VoIP Phone Service` inactive.
- [x] Screenshot of those three new Item List rows
- [x] Inventory of `.qbw` files (Windows Home search `*.qbw`, 2026-08-16): only the Intuit Company Files folder. Live `McKee Security July 14` (334,260 KB) and retired `McKee Security` (309,724 KB, 2025-07-14). Explorer listed July 14 twice (same size, same folder; one file).
- [x] Web Connector: TSheets only; healthy; uses the **open** company file (not a pinned path)
- [x] PORTAL-TEST copy: `C:\Users\Public\Documents\Intuit\QuickBooks\PORTAL-TEST\McKee Security PORTAL-TEST do-not-invoice.QBW` (different folder, ~334 MB, 2026-08-16)
- [x] Live reopened, TSheets still syncs (Auto-Run on, 60 min, last result Complete)
- [x] Full paths of live and PORTAL-TEST files (below)
- [x] Lanvac call-list export received (full Excel in hand; 2026-08-14 Stephanos, confirmed complete 2026-08-16)
- [x] To Do samples (first screen of the list; smoke/battery wording). We will import these into portal devices at 8A. Full list comes through the bridge then, not this sitting. After import the portal owns the list; QuickBooks To Dos are not kept in sync.

Later, before the portal-test copy is opened (written into the plans; not this sitting):

- [x] Archive the retired `McKee Security` company file (2026-08-16, `Company Files\Archive_Old`, 309,724 KB, plus Restored_* folders and MAIN FILES sidecars). Live July 14 and ADR left in place.
- [x] Renamed live file to `McKee Security Live.QBW` (2026-08-16); TSheets sync still Complete. Leftover `July 14` sidecars are in `Archive_Old` (confirmed 2026-08-17).
- [x] While any non-live file is open: quit Web Connector from the tray (right-click → Quit) so TSheets cannot touch PORTAL-TEST. Confirmed practice 2026-08-17. Do not rely on Auto-Run off alone. When live is open again, start Web Connector so TSheets can sync.

Later (do not block the start once the required list is complete):

- [x] Lanvac API contract ingested (2026-08-16). OpenAPI at `https://lanvac.mobi:8843/swagger/v1/swagger.json`. Auth is dealer `10638` + WinLinks password in every JSON body (no API key). Account key is export `CODE`. Write is `POST /api/EmergencyContact/fullupdate`. Official city is the live directory string (`GET /EmergencyContact/emergencynumbers`). Emails stay; RDP is fallback. No keys in git.
- [x] Lanvac credentials in Vercel (`LANVAC_API_BASE`, `LANVAC_DEALER_ACCOUNT`, `LANVAC_DEALER_PASSWORD`). Set 2026-08-16. Server-only. Does not turn on writes.
- [x] Thank-you email sent to Stephanos (`stephanos@lanvac.com`), cc Adrien (`adrien@prog1.ca`) (2026-08-16).
- [ ] Live Stripe key, webhook, and monitoring prices in Vercel
- [ ] Four VoIP customers entered in the portal and linked to QB
- [ ] Bookkeeper inspected the first live card post
- [ ] BrightPBX DID cost (optional; margin only)
- [ ] Station cost per monitoring tier (optional; profitability later)

---

## Do this in live QuickBooks (before the test copy)

**Done 2026-08-16.** Class names and VoIP items are in live. Tax is HST 13% exclusive. Section 3 is a later sitting.

**Classes** — Lists → Class List:

1. Rename `Monitoring` → `Security Monitoring` (done). Then rename that to `Security - Monitoring`.
2. Rename `VOIP` → `VoIP - Installation` (done).
3. New class: `VoIP - Subscription` (done).
4. Rename `Security` → `Security - Installation`.

Do not split monitoring into four tier classes. Do not re-edit old invoices one by one. Screenshot the Class List.

**Items** — then section 2 below. Screenshot the three new Item List rows.

---

## 1. This week — send this pack

**On the QuickBooks PC**

- Which PC, can we remote in later, does it stay on after hours?
- Open live, press **F2**, screenshot the whole window. Need Canada 2023 R16+ or 2024 R18+.
- File on that PC, or only through a hosted/remote desktop?
- Accountant's Copy outstanding? If yes, get it back before anyone adds items.
- Do not rename the live `.qbw`. It must not live in OneDrive.

**Export** (PDFs/screenshots, item names and totals visible)

- One current monitoring sale
- One old-rate monitoring sale, if any
- Last sale for **each of the four** VoIP customers
- One sale that mixed monitoring or VoIP into an install, if any
- Item List (Type + Account), Chart of Accounts, Memorized Transaction List

**Write**

- Active monitoring count, plus any duplicates / jobs / two sites under one name
- The four VoIP customers' exact QuickBooks names, residential vs commercial
- Anyone who should not be charged 13% HST (or "none")

**Bookkeeper answers** (locked 2026-08-16)

1. Sales receipt when the portal has collected the money. Customer invoice is portal + Stripe.
2. Keep `Annual Monitoring` → 4000. Classes distinguish services. Do not rename `Annual Monitoring`.
3. Pre-tax × qty, then HST 13%.
4. Card: gross + HST to `*Stripe`, fees to 5800, net to 1000 CIBC. E-transfer / cheque: Deposit To **1499 · Undeposited Funds**, then Make Deposit to CIBC as you do today.
5. Payment methods: `Electronic Funds Transfer`, `Cheque`, `Stripe`. Do not create `e-Transfer`.
6. Classes: `Security - Monitoring`, `Security - Installation`, `VoIP - Installation`, `VoIP - Subscription`.
7. Admin user: `Admin(ServerDB)`.

---

## 2. Fix VoIP items in live (before the test copy)

Lists only. No invoices, no emails.

Create if missing, Service type, tax code **H**, income account **4000 · Product Sales** (same as `Annual Monitoring`; classes distinguish the service, so do not add a VoIP Income account):

- `VoIP - Residential`
- `VoIP - Commercial`
- `VoIP - Number Port Fee`

Price can stay 0. One line per sale. Do **not** create items for extra seats or extra numbers. Those are already inside the one monthly total (residential or commercial). Port fee stays its own item because it is one-time; quantity on that line is how many numbers were ported. Do not edit old invoices onto these. After the three exist, make `VoIP Phone Service` **inactive** (do not delete). Point any memorized VoIP template at the new item, or turn it off. Hardware installs keep item `Product Sale` + class `VoIP - Installation`. Portal monthly uses class `VoIP - Subscription`. Portal monitoring uses class `Security - Monitoring`. Security installs use `Security - Installation`.

Screenshot the three new Item List rows (name, type, account, tax) and send it.

---

## 3. Then make the test copy

Do this as its own sitting. After hours or a short window. **One company file open at a time.** TSheets follows whichever file is open.

1. Close QuickBooks.
2. **Archive the retired file first** (QuickBooks closed). In `C:\Users\Public\Documents\Intuit\QuickBooks\Company Files`, make an `Archive` folder. **Move** (do not delete) the old `McKee Security` company file and its `.ND` / `.TLG`, plus `McKee Security MAIN FILES QB.*`. Leave `McKee Security July 14.QBW` and its sidecars. Leave `QuickBooksAutoDataRecovery`.
3. Optional: Windows search `*.qbw` on the whole PC. Send the list of paths. Leave the live filename alone for now.
4. **Turn TSheets Auto-Run off** (or Exit Web Connector) before any non-live file is opened.
5. Open **only** the live July 14 file. File → Backup Company → Create Local Backup. Save the backup somewhere that is not the live folder.
6. Restore that backup into a **different folder** (not Company Files), named e.g. `McKee Security PORTAL-TEST do-not-invoice.qbw`.
7. Open **only** the copy. Company → My Company / Company Information: set the company name so the title bar says **PORTAL TEST**. Confirm the three VoIP items and the three classes are on the copy. Do not send invoices. Do not add TSheets to the copy.
8. Close the copy. Open live July 14. Turn TSheets Auto-Run back on. Watch one sync go green. Send both full paths.

Do not rename `McKee Security July 14.QBW` in this sitting. That is optional later, and only after the old file is already in Archive.

The Admin user (`Admin(ServerDB)`) must later approve the bridge ("even when QuickBooks is not running") on the copy, and again on live. Not this sitting.

---

## 4. Start now, in parallel — Lanvac call lists

Full Excel export is in hand (dealer 10638). Seed people rows plus each account's CODE and the mapped live-directory city (no client emails during import). Excel aliases like `HALIBURTON` are not valid write keys. Do not import police/fire/ambulance as contacts. After cutover, a list save still emails McKee and the customer. The save also writes the people list to Lanvac (`POST /api/EmergencyContact/fullupdate` with `usePoliceNumbers: true` and that CITY). If the API call fails, the emails still go out and RDP is the fallback. API contract is ingested; write-tested on `O5985`. No keys in git. The portal now stores `lanvac_account_code` and `lanvac_city` (required when monitoring is assigned; city must be an official Ontario directory string). Admin dropdown is Ontario only, McKee-frequency first. Clients see police/fire/ambulance for that city below the people list. Vercel env is set. The API write itself is later.

Device/battery To Do samples are already in `ACCOUNTING_GATHER_DATA.md`. The full 841 notes are a one-time import into portal devices when the 8A seed runs (AI draft + confidence + human review of low-confidence rows). After that, the portal is the managed list; stop using QuickBooks To Dos for new battery/smoke tracking. Do not export the full list for the bookkeeper sitting.

When the import screen is ready: spot-check tiers, amounts, start dates, due dates, contacts, and devices (~1 hour). Confirm the real monitoring start date, not the invitation date.

---

## 5. At Stripe go-live

- Live Stripe key, webhook, and monitoring prices in Vercel (CLI key expires 2026-10-03). VoIP prices create themselves.
- Enter all four VoIP customers in the portal by hand (plan, numbers, seats if commercial, ports, real next due) and link them to the QuickBooks names from step 1.
- Bookkeeper inspects the first live card post before we turn the queue loose.

---

## 6. Not needed to post

- BrightPBX DID cost, when they confirm it. Seat cost is already $5.95/month.
- What McKee pays the station per monitoring tier. Profitability later. Do not invent numbers.

---

## Do not

- Rename the live `.qbw`, or a shared item to "fix" VoIP
- Put TSheets on the test copy
- Keep QuickBooks emailing these customers once the portal sends that mail
- Type `GO LIVE` on the Billing tab during import, before grouping is signed off, or before the bridge is on the live QuickBooks file
- Start the Windows bridge or a real client import before the Lanvac station layer (R54), multi-site (R53), and the CUA portal test
- Book only the Stripe bank deposit as income
- Make the test copy before the new VoIP items exist in live

---

## Emails to send today

### To Dennis / the bookkeeper

Subject: QuickBooks pack for the portal (this week)

We are connecting the customer portal to QuickBooks. I need a pack from the live company file this week so we can map items and accounts before any software is installed.

Please send:

1. F2 screenshot (Product Information: version, release, Canada, file path).
2. Is that file on the office PC, or only through a remote/hosted desktop? Can we remote in later, and does the PC stay on after hours?
3. Is an Accountant's Copy outstanding?
4. PDFs of: one current monitoring invoice, one old-rate monitoring invoice if we have any, the last invoice for each of our four VoIP customers, and one invoice that mixed monitoring or VoIP into an install if that exists.
5. Screenshots of the Item List (show Type and Account), Chart of Accounts, and Memorized Transaction List.
6. Rough count of active monitoring customers, and any known duplicates or jobs.
7. The four VoIP customers' exact QuickBooks names, and which are residential vs commercial.
8. Any customer who should not be charged 13% HST. If none, say none.

Then a short sitting with you to answer:

- Invoice then receive payment, or a sales receipt when they pay?
- Which monitoring item names and income account we should keep using.
- Are amounts before tax, or tax included?
- For cards: we need to record the gross the customer paid, Stripe fees on an expense account, and the net payout from a clearing account. Create those accounts if they are missing.
- Where e-transfers, cheques, and cash land today, and the payment-method names. Create "e-Transfer" and "Stripe" if they are missing.
- Do we use Classes on sales?
- Who is the QuickBooks Admin user?

VoIP items are created in live after the payment-method lookup: VoIP - Residential, VoIP - Commercial, VoIP - Number Port Fee, all on 4000 · Product Sales, tax code H. Then make VoIP Phone Service inactive. Leave old invoices alone. Screenshot the three new rows.

Do not rename the live company file. TSheets uses that path. Do not put the file in OneDrive.

Thank you.

### To Lanvac

Subject: One-time export of McKee call lists

Hello,

We are launching a customer website where our monitoring clients can view their emergency call list and submit changes. Authenticated customers can edit their own list; our admins can edit it on their behalf. Every save writes an audit log and emails our office and the customer with a diff (added, removed, reordered).

Your software stays what the operators dispatch from. We are not asking you to change dispatch or to take on a new inbox.

**How we would like to run this (preferred)**

We keep updating call lists in your application ourselves over the existing remote-desktop session, exactly as we do now. The website email is our cue to open your UI and type the change. Until we have done that, your operators continue to call the list you already have. No API, no webhook, nothing for you to build. This is the path we want to start on.

**If you already have an API**

If your system can already accept a call-list update (authenticated write of name, phone, passcode, call order for an account), we could look at posting our saved list through that later so the station updates without the remote-desktop step. Only worth a conversation if that interface already exists. We do not need you to design one, and we do not want this to delay the export below, unless you are eager to or have an interest in it.

**What we need now**

A one-time extract of the call lists you hold for our accounts, so we can load each customer's current list onto the website instead of re-keying them from the remote session. After that seed, option 1 above is how we stay aligned.

A CSV or Excel dump is ideal: one row per contact, account key repeated on each row. Account number if you have one; otherwise service address and customer name are enough to match.

Columns we can use:

- Account number (if available)
- Service address
- Customer name
- Call order (1, 2, 3, …)
- Contact name
- Phone number
- Passcode (if stored)

Whatever you can run from the database or an existing report is fine. We will map it. A partial file is still useful; we will fill gaps from your UI ourselves.

If a bulk export is awkward, tell us what you can produce and we will work with that.

Thank you.
