# How the Accounting System Will Work (Plain-Language Guide)

**Last updated:** 2026-08-28 (Client email is paused until go-live. 8A cloud routes already shipped. Empty mirrors until the Windows bridge runs. No posting. R54 is done. R53 slices 1–2 shipped and audited. **Next: remainder of slice 3** (`docs/MULTI_SITE_ACCOUNTS.md`: last-owner revoke, delete confirm copy), then later R53 slices, then the CUA portal test (`docs/PORTAL_CUA_TEST.md`), then `qb-bridge/` on PORTAL-TEST, then import with a human grouping pass, then the Billing-tab `GO LIVE` flip only after grouping is signed off and the live QuickBooks file is connected.)
**Who this is for:** Anyone at McKee Security (including the bookkeeper) who wants to understand how the portal and QuickBooks Desktop will work together, without reading technical documents.
**Technical companion:** `PORTAL_PLAN.md` Sections 9.5 and 9.6 and the Phase 8/9 checklists in Section 10 are the authoritative build spec. Multi-site / extra logins (county-style orgs) live in `docs/MULTI_SITE_ACCOUNTS.md` (R53). This document explains the same design in plain language. If the two ever disagree, `PORTAL_PLAN.md` wins.

---

## 1. The one-paragraph version

The customer portal handles everything customers and admins touch day to day: accounts, monitoring tiers, VoIP phone plans, due dates, reminders, card autopay, and recording cash/cheque/e-transfer payments. QuickBooks Desktop stays exactly what it is today, the official books. A small connector program (the "bridge") on the office QuickBooks computer keeps the two in sync automatically: every payment the portal takes gets posted into QuickBooks without anyone typing it in, and any payment the bookkeeper types straight into QuickBooks flows back to the portal so reminders stop and the customer's account stays accurate. Nothing posts to the books without built-in safety checks, and anything ambiguous stops and asks a human instead of guessing. Everything in this document applies to every billable service the portal offers, monitoring and VoIP alike; where VoIP needs a special word, it gets one explicitly.

---

## 2. The pieces, in plain language

**The portal (already built, running on Vercel and Supabase).** Where admins manage clients, tiers, due dates, devices, and payments, and where clients see their account, alarm contact list, and payment history. Customer emails (invitations, payment reminders, receipts, caller-ID notices, device replacements) stay **off** until an admin types `GO LIVE` on the Billing tab. That flip is the last production step: after the import is checked and the bridge is on the live QuickBooks file, not during import. Staff still get the daily collections digest and other office alerts. It also carries the **VoIP phone service** on the same autopay and manual rails as monitoring. VoIP bills monthly (monitoring bills annually). The monthly figure is **one amount per system**, derived from the rate card below, not a per-phone or per-number charge. The client sees one line that names the service and what it covers. Recurring VoIP is never folded into an installation invoice, a project total, a payment threshold, or a payment split.

**QuickBooks Desktop (unchanged).** The official financial record. It keeps working exactly as it does now. The bookkeeper can keep doing anything they do today; the automation works around them, not instead of them.

**The bridge (to be built, Phase 8A).** A small Windows program installed on the office computer that runs QuickBooks. It is the only new thing that lives in the office. It is **not** the AI assistant and it is **not** installed as a Web Connector app (TSheets already uses Web Connector on the live file). It calls out to the portal's servers over the internet, asks "anything for me to do?", does the work inside **one named company file**, and reports back. Until go-live that file is a copy of the books, not the live file. Important properties:

- It only makes outbound connections. Nothing on the office network is opened up to the internet. This is the same trust model already used by the camera gateways.
- If the computer is off, nothing breaks. Work queues up in the cloud and the bridge catches up the next time the computer is on. The portal and website never depend on the office PC being awake.
- It only accepts a short list of named operations (record a payment, create a customer, and so on). It can never be asked to do something open-ended to the books.

**The mirrors (Phase 8A).** The bridge regularly copies a read-only snapshot of the QuickBooks customer list, invoices, receive-payments, and to-dos up to the portal's database. That means admins (and later the AI assistant) can look at "what do the books say?" from anywhere, any time, even when the office PC is off, without touching QuickBooks itself. Mirrors are a copy for reading; changing a mirror is impossible, and mirrors never overwrite portal data. The cloud routes that receive those snapshots (`/api/qb/poll`, `/api/qb/report`, `/api/qb/mirror`) are already live. They do not post, and they do not create unpaid invoices. The Windows program that talks to QuickBooks waits until multi-site accounts and the CUA portal test are done.

**The task queue (Phase 8B).** A to-do list in the cloud that is the only way anything gets written into QuickBooks. Every entry says exactly what to do ("record a $419.33 payment from Jane Smith"), carries a fingerprint so the same payment can never be posted twice even if a glitch replays it, and moves through checked states: pending, approved, posted, or needs review. Anything that fails or looks ambiguous parks in "needs review" on the admin Accounting tab with a plain explanation and suggested fixes.

**The AI accounting assistant (Phase 8D, the MCP server).** This is a later cloud service, not a program on the QuickBooks PC. Once the plumbing above is trusted, staff can ask questions in plain English from Cursor: "who owes us money?", "what did monitoring bring in last quarter?", "draft a collection email for overdue accounts". It answers from the mirrors, so it works even when the office PC is off. It is rolled out in three deliberate stages: read-only questions first, then drafting (drafts post nothing), then payment posting that still requires admin approval in the portal. It can never void, delete, journal, or touch payroll or closed periods. Those operations simply do not exist in its vocabulary.

### How VoIP is billed (the live rate card)

This is how the portal actually prices VoIP today (company knowledge 3.12, locked 2026-08-13). The rate card is how the figure is derived internally. The client document is always **one line** at the total.

| Item | Rate (pre-tax) |
|---|---|
| Commercial VoIP Service, base system per month (1 number + 1 user seat) | $59.99 |
| Residential VoIP Service, base system per month (1 number + 1 user seat) | $34.99 |
| Each additional number (commercial and residential) | $4.99 |
| Each additional user seat (commercial only) | $24.99 |
| Number Port Fee, per number ported (one time, not recurring) | $49.99 |

Residential has no seat add-on at all. The additional-number rate is the same on both plans. Phones and handsets add nothing to the monthly: a DECT base with three handsets on one number is still the base $59.99 (Haliburton Automotive).

**Formula:** monthly pre-tax = base + ($4.99 × extra numbers) + ($24.99 × extra seats). HST at 13% is applied to that sum once, not component by component.

**Worked figures the portal must keep matching:**

| Configuration | Pre-tax | With HST |
|---|---|---|
| Residential, 1 number, 1 seat | $34.99 | $39.54 |
| Commercial, 1 number, 1 seat | $59.99 | $67.79 |
| Commercial, 2 numbers, 1 seat (Vision Care Centre) | $64.98 | $73.43 |
| Commercial, 1 number, 3 seats | $109.97 | $124.27 |

**Rules the automation already encodes:**

- One subscription, one line item, quantity 1. The line names the service and states the coverage (number count, seat count) and carries the total. Base and add-ons are never separate lines on a client invoice.
- Charged once per system. Never per phone, never per number, never per handset.
- Recurring is fully separate from installation. Monthly service bills on its own invoice on its own cycle. It never appears inside a one-time installation invoice.
- The port fee is a separate one-time charge. It does not move the next monthly due date and is never mixed into the subscription. On first setup the client adds a card once; that card starts every approved autopay service and charges any outstanding ports. A later extra port shows as its own payment on their dashboard and charges the saved card (only the new ports). Admins can still Charge from the client page. The portal records how many ports have already been charged, so nobody is billed twice. If the card is declined, nothing is marked charged.
- Internal cost (BrightPBX, never shown to a client): $5.95 per user seat per month. Number (DID) cost is unconfirmed and treated as $0.00 until BrightPBX answers. There is no per-client floor.

In the portal, Commercial is the display name for the `professional` plan. Stripe catalog prices are the two bases; a system above the base uses one matching monthly price on the same product. The Number Port Fee is its own one-time Stripe price.

### Cancelling or changing a service also updates Stripe

Yes. For every billable service (monitoring and VoIP), an admin change on a customer who pays by card is applied to **that customer's Stripe subscription**, not just the portal row. Stripe is updated first; if Stripe refuses, the portal is left unchanged.

| What you do in the portal | What happens in Stripe |
|---|---|
| Change the plan (monitoring tier, or VoIP Residential / Commercial) | The subscription price is swapped. The new rate is on the **next** invoice. Nobody is charged a mid-cycle difference. |
| Change VoIP numbers or seats | Same price swap at the new monthly total. Ports do not change the subscription; they only affect the one-time port fee. |
| **Cancel** the service | Stripe is told to stop at the **end of the current period**. They stay paid through that date. After that the Stripe subscription is gone, so starting again means they enter a card. Use this when the service is ending. |
| **Hold billing** (Pause) | Stripe **keeps** the subscription and stops charging. Restart later and they do not enter their card again. Use this for a temporary hold (seasonal, "sort payment, then resume"). Not the same as Cancel. On e-transfer / cheque / cash, Hold just stops reminders. |
| Restart | If they were on Hold, Stripe starts charging the same card again. If they were Cancelled and the period has already ended, they set up card payments again. |
| Switch them from card to e-transfer / cheque / cash | Stripe is **cancelled immediately**. They are paid through the current period; after that you collect by hand. Different from Cancel service. |
| Delete the client | Every live Stripe subscription is cancelled immediately, then the portal row is erased. The Stripe customer is kept so invoices stay in Stripe. Recreating the same email currently reuses that customer (has-card / first match). After multi-site (R53), reuse only when Stripe `metadata.profile_id` matches **this site**, so two sites that share a contact email cannot steal one card customer. |

If they are on the manual rail (no card on file), Cancel / Pause / Restart only change the portal status. There is nothing in Stripe to update.

A cancelled service must be Restarted before you can change the plan or VoIP coverage. That keeps a stopped Stripe subscription from being quietly repriced.

---

## 3. How a payment flows (the four stories)

These stories read the same whether the payment is for monitoring or for VoIP. The queue, the fingerprints, and the safety checks do not care which service the money is for; the only difference is which item and class land on the sales receipt (Section 4) and that VoIP renews monthly instead of annually.

**Story 1: Card autopay (Stripe).** The customer's card is charged automatically on their renewal date. Stripe tells the portal, the portal records it in the customer's payment history, advances their next due date, emails them the paid confirmation, and drops a task in the queue. The bridge writes a **sales receipt** in QuickBooks (deposit to `*Stripe`). Nobody types in QuickBooks. QuickBooks never emails the customer.

**Story 2: Cheque, cash, or e-transfer recorded in the portal (the preferred way).** A customer pays the legacy way. The admin opens their page and clicks "record payment". Reminders stop, the due date advances, the customer gets a confirmation email, and a task posts the payment into QuickBooks automatically. This is the recommended habit: record it in the portal and the books take care of themselves.

**Story 3: A payment keyed straight into QuickBooks (the supported fallback).** If someone forgets the portal and the bookkeeper enters a cheque directly into QuickBooks, the bridge notices it on its next pass and sends it up. The portal checks it is genuinely new (see the safety rails below), then applies it exactly as if an admin had recorded it: payment history entry, due date advanced, reminders stopped. So a payment recorded in either system ends up correctly in both.

**Story 4: The same cheque entered in both places.** The one genuinely tricky case: an admin records a cheque in the portal and the bookkeeper also types the same cheque into QuickBooks before the sync runs. The system watches for this specifically. Before anything auto-posts in either direction, it checks the other system for a payment from the same customer for the same amount within about a week. If it finds one, it does not guess: the payment parks in "needs review" with the question spelled out ("was this cheque already keyed into QuickBooks?"), and an admin resolves it with one click. The same payment can never double-post to the books or push a customer's due date forward twice.

**The hierarchy in one breath:** card payments always start in the portal; legacy payments preferably start in the portal but starting in QuickBooks is fine too; whichever system hears about a payment first tells the other exactly once; and if both hear about it independently, a human decides.

---

## 4. Do we still send invoices from QuickBooks? No.

Today, monitoring and VoIP bills are created in QuickBooks and emailed to customers from there. Once this system is live, that stops entirely:

- **The portal sends every customer-facing billing email, but only after go-live.** Until an admin types `GO LIVE` on the Billing tab, imported customers get no invitations, reminders, or receipts. Staff still get the daily collections digest. After that flip, renewal reminders for legacy payers (amount, due date, how to pay) go out on the schedule already built. Customers on autopay get charged automatically and receive receipts. Payment confirmations come from the portal. During the migration, the reminder email can also carry the invitation to activate their portal account.
- **QuickBooks becomes internal-only.** The automation creates a **sales receipt** in QuickBooks when the portal has collected the money (card charge succeeded, or an admin recorded an e-transfer / cheque / cash). Nobody emails that document to the customer. The customer already got the portal confirmation and, on card, the Stripe receipt. That is the "paid invoice at the same time."
- **Why a sales receipt, not an unpaid invoice.** The portal is the collections system. An open QuickBooks invoice would be a second place someone had to chase, and the bookkeeper is not managing portal billing. We only write to the books after the money exists. Historical invoices in the file stay as they are.
- **Income stays on 4000 · Product Sales.** Monitoring uses item `Annual Monitoring`. VoIP uses new items (`VoIP - Residential`, `VoIP - Commercial`, `VoIP - Number Port Fee`). Every automated line gets a **class**: `Security - Monitoring` or `VoIP - Subscription`. Installs stay on `Security - Installation` or `VoIP - Installation` and are not posted by the portal. A Profit & Loss by Class report is how QuickBooks answers "what did subscription VoIP bring in?" vs install work. We do not add extra income accounts. Four monitoring tiers stay in the portal, not as four QuickBooks classes.
- **Where the money sits first.** Card sales receipts deposit to `*Stripe`, then the payout hits CIBC minus the Stripe fee. E-transfer and cheque sales receipts deposit to **1499 · Undeposited Funds**, same as today's Receive Payments, then someone uses Make Deposit to move them to 1000 CIBC.
- **The accountant still gets the sale in the company file.** A sales receipt is a normal QuickBooks document: customer, item, class, pre-tax, HST, payment method, and where the money landed. Year-end is the `.QBW`, not Stripe. The portal/Stripe invoice is what the customer sees. The books are not missing the sale.
- **Card money path.** The sales receipt (pre-tax + HST) lands in the existing `*Stripe` bank account. When Stripe pays out, the net goes to 1000 CIBC and the real Stripe fee goes to 5800. Never treat the CIBC deposit as the sale.
- **Both systems always show received payments.** The portal shows every payment in the customer's history and on the admin Billing tab, with a per-payment sync status showing whether it has landed in QuickBooks yet. QuickBooks shows the same payments as proper accounting entries. That is the whole point of the two-way payment sync.

---

## 5. Getting in alignment on day one (the bulk import)

Before customers are invited to anything, the portal is seeded from QuickBooks so both systems agree completely:

1. The bridge mirrors the full customer list and invoice history to the cloud.
2. An "Import from QuickBooks" screen builds a draft for every active monitoring customer: name and email from QuickBooks, plus a best guess at their monitoring tier, annual amount, **the day they first started monitoring** (taken from their earliest monitoring invoice — not the day we later invite them to the portal), and next due date, read from their actual invoice history.
3. **The tier guess works from the price first.** The four monitoring tiers bill at four different annual amounts, so the dollars on a customer's last invoice identify their tier almost perfectly; the invoice line-item names confirm it. A customer whose billed amount matches no current tier price (an old grandfathered rate) is flagged for a closer look, and the import keeps the amount they actually pay. **Nobody's price changes because of the import.** Moving someone from an old rate to current pricing is always a deliberate decision, never a side effect.
4. **A human reviews every row before anything is created.** The guesses only pre-fill the screen; the admin confirms or corrects each customer, then commits.
5. Committing creates each **site** in the portal (one QuickBooks customer = one portal site = one Lanvac CODE when we have it), already linked to their QuickBooks record, on the legacy payment rail with their true amount, monitoring start date, and due date. **No customer emails are sent by the import. Do not auto-group county-style orgs.** A later grouping board suggests likely matches; a person accepts or rejects. None of that mail goes out until the Billing-tab `GO LIVE` flip, and that flip also waits on grouping sign-off. Staff may still get a collections digest listing who is due. Running the import again is safe; already-imported customers are skipped, so duplicates are impossible.

**The import also brings in more than billing:**

- **Alarm contact lists (caller ID) come from Lanvac.** The Excel export (dealer 10638) is the seed (people rows only, plus each CODE and the mapped live-directory city onto the profile). Excel aliases like `HALIBURTON` are not valid write keys. After cutover, a list save still emails McKee, and emails the customer once client email is live. The same save writes the people list to Lanvac (`POST /api/EmergencyContact/fullupdate` with dealer 10638, the WinLinks password, that customer's CODE, `usePoliceNumbers: true`, and `profiles.lanvac_city`). Police/fire/ambulance stay station-owned. If the API call fails, the emails still go and someone updates Lanvac by hand as today. When each customer later activates, the invitation asks them to review their alarm contact list.
- **Device and battery records come from the QuickBooks To Do list once, then live only in the portal.** That list is where they are tracked today (841 notes such as "zone 3 smokes 2021" or "changes his own battery"). The import reads those notes and drafts a portal device for each one: a name, a category (system battery, device battery, smoke/CO detector, or other), an install or replace date, and which customer it belongs to. Because the notes are freeform, the computer's guess includes a confidence score and always keeps the original wording so a bad guess can be fixed without losing the source. High-confidence drafts still get a look on the review screen; low-confidence ones are a short list you walk by hand. After that review, **the portal device list is the system of record.** You stop adding new battery and smoke notes in QuickBooks. We do not keep the two lists in sync. This work happens when the import screen is built; it is not part of the bookkeeper sitting and it does not block payments posting to the books.
- **A per-customer migration checklist** shows exactly where each imported customer stands: imported, monitoring start date confirmed, alarm contacts entered, devices entered, invited, activated. Whether something is "done or not" is always visible on their page and filterable on the Billing tab; it never depends on anyone's memory.
- **Invitation date and activation date are not the monitoring start date.** Those two dates only tell us when they were invited to the portal and when they first signed in. A customer who has been monitored for years still needs the original start day on file, so later year-over-year monitoring profitability can look at real history, not just the portal era. The same date is required when you type a customer in by hand.

**VoIP customers are not part of the bulk import.** Three are live in QuickBooks (Pirocchi, Haliburton Auto, Currie) and Vision Care is still a quote. None have a portal-shaped monthly invoice; Pirocchi has a stale annual memorized VoIP bill we will not copy. Enter each live customer by hand through the normal create-client form when Stripe goes live, with their real plan, number count, seat count, any ports, amount, and next due date, then link them to QuickBooks. A later port-fee payment is a one-time amount and must not be treated as a monthly renewal.

The result: the admin Billing tab shows the entire business's real renewal calendar from day one, before a single customer has touched the portal. The collections board and (after go-live) customer reminders agree with the books from the start.

---

## 6. Migrating customers, one at a time

Everyone imported starts on the legacy rail (cash, cheque, e-transfer), because that is the truth of where they are today. The migration to the new system is gradual and personal:

- **The system finds who is next.** Each day it flags imported **accounts** whose earliest site renewal is coming up and who have never been invited. They appear in an "invite queue" on the Billing tab and in the daily digest email, so no renewal slips by without a decision. A county-style account with many sites is invited **once** (Appoint account admin / Account admin setup), not once per CODE.
- **One click sends the invitation, only after go-live.** Until then the invite queue can be reviewed but customer mail stays off. For a one-site house the email is a combined renewal notice and account invitation: amount due, due date, how to pay today the old way (paying is never blocked on signing up), their personal activation link, and the pitch for autopay. For a grouped org with no login yet, it is the Account admin setup letter. Prefer naming that person before the first bill is due.
- **The team sees everything.** Every invitation is also delivered to the McKee inbox, so staff see exactly what the customer received, and replies from the customer land at info@mckeesecurity.ca as a normal email conversation. Each customer's row shows when they were invited and whether they have activated, so "invited two weeks ago, not activated, renewal in ten days" is visible and actionable.
- **Activation never forces autopay.** A customer can activate and keep paying by e-transfer forever. Autopay is strongly encouraged in the copy and in the portal, but it is a sell, not a gate. When they do switch, their payments become Story 1 and flow completely hands-free.
- Customers who never activate still get reminders once client email is live, still appear on the collections board, and their payments still post to the books. Full alignment does not depend on customer participation.

---

## 7. The safety rails (what can never happen automatically)

- **No automatic customer creation in QuickBooks.** A payment only posts against a portal client who has been explicitly linked, one-to-one, to a QuickBooks customer. If there is no link, the payment waits in "needs review" with suggested matches; it never creates a new QuickBooks customer on its own. Creating one is always a deliberate, admin-approved act. This is the structural defence against duplicate customers in the books.
- **No guessing, ever.** Two plausible matches, an odd amount, an unlinked customer, a malformed task: all of these stop and ask a human. The design principle throughout is "park it and explain, never guess".
- **No double posting.** Every task carries a unique fingerprint (replaying the same Stripe event twice is a no-op), every payment imported from QuickBooks carries its QuickBooks transaction ID (importing twice is impossible), and payments the portal itself posted are recognised and skipped when they come back around in the mirror (no echo loops).
- **Approval gates on posting.** Tasks that write to the books require admin approval on the Accounting tab. The AI assistant's posting tools only enqueue; approval still happens in the portal, by a person.
- **Nothing destructive exists.** Voiding, deleting, journal entries, chart-of-accounts changes, payroll, and closed-period edits are not reduced or restricted; they are simply not implemented in any automated path.
- **Offline-safe by design.** The office PC being off never breaks the website, the portal, payments, or reminders. Work queues and catches up.
- **Everything is auditable.** The portal's payment ledger is append-only (mistakes are corrected with a reversing entry, never an edit), every task records who or what created it and what happened, and every AI call is logged.

---

## 8. What day-to-day looks like after Phase 8

| Task | Today | After |
|---|---|---|
| Billing a monitoring or VoIP customer | Create invoice in QuickBooks, email it from QuickBooks | Automatic: portal reminds legacy payers, charges autopay customers (VoIP monthly, monitoring annually) |
| Recording a card payment in the books | Hand-keyed | Automatic |
| Recording a cheque/e-transfer | Hand-keyed in QuickBooks | One click in the portal (posts to the books itself); typing it into QuickBooks still works and syncs back |
| Knowing who owes money | Scan QuickBooks | Billing tab collections board, or ask the AI assistant |
| Chasing renewals | Memory and paper | Daily digest plus the invite/reminder machinery |
| Duplicate or ambiguous entries | Found at reconciliation time, untangled by hand | Caught up front, parked in "needs review", resolved with one click |

---

## 9. The build order

- **Already done (2026-07-18, rate card updated 2026-08-13): VoIP in the portal.** Before any accounting automation is built, the VoIP service was fully implemented on the website and in Stripe, the same way monitoring was. The live model is the 3.12 rate card above (one monthly figure per system, port fee one-time). This was deliberate: the accounting rail below is being designed against the complete service catalog, not retrofitted for VoIP later.
- **File hygiene (done 2026-08-16 / 17).** Live: `C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\McKee Security Live.QBW`. Copy: `C:\Users\Public\Documents\Intuit\QuickBooks\PORTAL-TEST\McKee Security PORTAL-TEST do-not-invoice.QBW`. Retired file and leftover `July 14` sidecars are in `Archive_Old`. TSheets uses whichever file is open. While the copy is open, quit Web Connector from the tray (do not rely on Auto-Run off). Every test sitting: confirm the open file is PORTAL-TEST.
- **8A: Bridge and mirrors.** Install the bridge pointed at the **copy**. Mirror that file into the cloud (read-only), build the linking and bulk-import screens, run the import against real customer history. The live books are not opened by the bridge.
- **8B: The task queue.** The to-do list, the state machine, the approval screens, the Accounting tab. Test posting into the **copy** only. Those test postings are never replayed onto the live file.
- **8C: Payments post to the books.** Mapping is already locked (sales receipt on 4000 with classes, `*Stripe` / CIBC / 5800). The bridge is flipped to the live company file, both payment rails start posting automatically, history is backfilled, and the reverse sync (QuickBooks to portal) plus the duplicate-entry guard go live. Stripe's switch from test mode to live mode ideally lands here, so the first real card payment posts to the books automatically. Someone who knows the books inspects that first live sales receipt before the queue runs unattended.
- **8D: The AI assistant (cloud).** Read-only questions first, sign-off, then drafting, sign-off, then approval-gated posting. Still not installed on the QuickBooks PC.

Each stage has a test gate that must pass before the next begins, and the stakeholder checkpoints are built into the checklist in `PORTAL_PLAN.md` Section 10.

---

## 10. What we need from you to build this

**Do `ACCOUNTING_GATHER.md` first.** It is the short action list: screenshots, four real invoices, five bookkeeper answers. Do not start Phase 8 cloud posting code or the Windows bridge until that pack is in. This section is the same inputs in build order.

Audited 2026-08-14 against `PORTAL_PLAN.md` Phase 8 / 9.5 (including R49/D15/D16 and the R51/D17 company-file rule). In rough order of when each is needed.

**Before anything is installed on the QuickBooks PC (the only real blockers today):**

1. **Which computer runs QuickBooks Desktop.** Confirm the office PC that has the company file, that we can install the bridge on it, and how regularly it can stay powered on (always-on is ideal but not required; the queue tolerates downtime). We will also need a way to do the install: remote access or an on-site session.
2. **The exact QuickBooks Desktop version.** Press F2 inside QuickBooks and read off the product line (Pro/Premier/Enterprise), the year, the release (for example "R16"), and confirm it is the Canadian edition. The connector SDK needs QuickBooks Canada 2023 R16 or newer (or 2024 R18+). If the install is older, a QuickBooks update comes first.
3. **Company file hygiene (do this before the install session).** Inventory every company file on that PC. Live today: `C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\McKee Security July 14.QBW`. TSheets is not pinned to that name; it follows the open file. Before making the test copy:
   - Move the retired `McKee Security` company file (last used 2025-07-14) into an Archive folder so it cannot be opened by accident.
   - Optionally rename July 14 to a clear live name only after that archive, then open the new name and watch one TSheets sync go green.
   - With live open, create a complete local backup.
   - Restore that backup as a **new** file in a **different folder**, named so nobody can mistake it (for example `McKee Security PORTAL-TEST do-not-invoice.qbw`).
   - Open the copy and change its Company Name so the QuickBooks title bar says PORTAL TEST. While it is open, uncheck TSheets Auto-Run or exit Web Connector.
   - Close the copy, reopen live, turn Auto-Run back on, and confirm TSheets still syncs.
   - Never add TSheets, payroll, or any Web Connector app to the copy.
   - Write down both full file paths and send them over.
   QuickBooks can open only one file at a time. Keep copy-open sessions short or after hours.
4. **One-time permission inside QuickBooks.** When the bridge first connects (to the **copy**), QuickBooks pops up an "allow this application?" prompt that an admin user must approve (ideally "even when QuickBooks is not running"). The same prompt happens again at 8C when we point the bridge at live. Just be aware those two moments are coming.

**For the bulk import (after R54, R53, and CUA, against the copy):**

5. **The shape of the customer list.** Roughly how many active monitoring customers, whether each client is one QuickBooks customer record (or whether some are split into jobs/sub-customers or duplicated), and any known messes worth flagging up front.
6. **The monitoring item names.** What the line items on a typical monitoring invoice are called in QuickBooks (for example "Annual Monitoring - Cellular"). The billed amount is the primary tier signal, but these names are the confirmation, so an accurate list makes the import review mostly pre-correct.
7. **The Lanvac contact-list export and API (done).** Full Excel is in hand. API contract ingested and write-tested 2026-08-16 on `O5985`. Thank-you email sent. Vercel env set (does not turn on writes). Official city is the live Ontario directory string. Portal station fields are shipped; the `fullupdate` write is later. Emails stay. This does not block QuickBooks work.
8. **Device notes from the QuickBooks To Do list (already sampled).** Typical wording is in `ACCOUNTING_GATHER_DATA.md`. The full list is pulled automatically when the import runs; you do not export it for the bookkeeper sitting. After import, the portal owns the device list and QuickBooks To Dos are left behind.
9. **A review pass on the import itself.** When the import screen is ready, you (or whoever knows the accounts best) spot-check the drafted tiers, amounts, **monitoring start dates** (the inferred first-invoice dates, especially on long-standing accounts), due dates, contacts, and devices before committing. Budget an hour or two; this is the human gate that makes the seeding trustworthy. When you later type a customer in by hand, enter that same start date — not the invitation or activation date. Importing from the copy is safe: backup/restore keeps the same customer IDs, so those links still match the live file later.

**For VoIP (the portal rate card is live; catalog prices resolve themselves in Stripe):**

10. **The live VoIP customers, entered by hand.** You chose to do this yourself **when Stripe goes live** (with 8C): Pirocchi (residential), Haliburton Auto (commercial, 1 number 1 seat), Currie (residential). Vision Care only if they accept the quote (commercial, 2 numbers 1 seat, `$64.98`). Create each via the normal create-client form. During 8A they get linked to their QuickBooks customer records. Turn off Pirocchi's annual memorized VoIP invoice when portal monthly billing starts.
11. **The VoIP item names in QuickBooks.** Create `VoIP - Residential`, `VoIP - Commercial`, and `VoIP - Number Port Fee` on **4000 · Product Sales**, tax H. Then make `VoIP Phone Service` inactive. Do not rename `Annual Monitoring`. Do not add a VoIP Income account. Leave old invoices alone, then make the test copy. Exact steps are in `ACCOUNTING_GATHER.md` section 2.
12. **BrightPBX DID (number) cost, when they confirm it.** Seat cost is already $5.95 per user per month. DID cost is treated as $0.00 and flagged unconfirmed. This is internal margin only and never appears on a client document. Nothing is blocked on it. VoIP Stripe prices (including the port fee) are found by marker; you do not paste those IDs into Vercel.

**Before 8C (posting to the real books):**

13. **First live card post, inspected.** Mapping is already locked (sales receipt, 4000 + classes, `*Stripe` / CIBC / 5800, pre-tax + HST). After the first real card payment posts, someone who knows the books looks at that sales receipt and the payout before we turn the queue loose. Payment-method names for e-transfer / cheque / cash still come from the live file (see `ACCOUNTING_GATHER.md`).
14. **The Stripe go-live package.** 8C is when test mode should switch to live mode so the first real card payment posts to the books. That needs: live-mode monitoring prices in Vercel, the live webhook registered, and a permanent restricted live key in Vercel replacing the CLI session key (which expires 2026-10-03). VoIP live prices are found or created by marker when the live key is in place (re-run `stripe-voip-setup.mjs` if you want them created ahead of the first checkout). Your part is approving the switch and updating the Vercel secret/webhook/monitoring prices. This is also the moment you enter the live VoIP customers (item 10).
15. **Turn on client email, last.** The Billing tab has a `GO LIVE` confirm. Until you type that, imported customers do not get invitations, payment reminders, receipts, or other portal mail (staff alerts still send). Do this only after the station layer (R54), multi-site (R53), and the CUA test, the import is checked, **organization grouping is signed off**, the portal is working, and the bridge is on the live QuickBooks file, not PORTAL-TEST. You can pause it again anytime.

**Before any monitoring profitability view (not needed to start 8A, and not needed to post payments in 8C):**

16. **The day each monitoring customer first started being monitored.** The import will guess this from their earliest monitoring invoice; you confirm it on the review screen. For anyone you type in by hand, enter it on the create-client form. Invitation and activation dates stay on the client page as portal-access history — they are not a substitute.
17. **What it costs McKee per monitored client, for each current tier** (Telephone Land Line, Cellular Communicator, Cellular + Total Connect, Cellular + Total Connect + Home Automation). This is the monitoring-station / communicator cost you pay, not the retail price the customer pays. Same idea as the Starlink Profit tab's monthly kit costs: dated rates so a later change does not rewrite past years. We cannot build a trustworthy year-over-year monitoring P&L without this. Do not invent numbers to unblock posting — posting does not wait on it.

Everything else in Phase 8 is built and tested on our side. These seventeen items are the complete list of stakeholder inputs. **Items 1, 2, and 3 block the Windows install.** Cloud work (database tables, Accounting tab, import screens) can start as soon as you want; it does not touch QuickBooks. Item 15 is the last customer-facing switch and stays off through import. The station layer (R54), multi-site accounts (R53), and the CUA test come before the Windows install sitting.
