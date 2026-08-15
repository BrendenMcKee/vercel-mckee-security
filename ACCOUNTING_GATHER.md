# Accounting gather

Tick a box when that item is in. **No further integration (bridge, posting code, or cloud queue) until every required box below is checked.** Answers and screenshots-as-text live in `ACCOUNTING_GATHER_DATA.md`. Later items (Stripe go-live, profitability) are tracked but do not block the start of Phase 8 once the required list is complete.

Portal truth: monitoring is annual, VoIP is monthly, one line each, plus 13% HST. Clients send the after-HST amount to `dennis@mckeesecurity.ca`. The books must match that. VoIP live today: Pirocchi (wrong annual memorized), Haliburton Auto (install only), Currie (install/upgrade, no monthly). Vision Care is pipeline only. Enter live ones by hand later.

VoIP is not booked correctly today. **Create new items. Do not rename** the item those customers sit on. In QuickBooks Desktop a rename rewrites every old invoice that used that item.

## Status

**Next:** Steps 2 and 3 are done. Remaining required items are the bookkeeper sitting (invoice vs sales receipt, keep 4000 vs split income, Stripe/*Stripe/CIBC, payment methods, HST exceptions, class `Monitoring` / `VOIP`) plus a rough active-monitoring count. Do not create the extra VoIP items or the test copy until that sitting.

Required before any integration starts:

- [x] Which QuickBooks PC (`DennisPC`, Windows 11 Home 25H2)
- [x] Remote access: Parsec. Brenden, Andi, Dennis, Brenda.
- [x] Stays on after hours (usually on; sometimes off; queue covers downtime)
- [x] F2: QuickBooks Desktop Pro 2024 R21P 64-bit (meets 2024 R18+; Canadian file lineage)
- [x] File is local on DennisPC (`…\Company Files\McKee Security July 14.QBW`; hosting = local files only)
- [x] Accountant's Copy outstanding? **No.** Title bar is normal (`McKee Security & Audio Systems - QuickBooks Desktop Pro (multi-user) (Admin(ServerDB))`). No "Accountant's Copy exists" banner.
- [x] Current monitoring sale PDF (`monitoring-current.pdf` ACM-DESIGNS, $39.95 × 12, item `Annual Monitoring`, class `Monitoring`, HST extra)
- [x] Old-rate / odd monitoring (screenshots): $39.99 and item `Semi-Annual` used for a full year
- [x] VoIP sales: no monthly subscription invoices. Pirocchi has a stale **annual** memorized `$4,057.22`. Auto and Currie have install/monitoring only. Vision Care is quote-only.
- [x] Mixed VoIP + install (HALIBURTON AUTO REPAIR #31303: VoIP install `Product Sale`, no monthly line)
- [x] Item List (Type + Account): `Annual Monitoring` and `VoIP Phone Service` both → 4000 · Product Sales
- [x] Chart of Accounts: 1000 CIBC, 1200 AR, 1499 Undeposited Funds, 2300 HST, 4000/4100 income, `*Stripe` Bank
- [x] Memorized Transaction List (top + bottom): annual invoices at after-HST tier totals
- [ ] Active monitoring count + known duplicates / jobs
- [x] VoIP names: Pirocchi (residential), Halliburton Auto Repair (commercial 1+1), Mr. J. Currie (residential), Vision Care pipeline (commercial 2+1, `$64.98`)
- [ ] HST exceptions (or "none")
- [ ] Bookkeeper: invoice-then-payment vs sales receipt
- [ ] Bookkeeper: monitoring item(s) and income account
- [ ] Bookkeeper: amounts before tax vs tax included
- [ ] Bookkeeper: Stripe clearing, fees, and bank accounts (created if missing)
- [ ] Bookkeeper: e-transfer / cheque / cash deposit-to and payment methods (`e-Transfer` and `Stripe` created if missing)
- [ ] Bookkeeper: Classes (or "none")
- [x] Bookkeeper: QuickBooks Admin user name (`Admin(ServerDB)` on the login dialog)
- [ ] Live items created: `VoIP - Residential`, `VoIP - Commercial`, `VoIP - Number Port Fee` on `VoIP Income`, tax H
- [ ] Screenshot of those three new Item List rows
- [ ] Inventory of every `.qbw` on the PC (Intuit Company Files folder is mapped; whole-disk search not done)
- [x] Web Connector: TSheets only; healthy; uses the **open** company file (not a pinned path)
- [ ] PORTAL-TEST copy made after the new VoIP items (different folder, title bar says PORTAL TEST, no TSheets)
- [ ] Live reopened, TSheets still syncs
- [ ] Full paths of live and PORTAL-TEST files
- [x] Lanvac call-list export received (2026-08-14, Stephanos)
- [x] To Do samples (first screen of the list; smoke/battery wording). Full export only if we build the device importer.

Later, before the portal-test copy is opened (written into the plans; not this sitting):

- [ ] Archive the retired `McKee Security` company file so TSheets cannot sync into it
- [ ] Optional: rename `McKee Security July 14.QBW` to a clear live name, then confirm one TSheets sync
- [ ] While any non-live file is open: TSheets Auto-Run off (or Web Connector exited)

Later (do not block the start once the required list is complete):

- [ ] Live Stripe key, webhook, and monitoring prices in Vercel
- [ ] Four VoIP customers entered in the portal and linked to QB
- [ ] Bookkeeper inspected the first live card post
- [ ] BrightPBX DID cost (optional; margin only)
- [ ] Station cost per monitoring tier (optional; profitability later)

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

**Bookkeeper answers** (exact names)

1. Invoice then payment, or sales receipt when paid?
2. Which monitoring item(s) and income account do we keep? One name per tier if they already exist. Do not rename a shared item.
3. Amounts before tax, or tax included?
4. Card: gross to a Stripe clearing account, fees to an expense account, net payout to the bank. Create those accounts if missing.
5. E-transfer / cheque / cash: which bank or Undeposited Funds, and which payment-method names exist? Create `e-Transfer` and `Stripe` if missing.
6. Classes on sales? If yes, which for monitoring and VoIP?
7. Who is the QuickBooks Admin (clicks Allow on the bridge)?

---

## 2. Bookkeeper — fix VoIP in live (before the test copy)

Lists only. No invoices, no emails.

Create if missing, Service type, tax code **H**, income account **`VoIP Income`** (create the account if missing):

- `VoIP - Residential`
- `VoIP - Commercial`
- `VoIP - Number Port Fee`

Price can stay 0. One line per sale. Do not add per-phone items. Do not edit old invoices onto these. Point any memorized VoIP template at the new item, or turn it off.

Screenshot the three new Item List rows (name, type, account, tax) and send it.

---

## 3. Then make the test copy

1. List every `.qbw` on the PC. Leave the live filename alone.
2. Backup live. Restore in a **different folder** as e.g. `McKee Security PORTAL-TEST do-not-invoice.qbw`.
3. Open the copy, set Company Name so the title bar says PORTAL TEST. No TSheets, no email, no invoices on the copy.
4. Reopen live, confirm TSheets still syncs. Send both full paths.

One file open at a time. Copy-open pauses TSheets; keep it short or after hours.

The Admin from step 1 must approve the bridge ("even when QuickBooks is not running") on the copy, and again on live later.

---

## 4. Start now, in parallel — Lanvac call lists

McKee already updates call lists in Lanvac's software over remote desktop. That does not change. The website is our own record: customers can edit their list, both sides get an email, and staff still log into Lanvac and type the change. We never email Lanvac to update a list.

Do not wait for QuickBooks. A partial export is enough to test the import and see who is still missing before cutover. Missing lists at launch are fine; we enter those by hand (or copy them from the remote desktop, one account at a time).

Ask Lanvac for a bulk copy of what is already on file. Email draft below.

Also copy 3–4 device/battery To Do notes from QuickBooks (exact wording and dates).

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

VoIP is not set up as its own items today. After that sitting, please create three new Service items in live (do not rename an existing item; that rewrites history): VoIP - Residential, VoIP - Commercial, VoIP - Number Port Fee, all on a new VoIP Income account, tax code H. Leave old invoices alone. Screenshot the three new rows.

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
