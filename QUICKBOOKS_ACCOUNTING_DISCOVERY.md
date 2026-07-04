# QuickBooks Desktop Integration — Research & Discovery Overview

**Organization:** McKee Security & Audio Systems  
**Purpose:** Preserve detailed accounting integration research on file and align it with McKee's **actual platform** (Next.js portal, Supabase, Vercel, optional Cloud Run, Stripe, MCP/agent workflows).  
**Companion document:** [`PRODUCT_HANDOVER.md`](./PRODUCT_HANDOVER.md) — [Section 23](./PRODUCT_HANDOVER.md#23-quickbooks-integration--portal-scope--future-roadmap) defines **what is in scope for the current portal build** vs this document's **full future vision**.

**Document type:** Research archive and long-term architectural overview — **not** the current portal implementation spec. The **natural-language accounting agent and full MCP tool suite** described here are projected as a **separate future product**. The current portal handover targets core services first (Sections 1–22); optional QuickBooks **plumbing** (bridge, queue, payment posting) is follow-on Scope B in Section 23.

**Last updated:** July 2026

---

## How This Document Relates to the Main Platform

McKee's **long-term vision** connects the client portal to QuickBooks through a shared cloud queue and (eventually) an MCP-based accounting agent. **That full vision is not the current portal MVP.**

| Document | Scope |
|----------|--------|
| **`PRODUCT_HANDOVER.md` Sections 1–22** | **Current build:** client/admin portal, Stripe in portal, core services |
| **`PRODUCT_HANDOVER.md` Section 23 Scope B** | **Follow-on:** bridge, task queue, Stripe → QB payment posting, admin sync UI |
| **This document (full detail)** | **Future product:** NL accounting agent, MCP tools, batch billing, collections, reporting |

| Layer | What it is | Tech (McKee's stack) |
|-------|------------|----------------------|
| **Client experience** | Multi-product portal on `mckeesecurity.ca` — monitoring, cloud backup, caller ID, devices, payments | Next.js + TypeScript on **Vercel** (site already migrated off WordPress) |
| **Identity & data** | Auth, profiles, services, billing mirrors, task queue, audit logs | **Supabase** (PostgreSQL + Auth + RLS) |
| **Heavy backend** | Stripe webhooks, MCP API, long-running jobs, optional AWS Arctic footage | **Google Cloud Run** or Vercel server functions (team decides per workload) |
| **Accounting** | QuickBooks Desktop Canada — **system of record**, not replaced | **Local Windows bridge** + Desktop SDK / qbXML |
| **Admin efficiency** | Natural-language assistant, approvals, collections drafts *(future product)* | **Custom MCP server** → Cloud API → queue → bridge |

This document focuses on the **accounting and automation** slice—especially the **full future MCP/agent scope**. Payment flows in the portal (Stripe Checkout) should eventually feed the cloud queue described here; **building that queue is follow-on work**, not a blocker for portal MVP.

---

## Table of Contents

1. [Project Goal](#1-project-goal)
2. [Strategic Principles](#2-strategic-principles)
3. [Core Technical Discovery (Intuit Desktop SDK)](#3-core-technical-discovery-intuit-desktop-sdk)
4. [Recommended Architecture (Aligned to McKee's Stack)](#4-recommended-architecture-aligned-to-mckees-stack)
5. [Why a Cloud Queue Is Required](#5-why-a-cloud-queue-is-required)
6. [Local QuickBooks Bridge](#6-local-quickbooks-bridge)
7. [Web Connector Alternative](#7-web-connector-alternative)
8. [Stripe & Portal Payment Integration](#8-stripe--portal-payment-integration)
9. [Monitoring Billing Flows](#9-monitoring-billing-flows)
10. [Stripe Reconciliation Design](#10-stripe-reconciliation-design)
11. [Monitoring Automation Priority](#11-monitoring-automation-priority)
12. [MCP Server Role](#12-mcp-server-role)
13. [Permission Model](#13-permission-model)
14. [Offline Queue & Task Records](#14-offline-queue--task-records)
15. [Idempotency](#15-idempotency)
16. [Conflict Handling](#16-conflict-handling)
17. [Data Sync Strategy](#17-data-sync-strategy)
18. [Estimate & Invoice Automation](#18-estimate--invoice-automation)
19. [Collections Automation](#19-collections-automation)
20. [Reporting Automation](#20-reporting-automation)
21. [Natural-Language QuickBooks Agent](#21-natural-language-quickbooks-agent)
22. [Suggested Build Phases](#22-suggested-build-phases)
23. [Best Overall Recommendation](#23-best-overall-recommendation)
24. [Human Checkpoints & Agent Access](#24-human-checkpoints--agent-access)
25. [Open Questions](#25-open-questions)

---

## 1. Project Goal

McKee Security & Audio Systems wants a **custom automation layer** around **QuickBooks Desktop** so that:

- The **customer/admin portal** on `mckeesecurity.ca` can drive billing and payment workflows
- **Stripe** can reliably collect monitoring and service fees online
- **Internal AI tools** (via MCP) can assist staff with lookups, drafts, and approved posting actions
- **Administrative workload** drops dramatically through queueing, automation, and agentic workflows

**McKee will continue using QuickBooks Desktop** — there is no plan to migrate core accounting to QuickBooks Online or another cloud accounting platform for this initiative.

The integration target is a **controlled QuickBooks Desktop MCP-style bridge**: customer lookup, estimates, invoices, payments, monitoring billing, collections, reporting, and Stripe payment automation — with strict safety gates, not unrestricted AI access to the company file.

**Highest-priority business workflow:** Automate **alarm monitoring billing and payment collection** through the website (Stripe Checkout, credit card, and other Stripe-supported methods), with reliable posting into QuickBooks Desktop when the office system is available.

---

## 2. Strategic Principles

| Principle | Meaning |
|-----------|---------|
| **QuickBooks wins on posted financials** | The company file is the accounting authority; cloud systems mirror and queue |
| **Portal never blocked by office PC** | Stripe payments and portal status update even when QuickBooks Desktop is off |
| **Webhooks over success pages** | Stripe webhook handlers confirm payment — not the client redirect alone |
| **No unrestricted AI writes** | Agents use MCP tools → Cloud API → predefined commands → queue → bridge |
| **Approve before post** | Sensitive accounting writes require explicit human approval and audit trail |
| **Minimize admin clicking** | Batch monitoring invoices, payment links, AR views, draft collections |
| **Team freedom on implementation** | Bridge language, exact schemas, and hosting splits are developer decisions |

---

## 3. Core Technical Discovery (Intuit Desktop SDK)

QuickBooks Desktop integrates with custom software through **Intuit's Desktop SDK**, which uses **qbXML** messages to send requests and receive responses. The Desktop API reference documents available qbXML messages and objects.

**Deployment pattern (Intuit):** Applications typically run on the **same machine** as QuickBooks Desktop, or in some cases on the **same local area network**, communicating via qbXML.

**Current SDK (discovery, July 2026):**

| Item | Detail |
|------|--------|
| **SDK version** | Desktop SDK **17.0** (64-bit support available) |
| **QB compatibility** | QuickBooks Desktop 2002 and later; includes Enterprise Solutions |
| **Supported versions cited** | QuickBooks 2024 R18+, QuickBooks 2023 R16+ |
| **qbXML spec** | Version 17.0 |
| **Editions** | **U.S. and Canadian** — McKee uses **QuickBooks Desktop Canada** |

The local bridge on McKee's QuickBooks PC is the **only** component that should speak qbXML to the live company file.

---

## 4. Recommended Architecture (Aligned to McKee's Stack)

### Hybrid local + cloud

The QuickBooks Desktop **company file** remains the official accounting system of record. A **local bridge** on the main Windows desktop (where the live file is normally opened) handles all SDK communication. The **cloud layer** — built on McKee's existing modern stack — handles portal events, Stripe webhooks, AI/MCP requests, queueing, logging, and pending tasks when QuickBooks is offline.

```
mckeesecurity.ca — Next.js client & admin portal (Vercel)
        ↓
Supabase Auth + PostgreSQL (profiles, services, mirrored QB data, task queue, RLS)
        ↓
Cloud Management API (Vercel server routes and/or Google Cloud Run)
        ↓
Stripe webhooks · MCP tool endpoints · scheduled sync jobs
        ↓
Durable task queue + idempotency + audit log + needs_review
        ↓
Local QuickBooks Desktop Bridge (Windows — office PC)
        ↓
QuickBooks Desktop Company File (Canada)
```

### Component mapping

| Component | McKee stack | Responsibility |
|-----------|-------------|----------------|
| **Customer portal** | Next.js on Vercel | Monitoring/cloud payments, billing status display |
| **Admin dashboard** | Next.js on Vercel | Task queue, approvals, AR views, agent UI |
| **Primary database** | Supabase PostgreSQL | Task queue tables, customer mirrors, monitoring billing profiles, sync state |
| **Auth & admin RLS** | Supabase Auth + RLS | Only authorized staff see financial/queue data |
| **Webhooks** | Cloud Run or Vercel | Stripe signature verification, enqueue QB tasks |
| **MCP server** | Cloud-hosted (team choice) | Structured tools for Cursor/agents — calls Cloud API only |
| **Local bridge** | Windows on QB machine | Poll queue, execute qbXML, sync mirrors, report results |
| **QuickBooks Desktop** | Office Windows PC | System of record |

The local bridge should run on the **main QuickBooks Desktop computer** — wherever the live company file is normally managed — unless McKee standardizes a dedicated always-on office machine for this purpose (see [Open Questions](#25-open-questions)).

---

## 5. Why a Cloud Queue Is Required

The QuickBooks Desktop computer is **not online 24/7**. The system must **not** assume immediate writes to QuickBooks.

Instead, Supabase (or equivalent cloud store) maintains a **durable ledger of pending QuickBooks tasks**.

**Example task types:**

- Create monitoring invoice
- Create or update customer
- Record Stripe payment
- Mark invoice paid
- Create estimate
- Create purchase order
- Sync customer balance
- Generate AR aging summary

**Task state machine:**

```
pending
  → validated
  → ready_for_quickbooks
  → in_progress
  → posted_to_quickbooks | failed | needs_review | cancelled
```

**Offline behavior:**

1. Customer pays on portal; Stripe webhook hits cloud API
2. Cloud records payment and portal status **immediately**
3. Cloud creates pending QuickBooks task(s)
4. QuickBooks PC is off — tasks wait
5. Bridge comes online, polls queue, processes in order
6. Bridge posts to QuickBooks, returns TxnIDs / errors
7. Cloud updates task status; admin dashboard reflects `posted_to_quickbooks`

The website and payment system **must not fail** because the office desktop is powered off.

---

## 6. Local QuickBooks Bridge

A small **Windows application or background service** on the QuickBooks machine.

### Primary responsibilities

1. Authenticate to the cloud management API (secure token; no secrets in QB file)
2. Poll for pending QuickBooks tasks (or wake on notification)
3. Validate task payloads against **predefined commands** before touching QuickBooks
4. Send qbXML requests to QuickBooks Desktop
5. Receive qbXML responses
6. Persist QuickBooks ListIDs, TxnIDs, EditSequences, timestamps, errors (cloud + optional local cache)
7. Report success/failure back to cloud
8. Periodically sync read-only mirrors (customers, open invoices, balances) to Supabase

### Design rule

The bridge must **not** allow the website or AI agent to freely modify QuickBooks. All writes go through **named, validated commands**.

**Example command families:**

```
customer.query | customer.create | customer.update
invoice.create | invoice.query
receive_payment.create
estimate.create | estimate.update
item.query
vendor.query
report.ar_aging | report.profit_and_loss | report.sales_by_customer
```

Implementation language is a **team choice** (common: C#/.NET with Intuit SDK; Node or other if supported).

---

## 7. Web Connector Alternative

**QuickBooks Web Connector** is Intuit's Windows app that lets web services exchange data with QuickBooks Desktop (same machine or LAN).

| Approach | Guidance |
|----------|----------|
| **Preferred** | Custom local Windows bridge using Desktop SDK / qbXML directly |
| **Alternative** | Web Connector polling a cloud web service |
| **Avoid as primary** | Screen automation / RPA on QuickBooks UI |

Web Connector remains valid if the team prefers Intuit's polling model; McKee's safety requirements (queue, approvals, idempotency) still apply either way.

---

## 8. Stripe & Portal Payment Integration

Monitoring automation is the **top payment priority**. The portal (built into `mckeesecurity.ca`) should let customers pay monitoring fees through **Stripe Checkout** — hosted, low-friction, supports cards and other Stripe payment methods.

### Integration points with McKee's portal

| Portal feature | Stripe / QB behavior |
|----------------|---------------------|
| Security monitoring — Pay Now | Checkout for admin-assigned tier; tier validated server-side before session creation |
| Cloud backup — Change Plan | Same webhook → queue pattern |
| Post-payment UX | Dashboard success state; show **accounting sync pending** if QB bridge offline |
| Admin view | Stripe captured vs QuickBooks posted status |

### Webhooks are mandatory

- Stripe pushes real-time events to a **cloud endpoint** (Cloud Run or Vercel with raw body handling)
- Handle `checkout.session.completed`, payment failures, subscription status changes, etc.
- **Webhook = source of truth** for payment success — not the client-side success redirect alone
- Validated events update Supabase portal records **and** enqueue QuickBooks tasks

---

## 9. Monitoring Billing Flows

### Scenario A — Customer pays annual monitoring through portal

1. Customer visits monitoring payment (portal or dedicated pay flow)
2. Customer identity / account linked (logged-in portal user or validated account reference)
3. Website creates **Stripe Checkout Session** (server-side)
4. Customer pays by card or supported method
5. Stripe sends webhook to cloud management API
6. Cloud validates signature + idempotency
7. Cloud updates portal billing status; creates pending QB task: **Record monitoring payment**
8. If needed, cloud also enqueues: **Create monitoring invoice**
9. Local bridge pulls tasks when online
10. Bridge finds or creates customer in QuickBooks
11. Bridge creates invoice or sales receipt (per bookkeeper-approved design)
12. Bridge records payment in QuickBooks
13. Bridge marks task `posted_to_quickbooks`
14. Portal and admin dashboard show account as paid / synced

### Scenario B — QuickBooks invoice exists first

1. Invoice created in QuickBooks (manually or via approved batch task)
2. Invoice metadata syncs to Supabase / portal
3. Customer opens payment link from email or portal
4. Customer pays through Stripe
5. Webhook confirms payment
6. Cloud enqueues **ReceivePayment** task against matching invoice
7. Bridge posts payment when online
8. Task completes; portal reflects paid status

### Scenario C — Desktop offline when customer pays

1. Customer pays through Stripe
2. Webhook reaches cloud — payment recorded immediately in Supabase
3. Portal shows paid (or paid pending accounting sync)
4. Pending QB posting task created
5. Task waits while QuickBooks desktop is offline
6. Desktop reconnects; bridge drains queue
7. Bridge posts payment/invoice
8. Cloud marks `posted_to_quickbooks`

This is the correct model for McKee: **customers and staff act anytime; QuickBooks catches up when the office system is available.**

---

## 10. Stripe Reconciliation Design

Design reconciliation carefully — **confirm exact GL accounts with McKee's bookkeeper before automating posts.**

### Recommended pattern

```
Customer pays $339.00 monitoring fee via Stripe
        ↓
QuickBooks records gross customer payment / invoice at full amount
        ↓
Stripe processing fee recorded separately
        ↓
Net Stripe payout reconciled to bank deposit
```

### Typical account structure (names to be confirmed)

- Stripe Clearing
- Stripe Fees
- Bank Account
- Monitoring Income
- HST Payable (Canada)
- Accounts Receivable

**Important:** Do **not** record net Stripe payout as gross revenue. Preserve gross revenue, processing fees, applicable taxes, and payout reconciliation.

---

## 11. Monitoring Automation Priority

Monitoring is likely the **highest-value workflow** — McKee has a large recurring monitoring customer base.

### Target workflows

- Create annual monitoring invoice batch (semi-annual / monthly batches as needed)
- Send customer payment links (email + portal)
- Accept credit card payments through Stripe
- Record payments into QuickBooks Desktop via queue
- Flag failed payments, expired cards, unpaid accounts
- Generate AR aging for monitoring customers
- Draft collection emails (review before send)
- Update customer billing status after payment

### Suggested monitoring customer fields (cloud mirror — Supabase)

Linked to portal profile and QuickBooks customer:

| Field | Purpose |
|-------|---------|
| QuickBooks Customer ListID | Official QB identifier |
| Customer name | Display / matching |
| Service address | Ops + billing |
| Billing email | Invoices and payment links |
| Phone number | Collections / ops |
| Monitoring account number | Internal reference |
| Panel / account notes | Ops context |
| Billing cycle | Annual, semi-annual, monthly |
| Monitoring rate | Amount |
| Tax status | HST/GST treatment |
| Stripe Customer ID | Payment provider link |
| Stripe Subscription ID | If subscription billing used |
| Last invoice date | Ops |
| Last payment date | Ops |
| Current billing status | Paid, unpaid, overdue, failed |
| QuickBooks sync status | In sync, pending, needs review |

These extend the portal's client records — one logical customer across portal, Stripe, and QuickBooks.

---

## 12. MCP Server Role

The **custom MCP server must not directly control QuickBooks Desktop.** It exposes structured tools that call the **cloud management API**, which owns validation, permissions, queueing, and audit.

```
Cursor / internal AI agent
        ↓
MCP Tool (structured, named action)
        ↓
Cloud API (Vercel / Cloud Run)
        ↓
Supabase — database + task queue
        ↓
Local QuickBooks bridge
        ↓
QuickBooks Desktop
```

This lets agents request actions **without bypassing business rules**.

### Example MCP tools (illustrative)

**Read-oriented:**

- `search_customer`
- `get_customer_balance`
- `get_open_invoices`
- `get_monitoring_status`
- `get_ar_aging_summary`
- `get_monthly_revenue_summary`

**Task-creating (draft / post):**

- `create_monitoring_invoice_task`
- `create_payment_reconciliation_task`
- `draft_collection_email`
- `create_estimate_draft`
- `create_invoice_draft`

### Tool categories

| Category | Behavior |
|----------|----------|
| **Read-only tools** | Query mirrors / queue read APIs — low risk |
| **Draft tools** | Create reviewable drafts — not posted until approved |
| **Posting tools** | Enqueue approved writes — require explicit approval |
| **Admin-only tools** | Restricted to admin role in Supabase |
| **Disabled / destructive** | Not exposed in v1 |

MCP should be wired into the same **human checkpoint** model as other infrastructure: McKee approves which tools go live and when.

---

## 13. Permission Model

### Safe by default — read-only (usually no approval)

- Search customers
- View invoice history, balances, payment history
- View item list, AR aging, monitoring status
- View sales reports, payment sync status
- View revenue summaries (from synced data)

### Require review — drafts (prepare but do not post)

- Draft estimate, invoice, purchase order
- Draft collection email
- Draft monitoring invoice batch
- Draft customer update suggestions

### Require explicit approval — posting (affects QuickBooks)

- Create customer
- Create invoice / estimate / sales receipt
- Receive payment / apply Stripe payment to invoice
- Update customer billing details
- Create purchase order
- Apply credit memo
- Post monitoring billing batch

Approval recorded: user, timestamp, task ID — stored in Supabase audit tables.

### Disable or heavily restrict initially

Do **not** expose to AI or unattended automation in v1:

- Void / delete transactions
- Modify closed-period transactions
- Change tax codes globally
- Change chart of accounts
- Write journal entries
- Reconcile bank accounts
- Modify payroll
- Modify company preferences

---

## 14. Offline Queue & Task Records

Every QuickBooks write task should be durable and auditable in Supabase (or equivalent).

### Recommended fields

| Field | Purpose |
|-------|---------|
| `task_id` | Primary key |
| `task_type` | e.g. `receive_payment.create`, `invoice.create` |
| `source_system` | `portal`, `stripe_webhook`, `mcp_agent`, `admin_ui` |
| `source_event_id` | Stripe event ID, MCP request ID, etc. |
| `customer_reference` | Portal profile ID |
| `quickbooks_customer_list_id` | QB ListID when known |
| `quickbooks_txn_id` | QB TxnID after post |
| `stripe_event_id` | Stripe webhook event |
| `stripe_payment_intent_id` | Payment correlation |
| `payload_json` | Structured command body (not free-form AI prose) |
| `status` | State machine value |
| `attempt_count` | Retry tracking |
| `last_attempt_at` | Last bridge try |
| `last_error` | qbXML / bridge error message |
| `created_at` / `updated_at` | Timestamps |
| `posted_at` | Successful QB write time |
| `requires_human_review` | Boolean |
| `approval_user` | Who approved post |
| `approval_timestamp` | When approved |
| `idempotency_key` | Duplicate prevention |

---

## 15. Idempotency

The system **must be idempotent**. Duplicate Stripe webhooks or bridge retries must **not** create duplicate invoices or payments.

**Recommended idempotency key patterns:**

```
monitoring_invoice:{customer_id}:{billing_period}
stripe_payment:{stripe_payment_intent_id}
receive_payment:{quickbooks_invoice_txn_id}:{stripe_payment_intent_id}
customer_sync:{website_customer_id}
```

Cloud API should reject or no-op duplicate keys safely; log for audit.

---

## 16. Conflict Handling

### Potential conflicts

- Customer in Stripe but not QuickBooks
- Customer in QuickBooks but not cloud database
- Duplicate customer names in QuickBooks
- Payment received but matching invoice not found
- Invoice already paid manually in QuickBooks
- Customer paid wrong amount
- Customer paid under old name / company
- QuickBooks desktop offline for several days
- QuickBooks file restored from backup
- Transaction edited manually in QuickBooks after sync

### Policy: do not guess dangerously

Move uncertain cases to **`needs_review`** queue in admin dashboard.

| Situation | Action |
|-----------|--------|
| Payment received, no matching invoice | `needs_review` |
| Two possible QuickBooks customer matches | `needs_review` |
| Invoice amount mismatch > tolerance | `needs_review` |
| QuickBooks rejects qbXML write | `failed` or `needs_review` |
| Duplicate webhook event | Ignore safely (idempotency) |

Staff resolves in admin UI; optional agent assists with context (read-only history) but does not auto-resolve ambiguous matches.

---

## 17. Data Sync Strategy

The cloud system **does not replace QuickBooks**. QuickBooks remains the financial system of record.

Supabase stores enough **mirrored data** for fast portal, admin, AI, and queue workflows.

### Recommended synced objects

- Customers and customer jobs
- Invoices and payments
- Estimates
- Items / services
- Vendors (read-heavy)
- Open balances
- Monitoring billing status
- Basic AR aging snapshots
- Transaction cross-references (ListID, TxnID, EditSequence)

The local bridge **periodically pulls** from QuickBooks → updates Supabase mirrors. Portal and agents can answer common questions when QuickBooks is offline; **posted financial truth** still lives in the company file.

**Conflict rule:** QuickBooks wins for posted financial data unless an admin approves a corrective task.

---

## 18. Estimate & Invoice Automation

Useful future workflows (after monitoring MVP):

- Create estimate from job notes
- Revise estimate from change requests
- Convert accepted quote → invoice workflow
- Create invoice from completed work order
- Create purchase order from approved quote
- Lookup items / services / SKUs
- Validate tax codes and customer/job assignment

### AI line items rule

The system must **not** let AI freely invent item names or GL accounts.

**Preferred behavior:**

1. AI suggests line items in natural language
2. System maps suggestions to **existing QuickBooks items/services**
3. Unknown mappings → `needs_review`
4. Admin approves before posting task enters queue

---

## 19. Collections Automation

Useful actions:

- Pull overdue invoices
- Generate AR aging summary
- Identify 30 / 60 / 90+ day overdue accounts
- Draft collection emails
- Suggest call list
- Flag high-value overdue accounts
- Show customer history before service call

**Initial policy:** Collection emails are **drafted**, not auto-sent. Admin reviews and sends (or approves send in a later phase).

---

## 20. Reporting Automation

Useful owner/admin reports (dashboard + agent queries):

- Monthly revenue
- Monitoring revenue
- Outstanding AR
- Overdue monitoring customers
- Top customers by revenue
- Open estimates; accepted vs lost
- Job profitability
- Labour vs equipment revenue
- Unpaid invoices by age
- Vendor spend
- Stripe payments pending QuickBooks posting
- Tasks stuck in sync queue

Expose via **admin dashboard** widgets and **MCP read tools** — not by giving agents raw QuickBooks file access.

---

## 21. Natural-Language QuickBooks Agent

A core requirement: authorized McKee staff interact with accounting through **plain English**, not constant manual clicking in QuickBooks.

The agent is a **controlled accounting assistant** — it interprets requests and selects **approved MCP tools**, never arbitrary qbXML.

### Example staff requests

- *"Show me all overdue invoices over 60 days."*
- *"Create a draft invoice from these job notes."*
- *"Find this customer and show their balance."*
- *"Create a monitoring invoice batch for all active annual monitoring customers."*
- *"Record this Stripe payment against the matching QuickBooks invoice."*
- *"Show me all unpaid monitoring accounts."*
- *"Draft a collection email for this customer."*
- *"Create a new customer from this website form submission."*
- *"Prepare an estimate using this equipment list and labour breakdown."*
- *"Show me revenue from monitoring this year."*
- *"Find customers missing email addresses or billing terms."*

### Request flow

```
Staff natural-language request (admin UI or Cursor)
        ↓
AI interprets intent
        ↓
Selects approved MCP tool
        ↓
Cloud API validates role + permission tier
        ↓
Read → execute immediately (mirrors)
Draft → save for review
Post → requires approval → enqueue task
        ↓
Local bridge performs QuickBooks action when online
        ↓
Result returned to staff
```

### Three work categories

| Category | Approval | Examples |
|----------|----------|----------|
| **1. Read-only** | Usually none | Search customers, balances, AR aging, monitoring status, revenue summaries |
| **2. Draft** | Review before post | Draft estimates, invoices, POs, collection emails, monitoring batches |
| **3. Posting** | Explicit approval + audit | Create customer, invoice, receive payment, post batch |

Sensitive/destructive actions remain **disabled initially** (void, delete, journal entries, chart of accounts changes, bank reconcile, payroll, etc.).

**Goal:** QuickBooks feels like an intelligent back office operable through conversation — while the company file stays protected via permissions, approvals, audit logs, and offline-safe queueing.

---

## 22. Suggested Build Phases

**Suggested order — not mandatory.** Runs **in parallel** with portal delivery ([`PRODUCT_HANDOVER.md` Section 20](./PRODUCT_HANDOVER.md#20-suggested-build-phases-recommended-order)). Overlap **QB Phase 3** with portal **Stripe Phase 5** when possible.

### QB Phase 1 — Discovery + read-only bridge

**Build:**

- QuickBooks connection proof of concept on office PC
- Customer, invoice, payment, item/service query
- AR aging report pull
- Basic bridge logging
- Cloud API skeleton (Vercel or Cloud Run)
- Supabase schema for tasks + mirrors

**Goal:** Safe connectivity **without writing** to QuickBooks.

**Human checkpoint:** QB PC designated; SDK authorization in QuickBooks.

---

### QB Phase 2 — Cloud queue + offline sync

**Build:**

- Durable task queue in Supabase
- Bridge polling + state machine
- Idempotency keys
- Error logging
- `needs_review` admin queue in portal admin dashboard
- Sync status page

**Goal:** Prove cloud/portal tasks wait safely while QuickBooks is offline.

**Human checkpoint:** Bridge deployed and authenticated to cloud.

---

### QB Phase 3 — Stripe monitoring payments *(first production workflow)*

**Build:**

- Stripe Checkout / Payment Links (integrated with portal monitoring pay flow)
- Stripe Customer mapping to portal profile
- Webhook endpoint with signature verification
- Payment event validation + idempotency
- Monitoring payment task creation
- QuickBooks payment posting via bridge
- Stripe clearing / reconciliation workflow (bookkeeper-approved mapping)
- Failed payment handling

**Goal:** Customer pays online; payment later recorded in QuickBooks Desktop; portal shows correct status throughout.

**Human checkpoint:** Stripe products; webhook URL; GL account mapping with bookkeeper.

---

### QB Phase 4 — Monitoring billing automation

**Build:**

- Monitoring customer database (Supabase, linked to portal)
- Billing cycle management
- Invoice batch task creation
- Email payment links
- Paid / unpaid dashboards
- Failed payment follow-up flags
- Monitoring AR dashboard

**Goal:** Automate the largest recurring admin workflow.

---

### QB Phase 5 — Estimates, invoices & AI admin tools

**Build:**

- MCP server + tool registry
- Natural-language admin assistant
- AI estimate / invoice / PO drafting
- Customer create/update approval queue
- Audit history for accounting tasks

**Goal:** Reduce quoting, billing, and general admin workload.

---

## 23. Best Overall Recommendation

```
Use QuickBooks Desktop as the accounting source of truth (Canada).
Run a local QuickBooks bridge on the main QuickBooks Desktop computer.
Use QuickBooks Desktop SDK / qbXML for all direct QuickBooks communication.
Use Supabase + Cloud API (Vercel / Cloud Run) for portal, Stripe, AI, queue, and mirrors.
Use Stripe webhooks for reliable payment confirmation.
Use an offline-safe task queue so QuickBooks writes happen when the desktop reconnects.
Require approval for all sensitive accounting writes.
Prioritize monitoring billing and payment automation first.
Expose agent capabilities through MCP tools — never unrestricted QB access.
```

### How the finished system should behave

- Customers and staff can trigger billing/payment actions **anytime**
- Cloud (Supabase + API) records everything **immediately**
- Portal reflects payment and service status without waiting for QuickBooks
- QuickBooks Desktop updates when the office desktop is **available**
- No payment or task is **lost**
- No duplicate invoice or payment is **created** (idempotency)
- Every accounting-impacting action is **logged and reviewable**

### First production-grade workflow

```
Monitoring payment on mckeesecurity.ca portal
        ↓
Stripe confirms payment by webhook
        ↓
Supabase stores payment event + updates portal billing status
        ↓
Cloud creates pending QuickBooks task(s)
        ↓
Local bridge posts invoice/payment to QuickBooks Desktop
        ↓
Cloud marks monitoring account paid / synced
        ↓
Admin dashboard shows complete status
```

---

## 24. Human Checkpoints & Agent Access

Aligned with [`PRODUCT_HANDOVER.md` Section 21](./PRODUCT_HANDOVER.md#21-development-workflow--human-checkpoints--agent-access).

**McKee stakeholder (human) has final say** on new infrastructure. Agent/team **recommends** and **pauses** until confirmed live.

| Trigger | Human action |
|---------|--------------|
| Designate QuickBooks bridge PC | Identify Windows machine; keep company file path consistent |
| Authorize SDK application | Accept app in QuickBooks when bridge first connects |
| Stripe + bookkeeper GL mapping | Confirm clearing, fees, HST, income accounts |
| Deploy bridge software | Install/update bridge; provide cloud API credentials securely |
| Enable MCP tools | Approve which tools go live per permission tier |
| Production webhook URL | Register in Stripe dashboard; verify test events |

**Agent/developer tooling:** Supabase CLI/MCP, Stripe CLI, Vercel CLI, bridge logs — for efficient iteration. Service role keys and AWS/QB credentials never belong in client code or public repos.

---

## 25. Open Questions

Clarify with McKee stakeholders and bookkeeper during build:

1. Exact QuickBooks chart of accounts for Stripe clearing, fees, HST/GST, monitoring income
2. Which machine is the canonical bridge host (dedicated vs daily driver PC)
3. Annual vs semi-annual vs monthly monitoring — which cycle to automate first
4. Invoice vs sales receipt for monitoring charges (bookkeeper decision)
5. When to auto-send collection emails vs draft-only
6. Web Connector vs custom SDK bridge — final team choice
7. Cloud Run vs Vercel-only for Stripe webhooks and MCP API
8. Mapping portal Supabase profile ↔ QuickBooks customer (1:1 rules, duplicate handling)

---

## Related Documents

| Document | Location |
|----------|----------|
| Main product handover (portal + Section 23 summary) | [`PRODUCT_HANDOVER.md`](./PRODUCT_HANDOVER.md) |
| Original Word planning docs | Project root `.docx` files |
| Legacy portal prototype (do not extend) | `frontend-react-app/`, `main-user-management/` |

---

*This document preserves QuickBooks Desktop integration discovery research for McKee Security & Audio Systems. It aligns that research with the company's modern platform stack and multi-product portal. Implementation details remain the development team's to propose; business rules, safety model, and QuickBooks-as-source-of-truth are the constraints.*
