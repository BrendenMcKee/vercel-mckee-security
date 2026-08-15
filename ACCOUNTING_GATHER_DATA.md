# Accounting gather — collected answers

Filled as items arrive. Checklist lives in `ACCOUNTING_GATHER.md`. Do not put secrets (API keys, Stripe keys, passwords, license keys) in this file.

---

## QuickBooks PC

| Field | Value |
|-------|--------|
| Device name | DennisPC |
| Confirmed as the QuickBooks machine | Yes (stakeholder, 2026-08-15) |
| Windows | 11 Home, version 25H2, OS build 26200.9168, 64-bit |
| Installed on | 2026-05-18 |
| Processor | AMD Ryzen 7 7700X 8-core, 4.50 GHz |
| RAM | 64 GB (63.1 GB usable) |
| After hours | Usually left on. Sometimes powered off. Cloud queue is the fallback. |
| Remote access | **Parsec.** Brenden; Andi (admin manager) from a work/home laptop; Dennis and Brenda (owners) from their laptop when away. No inbound RDP (Windows 11 Home). |
| File local vs hosted | **Local on DennisPC.** F2: Hosting = local files only. Server `QB_DENNISPC_34` at `192.168.1.233`. Not a hosted/Right Networks file. |
| Accountant's Copy outstanding | **No** (2026-08-15). Title bar: `McKee Security & Audio Systems - QuickBooks Desktop Pro(multi-user)(Admin(ServerDB)) - [Home]`. No Accountant's Copy banner. File menu has Send Company File, not an outstanding import/remove-restrictions state. |

Source: Windows About (2026-08-15) and F2 (2026-08-15).

---

## QuickBooks version (F2)

| Field | Value |
|-------|--------|
| Product | QuickBooks Desktop Pro 2024 Release **R21P** (64-bit) |
| Meets SDK floor | Yes (need 2024 R18+). R21P is fine. |
| Canada | File history includes `V15.0C` (Canadian lineage). Company is McKee Security & Audio Systems (HST). Treat as Canada Pro 2024. |
| Installed | 2024-06-27 |
| User licenses | 3 |
| Payroll expiry | 2030-12-01 |
| Audit trail | On since 2007-02-01 |
| Open users | 1 |
| Integrated apps | 2 (TSheets / Web Connector almost certainly one of these) |
| Accounts / names | 125 accounts; 3,397 names (2,661 customers, 631 vendors, 24 employees) |
| Other names | 81 |
| Items | 83 |
| Classes | **20** (they use Classes; bookkeeper must say which apply to monitoring / VoIP) |
| Terms | 6 |
| Shipping methods | 5 |
| Customer types | 0 |
| Vendor types | 3 |
| Customer messages | 11 |
| Payment methods | **14** (need the names later) |
| Memorized transactions | **753** (need the list screenshot; many may still email customers) |
| Memorized reports | 48 |
| Templates | 43 |
| Payment templates | 24 |
| Payroll items | 46 |
| Payroll schedules | 1 |
| To Do notes | **841** (need 3–4 device/battery samples; this is a large import source) |
| Job types | 2 |
| Sales reps / price levels / billing rate levels | 0 |
| Attribute definitions | 35 |
| Vehicles | 0 |
| U/M sets | 0 |
| Currencies | 158 (stock list; exchange-rate histories 0) |
| List reviews | 246 |
| Sales tax codes | **10** |
| Inventory / item sites / price rules | 0 |
| Categories | 1 |
| Transactions | 85,213 |
| File size | 334,260 KB |
| Date first used (this install on this file) | 2025-07-14 |
| QB login user seen | `Admin(ServerDB)` (password not stored) |
| Company name in login | McKee Security & Audio Systems |

Source: F2 Product Information (including scrolled List Information), 2026-08-15. License number not stored here.

---

## Live company file

**Live working copy** (last written 2026-08-15 12:37 PM):

`C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\McKee Security July 14.QBW`

The "July 14" name is leftover from a 2025-07-14 cutover. The company *title* is already McKee Security & Audio Systems.

**TSheets does not pin a file path.** Web Connector authenticate returned an empty company-file slot, which means it uses **whichever company file is open**. A successful sync at 12:36:50 lined up with this file being open. The real risk is opening the retired `McKee Security` file and letting TSheets write time into it. Do not rename or archive during this gather sitting. When we tidy later: archive the old file first, then optionally rename July 14, then open only the live file and watch one TSheets sync go green.

---

## Web Connector / TSheets

| Field | Value |
|-------|--------|
| App | QuickBooks Time (formerly TSheets) for McKee Security |
| Only app in Web Connector | Yes |
| Company shown | McKee Security & Audio Systems |
| Connector version | 34.0.10010.76 |
| Auto-run | Every 60 minutes |
| Last result | Complete, 2026-08-15 12:36:50 (next 13:36) |
| Support / SOAP URL | `https://mckeesecurity.tsheets.intuit.com/` (`…/qbwc.php`) |
| TSheets username | `dmckee0@mckeesecurity` |
| Company file in authenticate | **Empty** = use the file that is currently open in QuickBooks |
| Password / session ticket | Not stored |

Source: Web Connector window + Product Information + log excerpt, 2026-08-15. Log also shows a 2025-07-15 first init of this connector install, same day as the July 14 company-file cutover.

This finding is now in the implementation plans, not only here: `PORTAL_PLAN.md` 9.5.7 and D17 (authoritative), `ACCOUNTING_PLAN.md` file-hygiene + Section 10 item 3. TSheets' empty path is their server default. We do not reconfigure it in the Web Connector UI. Control is: archive the retired file, and turn Auto-Run off whenever a non-live file is open.

---

## Company files in the Intuit folder

Folder: `C:\Users\Public\Documents\Intuit\QuickBooks\Company Files`

| Item | Role | Action |
|------|------|--------|
| `McKee Security July 14.QBW` (~334 MB, modified 2026-08-15) | **Live books** | Keep. Rename only after this gather sitting, and only after the retired file is archived. |
| `McKee Security July 14.QBW.ND` / `.ND` / `.TLG` | QB network + transaction log for live | Leave. QB owns these. Do not rename by hand. |
| `McKee Security` company file (~310 MB, last modified 2025-07-14) | Previous live file, retired the day the July 14 file was first used | Do not delete yet. After TSheets is confirmed on July 14, **move** (not delete) to an `Archive` folder on the same PC. |
| `McKee Security.QBW` / `.ND` / `.TLG` | Sidecars for the retired file | Move with it. |
| `McKee Security MAIN FILES QB.*` (2023) | Older remnant | Move to Archive with the retired file. |
| `Restored_McKee Security*_Files` (2023 / 2025-07-14) | Restore debris | Leave for now. Archive later. |
| `QBBackupTemp *` folders | Leftover backup temp dirs | Safe to delete only when QuickBooks is closed and no backup is running. Not urgent. |
| `QuickBooksAutoDataRecovery` | Official ADR copies | **Leave.** This is how QB recovers a damaged file. |
| `*.QBW.SearchIndex` | Search index | Leave. QB rebuilds it. |
| `QuickBooks Letter Templates`, `GST Returns`, `McKee Security - Images` | Not company books | Leave. |

This is the Intuit Company Files folder, not a whole-disk `*.qbw` search.

**PORTAL-TEST copy:** not created yet. Still wait until the new VoIP items exist in live, then restore a backup into a **different folder** (not this one).

---

## Sales and lists

**Document type:** Invoices + Receive Payment. Customer Center > Sales Receipts for FY 2025 is empty. Do not look for monitoring or VoIP under Sales Receipts.

**Template:** McKee Invoice. Tax is **not** included in the rate. Line is pre-tax; QuickBooks adds HST ON 13%. Class on monitoring lines: `Monitoring`.

**How a monitoring invoice is built:** one item, qty **12**, rate = monthly pre-tax, amount = 12 × rate, then HST. Description names the period (and sometimes cellular / Total Connect / internet).

| Example | Item name | Description hint | Monthly rate | Annual pre-tax | With HST | Portal tier |
|---------|-----------|------------------|--------------|----------------|----------|-------------|
| ABBEY GARDENS #30820 | Annual Monitoring | monitoring | $24.95 | $299.40 | $338.32 | Landline (Tier 1) |
| DAVIS, DAN AND JANICE #31211 | Annual Monitoring | monitoring | $24.95 | $299.40 | $338.32 | Landline |
| CHAKRABURTTY JOTI & SNEH #31520 | Annual Monitoring | monitoring | $24.95 | $299.40 | $338.32 | Landline |
| ADAMS RC2 #30712 | Annual Monitoring | monitoring | $34.95 | $419.40 | $473.92 | Cellular, no TC (Tier 2) |
| CAREY RYAN #31274 | Annual Monitoring | **internet** monitoring | $34.95 | $419.40 | $473.92 | Same dollars as Tier 2. Path is IP (retired 7847i / now IP-COM), not cellular. |
| COLANGELO, JEFF #30622 | Annual Monitoring | monitoring | $34.95 | $419.40 | $473.92 | Cellular, no TC |
| COMBE RANDY AND DAWNYA #31828 | Annual Monitoring | cellular | $34.95 | $419.40 | $473.92 | Cellular, no TC |
| ACM-DESIGNS #31015 (`monitoring-current.pdf`) | Annual Monitoring | monitoring | $39.95 | $479.40 | $541.72 | Cellular + Total Connect (Tier 3) |
| BALLAIGUES TONY #30728 | Annual Monitoring | cellular + basic Total Connect | $39.95 | $479.40 | $541.72 | Tier 3 |
| BLAIR, DAN #31371 | Annual Monitoring | cellular | $39.95 | $479.40 | $541.72 | Tier 3 (description omits TC) |
| ANDREW TROY #31174 | Annual Monitoring | monitoring | **$39.99** | $479.88 | $542.26 | Off card (4 cents/month) |
| BELL DON #33730 | **Semi-Annual** | Semi-Annual… but period is one year, qty 12 | **$39.99** | $479.88 | $542.26 | Off card + wrong item name |
| CARREIRA, TONY #31336 | Annual Monitoring | cellular + Total Connect **home automation** | $44.95 | $539.40 | $609.52 | Tier 4. All four portal rates now seen in the file. |

**IP vs cellular:** not the same path. V69: new IP path is the IP-COM Advanced Modular Internet Communicator (replaces discontinued 7847i). Cellular is 4G/LTE. They can share a monthly *price* (e.g. $34.95 without Total Connect). Description is how the invoice tells them apart today.

**VoIP roster (2A closed).** No portal-shaped monthly VoIP invoice exists. Memorized search for `phone` and `Annual Monitoring` returned nothing useful; `monthly` hit a Discord expense. One memorized VoIP invoice exists and it is the wrong shape.

| QB name | Kind | What is in QuickBooks | Portal setup when we enter them |
|---------|------|----------------------|--------------------------------|
| Pirocchi Bob & Katherine / Mr. B. Pirocchi | Live | Memorized **annual** invoice `$4,057.22`, next date 2024-12-23, AR 1200. Customer invoices in FY 2020 show #30787 `$1,106.26` only. Emails `bob@4stardrywall.ca`, cc `k.pirocchi@rogers.com`. Cottage address 6689 Kennisis Lake Rd. | Treat as **residential** unless bookkeeper says otherwise. Do **not** keep billing $4,057.22/year as the VoIP subscription. New items, monthly rate card. Turn off or retarget that memorized invoice when portal billing starts. |
| Halliburton Auto Repair and Parts Sales (invoice header HALIBURTON AUTO…) | Live company | Install only. #31303 / #31360 `$6,270.14` includes VoIP install `Product Sale` class `VOIP`. Also #31058 `$338.32` (monitoring-shaped) and #30914 `$621.48`. Account C-1049. `haliburtonauto@gmail.com`. | **Commercial**, 1 number, 1 seat → `$59.99`/mo + HST. No monthly line yet. |
| Mr. J. Currie (CURRIE) | Live | Account C-1003. `JCURRIE@MCCARTHY.CA`. 3 South Marine Dr, Scarborough. FY 2025 invoice #30873 `$338.32` (landline monitoring). Recent IP-COM install; install may be unbilled. Landline retired; monitoring path upgraded. | **Residential** VoIP when we start it. Monitoring: admin changes tier on the service; **next** invoice uses the new rate. No mid-cycle catch-up. Already how the portal works (`proration_behavior: none`). |
| Haliburton Vision Care Centre | Pipeline only | Not a QB customer. Quote V2 2026-08-12 for Lauren & Mark Ebenhardt, 7217 Gelert Rd. Commercial VoIP: **2 numbers, 1 seat = `$64.98`/mo + HST** (matches rate card: `$59.99 + $4.99`). Two number transfers `$99.98`. Do not create them until they accept. | Enter by hand if/when they become a customer. |

Recurring VoIP items still do not exist. Create `VoIP - Residential` / `Commercial` / `Number Port Fee` on `VoIP Income` after the bookkeeper sitting. Class already used on install lines: `VOIP`.

**HST number on the PDF:** 86456 2715. E-transfer line on the printed invoice already says `dennis@mckeesecurity.ca`.

**2% credit card fee** appears on the Haliburton Auto invoice and on the printed invoice footer. Portal card payments go through Stripe (Stripe's fee, not a 2% QB line). Do not copy that 2% line onto portal-posted card sales unless the bookkeeper says otherwise.

---

## Bookkeeper mapping

| Field | Value |
|-------|--------|
| QB Admin user (Allow prompt) | `Admin(ServerDB)` (from the login dialog). Still need a human name if someone else clicks Allow. |
| Invoice vs sales receipt | **Observed:** invoice then payment. Sales Receipts empty. Bookkeeper still confirms we keep this for portal posts. |
| Monitoring items / income | Item `Annual Monitoring` (Service) → **4000 · Product Sales**. Also `Quarterly Monitoring` and `Semi-Annual` → 4000. Item default price on Annual Monitoring is `$34.25` (unused; invoices override the rate). Class on invoices: `Monitoring`. Bookkeeper still confirms: keep posting portal monitoring to `Annual Monitoring` / 4000, or split a Monitoring Income account. |
| Tax inclusive | **Observed:** no. Rate is pre-tax; QB adds 13% HST. |
| Stripe / bank / payment methods | **`*Stripe` already exists as a Bank account, balance $0.** Item `Stripe product` posts to `Stripe sales`. Card fee item `Credit Card Fee` (2%) → 5800 · Miscellaneous Costs (do not use on portal Stripe posts). Operating bank: **1000 · Bank - CIBC**. 1010 TD is empty. 1499 Undeposited Funds exists (balance was -$297.58 on 2026-08-15). Payment-method names still needed from the bookkeeper. |
| Classes | Invoices already use `Monitoring` and `VOIP`. File has 20 classes. Bookkeeper confirms those two for portal posts. |

---

## VoIP items in live

Item **`VoIP Phone Service`** already exists: Service, account **4000 · Product Sales**, price `$0.00`, empty description. No Residential / Commercial / Port Fee split. Do not rename `Annual Monitoring`. Bookkeeper sitting decides: reuse this item (and maybe add two more), or create the three named items. Splitting **VoIP Income** off 4000 is still a bookkeeper choice; today VoIP and monitoring both hit Product Sales.

---

## Item List (posting-relevant)

| Item | Type | Account | Default price |
|------|------|---------|---------------|
| Annual Monitoring | Service | 4000 · Product Sales | 34.25 (overridden on each invoice) |
| Quarterly Monitoring | Service | 4000 · Product Sales | 65.95 |
| Semi-Annual | Service | 4000 · Product Sales | 131.70 |
| VoIP Phone Service | Service | 4000 · Product Sales | 0.00 |
| Product Sale | Service | 4000 · Product Sales | 40.00 (used for VoIP *install*) |
| Credit Card Fee | Other Charge | 5800 · Miscellaneous Costs | 2% |
| HST / HST (ON)(ITC) | Sales Tax | 2300 · HST Payable | 13% |
| Stripe product | Non-inventory | Stripe sales | 0.00 |
| Installation Labour Sales (+ sub-items) | Service | 4100 · Installation/Labour Sales | 75–80 |
| Fin Chg | Other Charge | 4500 · Miscellaneous income | 12% |

Labour, Starlink, batteries, NSF, etc. are install/ops. Portal recurring posts should not use them.

---

## Chart of Accounts (posting-relevant)

| Number / name | Type | Role for Phase 8 |
|---------------|------|------------------|
| 1000 Bank - CIBC | Bank | Operating bank (e-transfer / cheques land here) |
| 1010 Bank - TD | Bank | Empty; unused |
| 1020 Petty Cash / 1030 Cash | Other Current Asset | Cash path if they use it |
| 1200 Accounts Receivable | AR | Invoice-then-payment |
| 1499 Undeposited Funds | Other Current Asset | Exists; small negative balance to clean later |
| 2300 HST Payable | OCL | HST on sales |
| 4000 Product Sales | Income | **Current** monitoring and VoIP item income |
| 4100 Installation/Labour Sales | Income | Installs only; do not post renewals here |
| 6730 Bank Charges / 7005 Bank Service Charges | Expense | Possible Stripe-fee home if they reject 5800 |
| *Stripe | Bank | **Existing Stripe clearing / holding account** |
| Stripe sales | (item account) | Item `Stripe product` points here; confirm it is a real income/clearing account |

No `Monitoring Income` or `VoIP Income` account today. Creating them is optional and waits on the bookkeeper.

---

## Memorized transactions

Customer monitoring renewals are **annual Invoices** to 1200 AR. Amounts on the list are **after HST** and match the portal tiers: `$338.32` / `$473.92` / `$541.72` / `$609.52`. Off-card examples on the first screen: ANDREW TROY `$542.26`, ATKINSON TED `$519.12`, BAUMGARTNER LINDA `$248.60`, BASSLER DEB AND CHRIS `$5,242.27` (bundle / multi-site; import must not treat as one tier). YOUTH WELLNESS HUB DOOR ACCESS is frequency **Never**.

This list is the real renewal calendar for the bulk import (`next_due_on` ≈ Next Date). 753 rows; we have the top and bottom. Full export later if the importer needs every name. Pirocchi's annual VoIP memorized sits in the middle (not in these two screens).

When portal mail goes live, these monitoring memorized invoices must be turned off or they will double-bill.

---

## To Do samples

Company > To Do List. 841 notes; first screen is enough to calibrate a parser. Pattern is free text: customer name + `No smokes` / `zone N smokes YYYY` / `changes his own battery` / panel type. Dates on the open tasks are mostly 2012–2020 (stale). Example wording (verbatim enough to parse):

- `Janne Stephen No smokes` (2012-07-01)
- `Dominion Hotel Fire panel zone 3 CUSTOMER SAYS HE CHANGES HIS OWN BATTERY` (2013-08-13)
- `HARPER STEVE Zone 1 smokes 2021` (2016-08-31)
- `SAWYER MICHAEL DSC zone 8 smoke detector 2018` (2017-07-26)
- `Polonsky Mike 3A HW smokes & 3 CO detectors 2034... Please call in June to set up an appointment.` (2019-03-12)
- `GILLIES 3 wireless house smokes 2020 1 wireless smoke 2027 in garage.... Called customer on Feb 1st 2024 about expired smoke detectors, he said he would take the risk.` (due 2020-07-08)

Do not need a full To Do export to start. Request one later only if we build the device importer.

---

## Lanvac

| Field | Value |
|-------|--------|
| Call-list export | Received 2026-08-14 from Stephanos Georgoudes |
| API | Offered; details not in this file yet (do not update plans until the contract is in) |

---

## To Do samples

Not yet.
