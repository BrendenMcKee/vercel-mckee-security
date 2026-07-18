# How the Accounting System Will Work (Plain-Language Guide)

**Last updated:** 2026-07-18 (revised for the VoIP phone service, which is now live in the portal)
**Who this is for:** Anyone at McKee Security (including the bookkeeper) who wants to understand how the portal and QuickBooks Desktop will work together, without reading technical documents.
**Technical companion:** `PORTAL_PLAN.md` Sections 9.5 and 9.6 and the Phase 8/9 checklists in Section 10 are the authoritative build spec. This document explains the same design in plain language. If the two ever disagree, `PORTAL_PLAN.md` wins.

---

## 1. The one-paragraph version

The customer portal handles everything customers and admins touch day to day: accounts, monitoring tiers, VoIP phone plans, due dates, reminders, card autopay, and recording cash/cheque/e-transfer payments. QuickBooks Desktop stays exactly what it is today, the official books. A small connector program (the "bridge") on the office QuickBooks computer keeps the two in sync automatically: every payment the portal takes gets posted into QuickBooks without anyone typing it in, and any payment the bookkeeper types straight into QuickBooks flows back to the portal so reminders stop and the customer's account stays accurate. Nothing posts to the books without built-in safety checks, and anything ambiguous stops and asks a human instead of guessing. Everything in this document applies to every billable service the portal offers, monitoring and VoIP alike; where VoIP needs a special word, it gets one explicitly.

---

## 2. The pieces, in plain language

**The portal (already built, running on Vercel and Supabase).** Where admins manage clients, tiers, due dates, devices, and payments, and where clients see their account, alarm contact list, and payment history. It sends all the reminder and confirmation emails. As of 2026-07-18 it also carries the **VoIP phone service**: a Residential plan ($34.99/month plus HST) and a Business plan ($59.99/month plus HST), both **priced per line** and both on the same autopay and manual rails as monitoring. VoIP bills monthly (monitoring bills annually), and the portal tracks each customer's number of lines and bills rate times lines automatically, including on the customer's card subscription.

**QuickBooks Desktop (unchanged).** The official financial record. It keeps working exactly as it does now. The bookkeeper can keep doing anything they do today; the automation works around them, not instead of them.

**The bridge (to be built, Phase 8A).** A small Windows program installed on the office computer that runs QuickBooks. It is the only new thing that lives in the office. It calls out to the portal's servers over the internet, asks "anything for me to do?", does the work inside QuickBooks, and reports back. Important properties:

- It only makes outbound connections. Nothing on the office network is opened up to the internet. This is the same trust model already used by the camera gateways.
- If the computer is off, nothing breaks. Work queues up in the cloud and the bridge catches up the next time the computer is on. The portal and website never depend on the office PC being awake.
- It only accepts a short list of named operations (record a payment, create a customer, and so on). It can never be asked to do something open-ended to the books.

**The mirrors (Phase 8A).** The bridge regularly copies a read-only snapshot of the QuickBooks customer list, invoices, and payments up to the portal's database. That means admins (and later the AI assistant) can look at "what do the books say?" from anywhere, any time, even when the office PC is off, without touching QuickBooks itself. Mirrors are a copy for reading; changing a mirror is impossible, and mirrors never overwrite portal data.

**The task queue (Phase 8B).** A to-do list in the cloud that is the only way anything gets written into QuickBooks. Every entry says exactly what to do ("record a $419.33 payment from Jane Smith"), carries a fingerprint so the same payment can never be posted twice even if a glitch replays it, and moves through checked states: pending, approved, posted, or needs review. Anything that fails or looks ambiguous parks in "needs review" on the admin Accounting tab with a plain explanation and suggested fixes.

**The AI accounting assistant (Phase 8D, the MCP server).** Once the plumbing above is trusted, staff can ask questions in plain English from Cursor: "who owes us money?", "what did monitoring bring in last quarter?", "draft a collection email for overdue accounts". It answers from the mirrors, so it works even when the office PC is off. It is rolled out in three deliberate stages: read-only questions first, then drafting (drafts post nothing), then payment posting that still requires admin approval in the portal. It can never void, delete, journal, or touch payroll or closed periods. Those operations simply do not exist in its vocabulary.

---

## 3. How a payment flows (the four stories)

These stories read the same whether the payment is for monitoring or for VoIP. The queue, the fingerprints, and the safety checks do not care which service the money is for; the only difference is which income line it lands on in the books (Section 4) and that VoIP renews monthly instead of annually.

**Story 1: Card autopay (Stripe).** The customer's card is charged automatically on their renewal date. Stripe tells the portal, the portal records it in the customer's payment history, advances their next due date, and drops a task in the queue. The bridge posts it into QuickBooks against that customer. Nobody touches anything. QuickBooks never sees a card payment first; these always originate in the portal.

**Story 2: Cheque, cash, or e-transfer recorded in the portal (the preferred way).** A customer pays the legacy way. The admin opens their page and clicks "record payment". Reminders stop, the due date advances, the customer gets a confirmation email, and a task posts the payment into QuickBooks automatically. This is the recommended habit: record it in the portal and the books take care of themselves.

**Story 3: A payment keyed straight into QuickBooks (the supported fallback).** If someone forgets the portal and the bookkeeper enters a cheque directly into QuickBooks, the bridge notices it on its next pass and sends it up. The portal checks it is genuinely new (see the safety rails below), then applies it exactly as if an admin had recorded it: payment history entry, due date advanced, reminders stopped. So a payment recorded in either system ends up correctly in both.

**Story 4: The same cheque entered in both places.** The one genuinely tricky case: an admin records a cheque in the portal and the bookkeeper also types the same cheque into QuickBooks before the sync runs. The system watches for this specifically. Before anything auto-posts in either direction, it checks the other system for a payment from the same customer for the same amount within about a week. If it finds one, it does not guess: the payment parks in "needs review" with the question spelled out ("was this cheque already keyed into QuickBooks?"), and an admin resolves it with one click. The same payment can never double-post to the books or push a customer's due date forward twice.

**The hierarchy in one breath:** card payments always start in the portal; legacy payments preferably start in the portal but starting in QuickBooks is fine too; whichever system hears about a payment first tells the other exactly once; and if both hear about it independently, a human decides.

---

## 4. Do we still send invoices from QuickBooks? No.

Today, monitoring and VoIP bills are created in QuickBooks and emailed to customers from there. Once this system is live, that stops entirely:

- **The portal sends every customer-facing billing email.** Renewal reminders for legacy payers (amount, due date, how to pay) go out automatically on the schedule already built. Customers on autopay get charged automatically and receive receipts. Payment confirmations come from the portal. During the migration, the reminder email doubles as the invitation to activate their portal account.
- **QuickBooks becomes internal-only.** Whatever documents exist inside QuickBooks (sales receipts or invoices with payments against them) are created by the automation for the bookkeeper and the accountant. No human creates them, and nobody emails them to customers.
- **The bookkeeper still chooses how revenue is recorded.** Part of the Phase 8C bookkeeper session is choosing between the two standard QuickBooks patterns: a sales receipt per payment (simplest), or an invoice plus a payment against it (keeps accounts-receivable aging inside QuickBooks). Either way the automation does the typing. This choice affects only how the books look internally, never what customers see. The same session decides where each service's revenue lands: monitoring income and VoIP income are mapped separately, so "what did VoIP bring in?" is always answerable straight from the books (and later from the AI assistant).
- **Both systems always show received payments.** The portal shows every payment in the customer's history and on the admin Billing tab, with a per-payment sync status showing whether it has landed in QuickBooks yet. QuickBooks shows the same payments as proper accounting entries. That is the whole point of the two-way payment sync.

---

## 5. Getting in alignment on day one (the bulk import)

Before customers are invited to anything, the portal is seeded from QuickBooks so both systems agree completely:

1. The bridge mirrors the full customer list and invoice history to the cloud.
2. An "Import from QuickBooks" screen builds a draft for every active monitoring customer: name and email from QuickBooks, plus a best guess at their monitoring tier, annual amount, and next due date, read from their actual invoice history.
3. **The tier guess works from the price first.** The four monitoring tiers bill at four different annual amounts, so the dollars on a customer's last invoice identify their tier almost perfectly; the invoice line-item names confirm it. A customer whose billed amount matches no current tier price (an old grandfathered rate) is flagged for a closer look, and the import keeps the amount they actually pay. **Nobody's price changes because of the import.** Moving someone from an old rate to current pricing is always a deliberate decision, never a side effect.
4. **A human reviews every row before anything is created.** The guesses only pre-fill the screen; the admin confirms or corrects each customer, then commits.
5. Committing creates each customer in the portal, already linked to their QuickBooks record, on the legacy payment rail with their true amount and due date. **No emails are sent by the import.** Running the import again is safe; already-imported customers are skipped, so duplicates are impossible.

**The import also brings in more than billing:**

- **Alarm contact lists (caller ID) come from Lanvac.** The monitoring station holds the real contact lists and passcodes, so we request a full export from Lanvac. If they can give us a usable file, a one-time importer loads each customer's contacts and passcodes into the portal quietly (no emails go out during seeding); if not, contacts are entered by hand per customer. When each customer later activates their account, the invitation asks them to review their alarm contact list, so first login doubles as the check that the imported list is right.
- **Device and battery records come from the QuickBooks to-do list**, where they are tracked today. The bridge reads the to-do list along with everything else, and the import turns those notes into draft device entries (what it is, which customer, when it was installed or is due) for the same review screen. Since to-do notes are freeform text, the drafts are suggestions to confirm, not automatic truth, and we will calibrate against a few real sample entries first.
- **A per-customer migration checklist** shows exactly where each imported customer stands: imported, alarm contacts entered, devices entered, invited, activated. Whether something is "done or not" is always visible on their page and filterable on the Billing tab; it never depends on anyone's memory.

**VoIP customers are not part of the bulk import.** There are exactly two today (one residential, one commercial on the Business plan), so the import machinery is deliberately not extended to them. You will enter both by hand through the normal create-client form (you chose to do this when Stripe goes live), with their real plan, line count, amount, and next due date, and then link each to their QuickBooks customer record with the same one-click linking screen the monitoring import uses. From that moment their payments flow through every story in Section 3 like anyone else's.

The result: the admin Billing tab shows the entire business's real renewal calendar from day one, before a single customer has touched the portal. Reminders, the collections board, and the books all agree from the start.

---

## 6. Migrating customers, one at a time

Everyone imported starts on the legacy rail (cash, cheque, e-transfer), because that is the truth of where they are today. The migration to the new system is gradual and personal:

- **The system finds who is next.** Each day it flags imported customers whose renewal is coming up and who have never been invited. They appear in an "invite queue" on the Billing tab and in the daily digest email, so no renewal slips by without a decision.
- **One click sends the invitation.** The email is a combined renewal notice and account invitation: amount due, due date, how to pay today the old way (paying is never blocked on signing up), their personal activation link, and the pitch for autopay.
- **The team sees everything.** Every invitation is also delivered to the McKee inbox, so staff see exactly what the customer received, and replies from the customer land at info@mckeesecurity.ca as a normal email conversation. Each customer's row shows when they were invited and whether they have activated, so "invited two weeks ago, not activated, renewal in ten days" is visible and actionable.
- **Activation never forces autopay.** A customer can activate and keep paying by e-transfer forever. Autopay is strongly encouraged in the copy and in the portal, but it is a sell, not a gate. When they do switch, their payments become Story 1 and flow completely hands-free.
- Customers who never activate still get reminders, still appear on the collections board, and their payments still post to the books. Full alignment does not depend on customer participation.

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

- **Already done (2026-07-18): VoIP in the portal.** Before any accounting automation is built, the VoIP service was fully implemented on the website and in Stripe, the same way monitoring was. This was deliberate: the accounting rail below is being designed against the complete service catalog, not retrofitted for VoIP later.
- **8A: Bridge and mirrors.** Install the bridge, mirror QuickBooks into the cloud (read-only), build the linking and bulk-import screens, run the import. Built and tested against a QuickBooks *sample* company file first; the real books are not touched.
- **8B: The task queue.** The to-do list, the state machine, the approval screens, the Accounting tab. Still against the sample file.
- **8C: Payments post to the books.** The bookkeeper mapping session happens (monitoring and VoIP income both mapped), the bridge points at the real company file, both payment rails start posting automatically, history is backfilled, and the reverse sync (QuickBooks to portal) plus the duplicate-entry guard go live. Stripe's switch from test mode to live mode ideally lands here, so the first real card payment posts to the books automatically.
- **8D: The AI assistant.** Read-only questions first, sign-off, then drafting, sign-off, then approval-gated posting.

Each stage has a test gate that must pass before the next begins, and the stakeholder checkpoints are built into the checklist in `PORTAL_PLAN.md` Section 10.

---

## 10. What we need from you to build this

Audited 2026-07-18 against every stakeholder checkpoint in the `PORTAL_PLAN.md` Phase 8 and Phase 9 checklists, so this list is the complete set. In rough order of when each is needed:

**To start 8A (needed first; items 1 and 2 are the only blockers today):**

1. **Which computer runs QuickBooks Desktop.** Confirm the office PC that has the company file, that we can install the bridge on it, and how regularly it can stay powered on (always-on is ideal but not required; the queue tolerates downtime). We will also need a way to do the install: remote access or an on-site session.
2. **The exact QuickBooks Desktop version.** Press F2 inside QuickBooks and read off the product line (Pro/Premier/Enterprise), the year, the release (for example "R16"), and confirm it is the Canadian edition. The connector SDK needs QuickBooks Canada 2023 R16 or newer (or 2024 R18+). If the install is older, a QuickBooks update comes first.
3. **One-time permission inside QuickBooks.** When the bridge first connects, QuickBooks pops up an "allow this application?" prompt that an admin user must approve (ideally "even when QuickBooks is not running"). Just be aware this moment is coming during the install session.

**For the bulk import (during 8A):**

4. **The shape of the customer list.** Roughly how many active monitoring customers, whether each client is one QuickBooks customer record (or whether some are split into jobs/sub-customers or duplicated), and any known messes worth flagging up front.
5. **The monitoring item names.** What the line items on a typical monitoring invoice are called in QuickBooks (for example "Annual Monitoring - Cellular"). The billed amount is the primary tier signal, but these names are the confirmation, so an accurate list makes the import review mostly pre-correct.
6. **The Lanvac contact-list export.** Ask Lanvac for a bulk export of every account's caller ID list: names, phone numbers, passcodes, and call order. Whatever format they can provide decides whether we import it automatically or enter contacts by hand, so even a "here's what they can give us" answer moves this forward.
7. **A few sample to-do entries.** Copy the text of three or four typical device/battery entries from the QuickBooks company to-do list (exact wording and dates). The import parses those notes into draft device records, and real samples are how we make the parser match how they were actually written.
8. **A review pass on the import itself.** When the import screen is ready, you (or whoever knows the accounts best) spot-check the drafted tiers, amounts, due dates, contacts, and devices before committing. Budget an hour or two; this is the human gate that makes the seeding trustworthy.

**For VoIP (the portal side is already live; env vars are already in Vercel):**

9. **The two VoIP customers, entered by hand.** You chose to do this yourself **when Stripe goes live** (with 8C): create the residential customer on the Residential plan and the commercial customer on the Business plan, each with their real line count and true next payment date, via the normal create-client form. During 8A they get linked to their QuickBooks customer records like everyone else.
10. **The VoIP item names in QuickBooks.** What the line items on the two customers' VoIP invoices are called today (the VoIP equivalent of item 5). This is how the automation posts VoIP revenue against the right items instead of monitoring ones.
11. **A decision checkpoint on VoIP pricing, only when you are ready.** Current pricing (both plans per line) is treated as interim. Nothing is blocked on this; when the tier structure firms up, plans and prices are extended the same way any catalog change is.

**Before 8C (posting to the real books):**

12. **A session with the bookkeeper.** One sitting to agree the account mapping: which income accounts monitoring and VoIP each land in, how Stripe fees are recorded, how HST is handled, which bank/clearing accounts payments deposit to, and the sales-receipt versus invoice-plus-payment choice from Section 4. Their answers become the posting rules; nothing touches the live file before this.
13. **The Stripe go-live package.** 8C is when test mode should switch to live mode so the first real card payment posts to the books. That needs: live-mode products/prices created (a script re-run, monitoring and VoIP together), the live webhook registered, and a permanent restricted live key in Vercel replacing the CLI session key (which expires 2026-10-03). Mostly done for you by scripts; your part is approving the switch and updating the Vercel values. This is also the moment you enter the two VoIP customers (item 9).

**Nice to have:**

14. **A recent backup copy of the company file.** Development runs against a QuickBooks sample company, but a backup copy lets us rehearse the bulk import and the backfill against realistic data before doing it for real.

Everything else in Phase 8 is built and tested on our side without needing anything from you; these fourteen items are the complete list of stakeholder inputs, and only items 1 and 2 block starting Phase 8A today.
