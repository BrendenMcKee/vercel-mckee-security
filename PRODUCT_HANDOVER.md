# McKee Security Customer Portal — Product Handover Document

**Purpose:** This document describes *what* McKee Security is building with this project. It is intended for a new development team rebuilding the platform on a modern technology stack. It focuses on product scope, user experience, business rules, and functional requirements—the *what* and *why*, not the legacy prototype's implementation.

**Rebuild direction:** Next.js + TypeScript on Vercel, Supabase (database + auth with RLS), optional Google Cloud Run for advanced backend logic, and AWS Arctic storage for archived footage. **QuickBooks Desktop integration** (task queue, local bridge, Stripe payment posting) is a **follow-on** to the core portal—see [Section 23](#23-quickbooks-integration--portal-scope--future-roadmap). See [Section 19](#19-target-platform--rebuild-direction) for platform guidance.

**Prepared from:** Root planning documents (`Advanced Multi-Product SASS Roadmap.docx`, `Development Roadmap.docx`, `User-Admin-Dashboard Theory.docx`), the existing legacy prototype, branding guidelines, and **QuickBooks Desktop integration discovery** (July 2026). Much of this material reflects planning from an earlier development effort—the new team should read it for intent and business rules, not as a literal build specification.

**Last updated:** July 2026

---

## How to Use This Document

**This is a handover, not a spec.** The original project was started several years ago; the Word documents, legacy prototype, and earlier architectural choices (WordPress embeds, Cognito, separate subdomains, etc.) reflect that era. **McKee has since migrated the public website off WordPress entirely**—the portal in this document is built into that modern site, not back into WordPress.

### What to preserve

These are the **business outcomes and rules** the portal must deliver—regardless of how they are built:

- Admin-provisioned client accounts (no public open registration)
- Admin-assigned security monitoring tiers; clients view only
- Client self-service for cloud backup, caller ID, and footage requests
- Device maintenance tracking with 5-year / 10-year expiry alerts
- Operational notifications to admin (caller ID changes, device expiry, etc.)
- McKee Security branding and a professional client experience
- **Minimize administrative burden** over time through reliable payment-to-accounting pipelines where the portal requires them (see Section 23 — **current scope only**)
- **QuickBooks Desktop remains the accounting system of record** when integration is built—no forced migration to cloud accounting

### Where the team has full freedom

The development team should **propose and implement modern alternatives** wherever they improve security, UX, maintainability, or cost. Examples:

- URL structure, page names, and navigation layout
- Exact auth/onboarding mechanics (invite tokens, magic links, Supabase invite APIs, etc.)
- Database schema design, naming, and normalization—as long as RLS and business rules hold
- Whether a feature lives on Vercel, Supabase Edge Functions, or Cloud Run
- UI component libraries, state management, and dashboard layout
- Email provider, payment integration patterns, and cron/scheduling approach
- Optimizations the original planners did not consider (better caching, realtime updates, in-app notifications, etc.)

**If the team identifies a simpler, more secure, or more modern approach that still satisfies the business rules above, they should use it**—and document their decisions for McKee stakeholders. Section 19 describes a *preferred* target stack, not a mandatory one; deviations are welcome when well-reasoned.

When in doubt: **protect the business logic, modernize everything else.**

**Handover status:** Audited against project directory and QuickBooks discovery (July 2026). **Ready to send** as a requirements baseline.

**Primary focus of this document:** The **multi-product client/admin portal** (Sections 1–22, Section 20 build phases). QuickBooks and MCP accounting automation are **documented for context and future planning** (Section 23)—the full natural-language accounting agent is a **separate future product**, not the current implementation target.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context](#2-business-context)
3. [Product Vision](#3-product-vision)
4. [User Roles & Access Model](#4-user-roles--access-model)
5. [Application Structure — Pages & Portals](#5-application-structure--pages--portals)
6. [Client Dashboard (User Portal)](#6-client-dashboard-user-portal)
7. [Internal Admin Dashboard](#7-internal-admin-dashboard)
8. [Account Setup & Onboarding](#8-account-setup--onboarding)
9. [Services & Subscription Products](#9-services--subscription-products)
10. [Business Data & Records](#10-business-data--records)
11. [Key Workflows](#11-key-workflows)
12. [Notifications & Automated Alerts](#12-notifications--automated-alerts)
13. [External Systems & Integrations](#13-external-systems--integrations)
14. [Brand & Experience Guidelines](#14-brand--experience-guidelines)
15. [Future Enhancements (Optional)](#15-future-enhancements-optional)
16. [Current Prototype Status](#16-current-prototype-status)
17. [Planning Document Evolution](#17-planning-document-evolution)
18. [Open Questions for the New Team](#18-open-questions-for-the-new-team)
19. [Target Platform & Rebuild Direction](#19-target-platform--rebuild-direction)
20. [Suggested Build Phases (Recommended Order)](#20-suggested-build-phases-recommended-order)
21. [Development Workflow — Human Checkpoints & Agent Access](#21-development-workflow--human-checkpoints--agent-access)
22. [Security Hardening & Quality Expectations](#22-security-hardening--quality-expectations)
23. [QuickBooks Integration — Portal Scope & Future Roadmap](#23-quickbooks-integration--portal-scope--future-roadmap)

**Appendices:** [A — Feature Checklist](#appendix-a--page--feature-checklist) · [B — Source Documents](#appendix-b--source-documents) · [C — Pre-Handover Audit](#appendix-c--pre-handover-audit)

---

## 1. Executive Summary

McKee Security is building a **customer and operations portal** for its security business. The portal allows residential and commercial clients to:

- View their security monitoring subscription
- Self-manage cloud camera backup plans and billing
- Maintain an approved caller ID list used by the alarm monitoring station
- Track device maintenance (security system batteries and smoke detectors)
- Request retrieval of archived camera footage

Internal McKee staff use a separate **admin dashboard** to create client accounts, assign service tiers, manage subscriptions, update device records, review caller ID changes, and respond to operational alerts.

McKee **Security & Audio Systems** also runs **QuickBooks Desktop (Canada)** and intends to connect portal payments to the books over time—but **that integration is secondary to shipping the core portal first**. Section 23 defines what belongs in the **current build** vs a **future accounting/MCP product**. Full research lives in [`QUICKBOOKS_ACCOUNTING_DISCOVERY.md`](./QUICKBOOKS_ACCOUNTING_DISCOVERY.md).

The portal lives within the McKee Security public website (`mckeesecurity.ca`)—**already fully rebuilt** on **Next.js**, **TypeScript**, and **Vercel**—as a branded, secure area where logged-in clients manage their account. McKee has **already migrated away from WordPress**; the customer portal is the next major product to build natively into that modern site. Authentication, data, and business logic for the portal will be powered by **Supabase** (with Row Level Security), with optional **Google Cloud Run** for heavier backend workflows.

**Important:** The legacy codebase in this directory is an early prototype (~5–10% complete). The **website itself is already on the modern stack**—WordPress is gone. This handover describes the **portal product** to build into that live site. Treat this document as a requirements baseline, not a literal spec, and do not extend the old WordPress/Cognito code in this folder.

---

## 2. Business Context

### Who is this for?

**McKee Security & Audio Systems** — a security and audio services company offering alarm/security monitoring, cloud camera backup, and related maintenance services to clients. Operations and accounting currently run through **QuickBooks Desktop (Canada)**; the portal and automation layer wrap around—not replace—that workflow.

### Why build this?

Today, client account management, subscription handling, caller ID updates, device maintenance tracking, and footage requests likely involve manual processes. **This handover prioritizes the portal** that centralizes client interactions and internal service management. Payment-to-QuickBooks automation is a **later enhancement** once core portal and Stripe flows work (Section 23).

### Primary business outcomes *(current implementation)*

| Outcome | Description |
|---------|-------------|
| **Client self-service** | Reduce support burden by letting clients view services, pay for subscriptions, update caller IDs, and request footage online |
| **Admin-controlled security tiers** | Ensure security monitoring plans are assigned by staff—not chosen or changed by clients |
| **Operational visibility** | Alert staff when caller IDs change, devices expire, or footage is requested |
| **Recurring revenue management** | Support subscription billing for cloud backup and security monitoring via Stripe in the portal |
| **Audit-friendly records** | Maintain a clear record of who has which services, when devices were installed, and what caller IDs are on file |

### Future outcomes *(QuickBooks / MCP product — not current MVP)*

| Outcome | Description |
|---------|-------------|
| **Payment-to-QuickBooks sync** | Offline-safe queue posts Stripe monitoring/cloud payments into QuickBooks Desktop |
| **Administrative efficiency** | Batch billing, collections drafts, AR dashboards—via admin UI first, then agent tools |
| **Natural-language accounting agent** | Separate product: staff ask an AI assistant to query/draft/post accounting tasks through MCP (Section 23.5) |
| **Accounting integrity** | QuickBooks Desktop stays financial source of truth; cloud mirrors and queues |

---

## 3. Product Vision

The portal is a **multi-product SaaS-style hub** embedded in the McKee Security website. It is not a standalone app store—clients arrive through McKee's existing site and use the portal to manage services McKee has sold or assigned to them.

### Core product areas

| # | Product Area | Client Can… | Admin Can… |
|---|--------------|-------------|------------|
| 1 | **Security Monitoring** | View tier and status (read-only) | Assign tier, manage billing, pause/cancel |
| 2 | **Cloud Camera Backup** | Change plan, cancel, request footage | Assign initial tier, manage manually, view status |
| 3 | **Caller ID Management** | Add/remove approved contacts | View lists and change history |
| 4 | **Device Maintenance** | View battery and smoke detector install dates and expiry status | Set and update install dates for all clients |
| 5 | **Billing (portal)** | Pay monitoring/cloud fees via Stripe; view payment status in portal | View client payment status; *(future)* QuickBooks sync queue in admin |

*Row 5 QuickBooks sync, task queues, and accounting UI are **follow-on** work—Section 23.*

### Design philosophy

- **One portal, two audiences:** Clients and internal staff share a unified application experience but see completely different interfaces and capabilities.
- **Admin assigns, client consumes:** For security monitoring, the company decides the tier; the client only views it (and may pay for it if billing applies). Clients cannot upgrade, downgrade, or cancel security monitoring themselves.
- **Self-service where safe:** Cloud backup, caller ID lists, and footage requests are client-manageable because they are lower-risk or explicitly designed for client control.
- **Proactive maintenance:** The system should warn both client and staff when physical devices (batteries, smoke detectors) are due for replacement based on install date rules.
- **Modern, frictionless access:** Clients should be able to sign in quickly—especially via **Google**—while still supporting traditional email and password. Account creation remains admin-controlled; there is no public open registration.

---

## 4. User Roles & Access Model

### Client (End User)

**Who:** McKee Security customers with an active or invited account.

**Access:** Client dashboard at `/user-dashboard` on the public website.

**Authentication:** Supabase Auth with multiple sign-in options:
- **Google sign-in** (primary social provider—fastest path for most clients)
- **Email and password** (traditional flow for clients who prefer it)
- Additional providers (Apple, Microsoft, etc.) may be added later

**Account creation:** No public self-registration. Accounts are created by admin and activated via a secure invite link. Once activated, clients sign in with Google or email/password on return visits.

**Capabilities:**
- Sign in and view personalized account information
- View all assigned services and their status
- Pay for or manage cloud backup subscription (where applicable)
- Manage approved caller ID contacts
- View device maintenance status
- Request archived camera footage
- Log out

**Restrictions:**
- Cannot change security monitoring tier
- Cannot cancel or modify security monitoring subscription
- Cannot create their own account
- Cannot access admin tools

---

### Admin (Internal Staff)

**Who:** McKee Security employees who manage client accounts and operations.

**Access:** Admin dashboard at `/admin-dashboard` on the public website.

**Authentication:** Admin role enforced via Supabase Auth and **Row Level Security (RLS)** policies:
1. Only users with an admin role can access admin dashboard routes and admin API actions
2. The admin area must not be publicly accessible—route protection, role checks, and RLS together ensure clients cannot reach admin data or actions

The legacy approach (WordPress page password protection) is replaced by proper role-based access in the new stack.

**Capabilities:**
- Create new client accounts
- Assign one or more service tiers per client
- Send or resend account setup invitations
- View list of all clients and their services
- Modify service tiers
- Cancel or restart subscriptions
- Update device install dates (battery, smoke detector)
- View caller ID lists (current and optionally historical)
- Receive and respond to automated alerts (caller ID changes, device expiry)
- Manually add backup services without going through client checkout (where needed)

**Future admin capabilities (QuickBooks / MCP product — not current MVP):** payment sync queue review, AR views, collection drafts, natural-language accounting assistant. See Section 23.

---

### Technician (Future / Optional)

**Who:** Field technicians or installers (optional future role).

**Capabilities (planned, not fully specified):**
- View assigned installation or maintenance tasks
- Possibly update device install dates in the field

This role is mentioned in planning documents as a future enhancement and is not part of the core MVP scope.

---

## 5. Application Structure — Pages & Portals

The application consists of **three primary client-facing pages** and **one internal page**, all served from the McKee Security website:

| Page | URL | Audience | Purpose |
|------|-----|----------|---------|
| **Client Dashboard** | `/user-dashboard` | Clients | Main portal—services, billing, caller ID, devices, footage |
| **Admin Dashboard** | `/admin-dashboard` | Internal staff | Account creation, service management, operational tools |
| **Account Activation** | `/account/activate?token=…` (or equivalent) | Invited clients (one-time) | Complete account setup via Google or email/password |

### How pages relate

```
McKee Security Website — Next.js on Vercel (mckeesecurity.ca)
│
├── /user-dashboard          → Client portal (auth required for full access)
├── /admin-dashboard         → Internal tools (admin role required)
└── /account/activate?token=… → One-time account activation for invited clients

Supabase
│
├── Auth          → Google OAuth, email/password, sessions, roles
├── Database      → Client data, services, caller IDs, devices, footage requests
└── RLS policies  → Clients see only their data; admins see what their role allows

Optional: Google Cloud Run
│
└── Advanced business logic, webhooks, scheduled jobs, AWS Arctic footage retrieval

AWS
│
└── Arctic archive storage for camera footage retrieval
```

The portal is part of the rebuilt McKee Security website—not a separate product or iframe embed. It should feel like a native extension of the brand.

---

## 6. Client Dashboard (User Portal)

The client dashboard is the primary experience for McKee Security customers. After logging in, clients see a personalized view of their account organized into **four main sections**.

### 6.1 Global Dashboard Elements

Regardless of section, the dashboard should include:

| Element | Description |
|---------|-------------|
| **Welcome header** | Greets the client by name (e.g., "Welcome, John Doe") |
| **Account status** | Clear indication of login state |
| **Navigation** | Access to all four sections (exact layout—tabs, sidebar, or cards—is a design decision for the new team) |
| **Logout** | End session and return to logged-out state |
| **Loading state** | Friendly loading indicator while account data is retrieved |
| **Error handling** | Clear message if account data cannot be loaded, with option to retry |

**Logged-out state:** Unauthenticated visitors see a sign-in prompt with messaging such as: *"Securely manage your account information, cloud backups, and more."* Sign-in options should include:
- **Continue with Google** — prominent, one-click sign-in for returning clients
- **Sign in with email** — traditional email and password flow
- Primary CTA may remain **Manage Account** to reinforce that this is an account management area, not a generic login page

**Design intent:** Google sign-in dramatically reduces friction for clients who already use Google. Both methods must respect the same business rules (admin-provisioned accounts, assigned tiers, RLS-enforced data access).

---

### 6.2 Section 1 — Security Monitoring (Read-Only)

**Purpose:** Show the client what security monitoring plan McKee has assigned to them.

**What the client sees:**

| Field | Example Values | Notes |
|-------|----------------|-------|
| Service name | Security Monitoring | Fixed label |
| Tier | Basic, Standard, Pro | Assigned by admin only |
| Status | Active, Paused, Cancelled | Reflects current service state |

**What the client can do:**
- View tier and status only

**What the client cannot do:**
- Upgrade or downgrade tier
- Cancel or pause service
- Change billing details for this service (handled by admin/company)

**Business rule:** Security monitoring is a company-managed service. The tier is determined when the admin creates or updates the account. The client may need to pay for their assigned tier (see payment workflow), but they never choose or change the tier themselves.

---

### 6.3 Section 2 — Cloud Camera Backup (Client-Managed)

**Purpose:** Let clients view and self-manage their cloud camera backup subscription, and request archived footage.

**What the client sees:**

| Field | Example Values | Notes |
|-------|----------------|-------|
| Service name | Cloud Backup | Fixed label |
| Tier | 7-day, 30-day, 90-day retention | Describes how long footage is stored |
| Status | Active, Cancelled, Paused | Reflects subscription state |

**What the client can do:**

| Action | Description |
|--------|-------------|
| **Change Plan** | Select a different retention tier and complete payment through checkout |
| **Cancel Plan** | End cloud backup service |
| **Request Footage** | Submit a request to retrieve archived video (see below) |

**Request Footage form:**

| Field | Description |
|-------|-------------|
| Camera | Select which camera the footage is from |
| Date / time range | Specify the period of footage needed |

**After submitting a footage request:**
1. The request is recorded
2. Retrieval is initiated from **AWS Arctic archive storage** (McKee's cost-effective long-term storage for camera footage; AWS CLI access is available in the new development environment)
3. When footage is ready, the client receives an email with a **secure, time-limited download link**

**Business rules:**
- Cloud backup is the primary self-service subscription product
- Tier changes go through payment checkout
- Cancellation removes the service (exact grace period / data retention policy to be confirmed with McKee)
- Footage requests are asynchronous—client is notified by email when ready

---

### 6.4 Section 3 — Caller ID Management

**Purpose:** Maintain the list of phone numbers and contacts that the alarm monitoring station is authorized to call when an alarm is triggered.

**What the client sees:**
- A list of approved contacts, each with:
  - **Phone number**
  - **Label** (e.g., "Mom", "Office", "John – Mobile")

**What the client can do:**

| Action | Description |
|--------|-------------|
| **Add contact** | Enter phone number and label |
| **Remove contact** | Delete an existing entry |
| **Save changes** | Submit updated list |

**What happens on save:**
1. The system compares the new list to the previous list
2. Changes are saved
3. An email is sent to McKee admin showing exactly what changed:
   - **Added contacts** highlighted in green
   - **Removed contacts** highlighted in red

**Business rule:** Caller ID changes affect emergency response. Admin must be notified immediately on every change so the monitoring station's records can be updated.

**Data quality (recommended):**
- Validate phone number format before save (E.164 or North American formats—team to confirm with McKee)
- Prevent duplicate phone numbers on the same client's list
- Consider a reasonable maximum number of contacts (e.g., cap at 10–15—confirm with operations)
- Optional: require at least one contact before save if McKee policy mandates a minimum emergency contact list

**Example admin notification content:**
> User: John Doe  
> Caller ID changes:  
> • + Jane Smith – 555-6789 *(added)*  
> • − Paul Jones – 555-0000 *(removed)*

**Audit trail (recommended):** Store a history of caller ID changes (who changed, when, before/after) even if admin UI initially shows only the current list. Supports dispute resolution and monitoring station coordination.

---

### 6.5 Section 4 — Device Maintenance Tracker

**Purpose:** Track when critical security devices were installed and alert when they are due for replacement.

**Devices tracked:**

| Device | Expiry Rule | Meaning |
|--------|-------------|---------|
| **Security system battery** | 5 years from install date | Battery should be replaced after 5 years |
| **Smoke detector** | 10 years from install date | Smoke detector should be replaced after 10 years |

**What the client sees:**

| Field | Description |
|-------|-------------|
| Security battery install date | Date the battery was last installed |
| Smoke detector install date | Date the smoke detector was last installed |
| Expiry status | Visual indication if either device is past its replacement threshold |

**Visual treatment:**
- Devices within their valid lifespan: normal display
- **Expired devices:** clearly highlighted (e.g., warning color, icon, or banner) so the client knows action is needed

**What the client can do:**
- View install dates and expiry status only (dates are set/updated by admin)

**Automated alerts (see Section 12):**
When a device passes its expiry threshold, both the client and admin receive an email alert prompting replacement scheduling.

**Example alert content:**
> User: Sarah Lee  
> Battery expired (Installed: April 1, 2018)  
> Please schedule a replacement.

---

### 6.6 Payment & Subscription Display (Cross-Cutting)

Depending on account state, the client dashboard may also show:

| Element | When Shown | Description |
|---------|------------|-------------|
| **Subscribe / Pay Now** | Client has assigned tier but has not yet paid | Button to complete payment for assigned plan |
| **Payment success message** | After returning from successful checkout | Confirmation that payment was received |
| **Subscription summary** | Always (when logged in) | Overview of all active services |

**Critical business rule:** The client never selects their security monitoring tier—they only pay for what admin pre-assigned. The system must validate the assigned tier before allowing payment to prevent clients from paying for a plan they were not given.

---

## 7. Internal Admin Dashboard

The admin dashboard is the operational control center for McKee staff. It is not accessible to clients.

### 7.1 Access & Security

- The `/admin-dashboard` route must not be accessible to clients or unauthenticated users
- Admin users authenticate via Supabase Auth (email/password and/or Google for staff accounts)
- **Row Level Security (RLS)** on all sensitive tables ensures clients can never read or write another client's data
- All admin actions (create user, change tier, update devices, etc.) require verified admin role checks at both the application layer and the database layer
- Sensitive operations that cannot safely run client-side (Stripe webhooks, Arctic retrieval, bulk cron jobs) should run in trusted server contexts (Vercel server functions and/or Cloud Run)

---

### 7.2 Create New Client

**Purpose:** Provision a new client account before the client ever logs in.

**Form fields:**

| Field | Required | Description |
|-------|----------|-------------|
| First name | Yes | Client's given name |
| Last name | Yes | Client's family name |
| Email (invite) | Optional | If provided, pre-fills or constrains the activation email; if omitted, client chooses at activation |
| Address | Optional | Client's service address |
| Security monitoring tier | As applicable | Basic, Standard, or Pro |
| Cloud backup tier | As applicable | 7-day, 30-day, or 90-day |

**What happens on submit:**
1. A pending client profile is created in Supabase (linked to assigned service tiers)
2. Assigned service tiers are recorded
3. A unique, time-limited **activation token** is generated and stored
4. An invitation email is sent to the client with a secure link, e.g.:  
   `https://mckeesecurity.ca/account/activate?token=[unique-token]`

**Business rule:** Admin creates the account and assigns tiers *before* the client activates. The client chooses how to sign in during activation—not during admin creation.

---

### 7.3 Client & Service Management

**Purpose:** View and manage all client accounts and their subscriptions.

| Capability | Description |
|------------|-------------|
| **View all clients** | List of every client with their assigned services |
| **Modify service tier** | Change security monitoring or cloud backup tier for a client |
| **Cancel service** | Cancel a specific service for a client |
| **Restart service** | Re-activate a previously cancelled service |
| **Resend activation link** | Re-email the account activation link if the client did not complete setup |
| **Add backup service manually** | Assign cloud backup without requiring client to go through checkout |

---

### 7.4 Device Management

**Purpose:** Maintain install dates for client devices across all accounts.

| Capability | Description |
|------------|-------------|
| **View all client device records** | See battery and smoke detector install dates for every client |
| **Update install date** | Set or correct battery or smoke detector install date for a specific client |

**Business rule:** Device dates drive expiry alerts. Accurate dates are essential for the maintenance tracker to work correctly.

---

### 7.5 Caller ID Viewer

**Purpose:** Allow staff to review what contacts a client has on file.

| Capability | Description |
|------------|-------------|
| **View current caller ID list** | See approved contacts for any client |
| **View change history** | Optionally see historical changes (mentioned in planning docs) |

**Note:** Admin does not necessarily edit caller IDs on behalf of clients—the client manages their own list. Admin views for verification and monitoring station coordination.

---

### 7.6 Financial Operations & QuickBooks Sync *(follow-on — not core MVP)*

When QuickBooks integration is built (Section 23 **current scope**), the admin dashboard may expose:

| Capability | Phase |
|------------|-------|
| **Payment sync status** | Portal Stripe payment vs QuickBooks task state (`pending`, `posted`, `needs_review`) |
| **Task queue review** | Admin manually approves/retries/cancels queued posting tasks |
| **Needs-review queue** | Resolve payment/invoice matching conflicts |

**Deferred to future MCP/accounting product:** AR aging dashboards, collection email drafts, natural-language agent UI, batch invoice automation, estimate/PO workflows. See [`QUICKBOOKS_ACCOUNTING_DISCOVERY.md`](./QUICKBOOKS_ACCOUNTING_DISCOVERY.md).

---

## 8. Account Setup & Onboarding

Modern onboarding should feel fast and familiar. Clients receive an admin invite, then activate their account using **Google** (recommended) or **email and password**. There is still no public sign-up—every account starts with admin provisioning.

### 8.1 End-to-End Client Onboarding Flow

```
Admin creates pending client profile + assigns tiers
        ↓
System sends invite email with secure activation link
        ↓
Client opens activation link (/account/activate?token=…)
        ↓
Client chooses activation method:
   ├── Continue with Google  →  One-click; links Google identity to pending profile
   └── Email + password      →  Sets credentials; email verification if required
        ↓
Pending profile linked to authenticated Supabase user
        ↓
Pre-assigned services visible on dashboard
        ↓
Client completes payment (if required)
        ↓
Account fully active
        ↓
Future visits: sign in with Google OR email/password
```

---

### 8.2 Account Activation Page

**URL:** `/account/activate?token=[unique-token]` (exact path is a dev team decision)

**Who sees this:** New clients who received an invitation email from admin. The token identifies their pending profile and pre-assigned services.

**Activation options (client chooses one):**

| Option | Experience | Notes |
|--------|------------|-------|
| **Continue with Google** | One-click OAuth; account activated immediately if successful | Preferred path—fastest UX; should be visually prominent |
| **Email + password** | Client sets login email and password | For clients who prefer not to use Google |

**What happens after activation:**
1. Token is validated (must be valid, not expired, not already used)
2. Pending client profile is linked to the new Supabase Auth user
3. Pre-assigned service tiers become visible on the dashboard
4. Client is redirected to `/user-dashboard`
5. On future visits, client signs in with the same method they used (Google or email/password)

**Business rules:**
- Clients cannot self-register without a valid invite token
- An invite may optionally specify a target email; if so, Google sign-in and email setup should match or confirm that address
- If a client tries to sign in before activating, show a clear message to use their invite link or contact McKee
- Invalid or expired tokens show a clear error with instructions to contact McKee or request a resent invite

**Developer flexibility:** The exact Supabase pattern (invite user API, magic link, custom token table, etc.) is left to the development team. The product requirement is: **admin-provisioned accounts, secure one-time activation, Google + email/password support, no open registration.**

---

### 8.3 Returning Client Sign-In

After activation, clients use the standard sign-in experience on `/user-dashboard`:

| Method | When to use |
|--------|-------------|
| **Continue with Google** | Client activated with Google or linked Google later |
| **Email + password** | Client activated with email credentials |

Both paths must enforce the same RLS policies and show the same dashboard content.

---

## 9. Services & Subscription Products

McKee Security offers **two distinct subscription products** through the portal. They have different rules for who controls them and how billing works.

### 9.1 Security Monitoring

| Attribute | Detail |
|-----------|--------|
| **Product** | Professional alarm/security monitoring service |
| **Tiers** | Basic, Standard, Pro (exact feature differences per tier to be defined by McKee) |
| **Who assigns tier** | Admin only |
| **Client self-service** | None—view only |
| **Billing** | Managed by admin/company in Stripe (or offline). Client may pay for an assigned tier through checkout, but **cannot** self-initiate tier changes. Admin may manually link a Stripe subscription ID to the client's security service record where needed. |
| **Status values** | Active, Paused, Cancelled |

**Paused vs Cancelled:** *Paused* means service is temporarily suspended (e.g., seasonal client, billing hold); *Cancelled* means service is ended. Exact business rules for each state should be confirmed with McKee operations.

---

### 9.2 Cloud Camera Backup

| Attribute | Detail |
|-----------|--------|
| **Product** | Cloud storage and retention of security camera footage |
| **Tiers** | 7-day, 30-day, 90-day retention |
| **Who assigns tier** | Admin initially; client can change thereafter |
| **Client self-service** | Change plan, cancel plan, request footage |
| **Billing** | Client self-service via Stripe checkout for plan changes |
| **Footage storage** | AWS Arctic archive storage (cost-effective long-term retention) |
| **Status values** | Active, Cancelled, Paused |

---

### 9.3 Stripe & Payment Rules (from planning docs)

These rules come from the original product design and should be preserved in the rebuild:

| Rule | Detail |
|------|--------|
| **Cloud backup checkout** | Client-initiated via **Change Plan** or initial subscription |
| **Security monitoring checkout** | Client may pay for an **admin-assigned** tier only—never self-select a different tier |
| **Tier validation before checkout** | Server must verify the tier being paid for matches what admin assigned (prevents spoofing) |
| **Webhook-driven status** | Successful Stripe webhooks update portal `user_services` (or equivalent) to `active` |
| **Security billing ownership** | Admin/company manages security monitoring subscriptions in Stripe; user-facing checkout for security is display-and-pay only |
| **Post-payment UX** | Redirect to dashboard with success confirmation (e.g., `/user-dashboard?payment=success`) |
| **QuickBooks posting** *(follow-on)* | When Section 23 integration is live: webhooks also enqueue QB tasks; show sync-pending state if bridge offline |
| **Legacy tier names** | Original docs used names like `SecurityBasic`, `SecurityPro`—the new team may normalize naming (Basic/Standard/Pro) as long as business logic is clear |

Payment provider is **assumed to be Stripe** based on planning documents; the team may propose alternatives with stakeholder approval.

---

### 9.4 Multi-Service Model

Each client can have **both services simultaneously**, each with its own tier and status. For example:

| Client | Security Monitoring | Cloud Backup |
|--------|--------------------|--------------|
| John Doe | Standard — Active | 30-day — Active |
| Jane Smith | Pro — Active | None |
| Bob Wilson | Basic — Active | 7-day — Cancelled |

This multi-service model is the **target architecture** (see Section 17 for how planning evolved from a single-tier model).

---

## 10. Business Data & Records

The following describes the **business information** the system needs to store and display. This is a functional data model—not a database schema.

### 10.1 Client Account

| Information | Description |
|-------------|-------------|
| Unique account identifier | System-generated ID tied to Supabase Auth user |
| First name | Client given name |
| Last name | Client family name |
| Email | Login email (from Google OAuth or email/password setup) |
| Auth provider | Google, email, or both if linked |
| Address | Service/installation address (optional) |
| Role | Client, Admin, or (future) Technician |
| Account status | Pending activation, Active, etc. |

---

### 10.2 Service Subscription (per client, per service)

Each client can have one record per service type:

| Information | Description |
|-------------|-------------|
| Client | Which account this belongs to |
| Service | Security Monitoring or Cloud Backup |
| Tier | Plan level (e.g., Standard, 30-day) |
| Status | Active, Cancelled, Paused |
| Payment reference | Link to external payment subscription (for cloud backup) |

---

### 10.3 Caller ID Contact (per client)

| Information | Description |
|-------------|-------------|
| Client | Which account this belongs to |
| Phone number | Approved contact number |
| Label | Human-readable name (e.g., "Mom", "Office") |
| Date added | When the contact was added |

---

### 10.4 Device Maintenance Record (per client, per device)

| Information | Description |
|-------------|-------------|
| Client | Which account this belongs to |
| Device type | Security battery or Smoke detector |
| Install date | When the device was installed |
| Last updated | When the record was last modified |

---

### 10.5 Footage Request

| Information | Description |
|-------------|-------------|
| Client | Who requested |
| Camera | Which camera |
| Date/time range | Period of footage requested |
| Status | Pending, processing, ready, failed, expired |
| Download link | Secure link when ready (time-limited) |
| Requested at | Timestamp for SLA/ops tracking |
| Completed at | When footage became available (optional) |

**Footage request lifecycle:**

```
Pending → Processing → Ready (email with download link)
                    ↘ Failed (notify client + admin; allow retry)
Ready → Expired (link no longer valid after TTL)
```

---

### 10.6 Account Activation Invitation

| Information | Description |
|-------------|-------------|
| Token | Unique one-time activation link identifier |
| Client reference | Pending profile this token belongs to |
| Target email | Optional—email admin expects client to use |
| Created date | When admin created the pending account |
| Expires at | When the link becomes invalid |
| Used | Whether the client has completed activation |

---

### 10.7 Monitoring Customer Billing Profile *(follow-on — QuickBooks integration)*

When accounting integration is built, mirrored fields may link portal clients to QuickBooks customers:

| Information | Description |
|-------------|-------------|
| Portal client reference | Link to Supabase auth/profile |
| QuickBooks Customer ListID | Official QB customer identifier once synced |
| Customer name & service address | Billing identity |
| Billing email & phone | Contact for invoices and payment links |
| Monitoring account number | Internal ops reference |
| Billing cycle | Annual, semi-annual, monthly, etc. |
| Monitoring rate & tax status | Amount and HST/tax treatment (confirm with bookkeeper) |
| Stripe Customer ID / Subscription ID | Payment provider linkage |
| Last invoice / last payment date | Operational timestamps |
| Current billing status | Paid, unpaid, overdue, failed payment, etc. |
| QuickBooks sync status | In sync, pending tasks, needs review |

---

### 10.8 QuickBooks Task Queue Record *(follow-on — QuickBooks integration)*

When the task queue is implemented:

| Information | Description |
|-------------|-------------|
| Task ID & type | e.g., `receive_payment`, `invoice.create`, `customer.sync` |
| Source system | Portal, Stripe webhook, AI agent, admin action |
| Source event ID | Stripe event ID, webhook idempotency key, etc. |
| Customer references | Portal ID, QuickBooks ListID, Stripe customer |
| Payload | Structured command data (not free-form AI output) |
| Status | `pending` → `validated` → `ready_for_quickbooks` → `in_progress` → `posted_to_quickbooks` / `failed` / `needs_review` / `cancelled` |
| Idempotency key | Prevents duplicate invoices/payments on retry |
| Attempt count & last error | Retry diagnostics |
| Approval | Whether human approval required; who approved and when |
| Posted timestamp | When QuickBooks confirmed write |

---

## 11. Key Workflows

### 11.1 Client Sign-In (Returning Users)

1. Client visits `/user-dashboard`
2. If not signed in, sees sign-in prompt with **Continue with Google** and **email/password** options
3. Client authenticates via Supabase Auth
4. RLS ensures client only sees their own data
5. Dashboard loads with personalized content and pre-assigned services
6. Client can sign out at any time

---

### 11.2 Admin Creates Client & Sends Invite

1. Admin accesses `/admin-dashboard` (admin role required)
2. Admin fills in client details and assigns service tier(s)
3. Admin submits **Create User**
4. System creates pending client profile and records assigned services in Supabase
5. System emails client: `https://mckeesecurity.ca/account/activate?token=…`
6. Admin can resend invite if needed

---

### 11.3 Client Activates Account (First-Time)

1. Client clicks activation link from email
2. Client chooses **Continue with Google** or **email + password**
3. System validates token and links auth identity to pending profile
4. Pre-assigned services appear on dashboard
5. Client completes payment if required

**Google path:** Client clicks once, Google OAuth completes, profile linked—fastest experience.

**Email path:** Client sets credentials, verifies email if required, profile linked.

---

### 11.4 Client Pays for Assigned Plan

1. Client logs in and sees assigned tier (e.g., Security Basic)
2. Client clicks **Subscribe Now** / **Pay Now**
3. System validates that the tier matches what admin assigned (prevents spoofing)
4. Client completes payment via checkout
5. Client returns to dashboard with success confirmation
6. Service status updated to Active

**Business rule:** Client pays for what was assigned—they do not pick a different tier during checkout.

---

### 11.5 Client Changes Cloud Backup Plan

1. Client navigates to Cloud Backup section
2. Client clicks **Change Plan**
3. Client selects new retention tier (7-day, 30-day, or 90-day)
4. Client completes payment via checkout
5. Subscription updated; new tier reflected on dashboard

---

### 11.6 Client Cancels Cloud Backup

1. Client navigates to Cloud Backup section
2. Client clicks **Cancel Plan**
3. System confirms cancellation
4. Service status updated to Cancelled

---

### 11.7 Client Updates Caller ID List

1. Client navigates to Caller ID section
2. Client adds and/or removes contacts
3. Client saves changes
4. System compares old vs. new list
5. Updated list saved
6. Admin receives email with color-coded diff of changes

---

### 11.8 Client Requests Footage

1. Client navigates to Cloud Backup section
2. Client opens **Request Footage** form
3. Client selects camera and date/time range
4. Client submits request
5. System records request and initiates retrieval from AWS Arctic archive storage
6. When ready, client receives email with secure expiring download link

---

### 11.9 Device Expiry Check (Automated)

1. System runs nightly check on all device install dates
2. For each device:
   - Battery older than **5 years** → expired
   - Smoke detector older than **10 years** → expired
3. For each expired device, send email to:
   - McKee admin
   - Affected client
4. Dashboard visually highlights expired devices for the client

---

### 11.10 Admin Updates Device Install Date

1. Admin navigates to Device Management
2. Admin selects client
3. Admin updates battery or smoke detector install date
4. System recalculates expiry status
5. If device is no longer expired, alerts stop; if newly expired, next nightly check will trigger alert

---

### 11.11 Monitoring Payment → Stripe → QuickBooks *(follow-on workflow)*

When QuickBooks integration is active (Section 23 **current scope**, QB Phase 3), this connects portal payments to the books. **Not required for core portal MVP**—Stripe + portal status alone are sufficient for Phase 5.

**Scenario A — Customer pays through portal (QuickBooks offline OK):**

1. Client pays monitoring (or assigned) fee via Stripe Checkout on the portal
2. Stripe sends webhook to cloud management layer (Vercel/Cloud Run)—**this is the payment source of truth**
3. Cloud validates webhook signature and idempotency; records payment immediately in Supabase
4. Portal updates client billing status (e.g., paid / sync pending)
5. Cloud enqueues QuickBooks task(s): e.g., `receive_payment.create`, and if needed `invoice.create`
6. When the office QuickBooks Desktop machine is online, the **local bridge** polls tasks, executes via Desktop SDK (qbXML), and reports back
7. Cloud marks task `posted_to_quickbooks`; admin dashboard shows complete status

**Scenario B — Invoice exists in QuickBooks first:**

1. Invoice created in QuickBooks (manually or via approved batch task)
2. Invoice metadata syncs to cloud/portal
3. Client pays via Stripe (portal link or checkout)
4. Webhook enqueues `receive_payment` against matching invoice
5. Local bridge posts payment when online

**Scenario C — Desktop offline at payment time:**

Payment and portal status still succeed in the cloud. Tasks wait in queue—**the website must not fail because QuickBooks is powered off.** When the desktop reconnects, the bridge drains the queue in order.

**Reconciliation note:** Record gross customer payment, Stripe fees separately, and net payout to bank—exact chart of accounts (e.g., Stripe Clearing, HST Payable) **must be confirmed with McKee's bookkeeper** before automating posts.

---

## 12. Notifications & Automated Alerts

The system relies on email notifications for operational awareness. All emails should be professional, clearly branded, and actionable.

| Trigger | Recipients | Content |
|---------|------------|---------|
| **Account invitation** | New client | Secure activation link; client chooses Google or email/password |
| **Activation link resent** | Client | New or repeated activation link |
| **Caller ID list changed** | Admin | Diff of added (green) and removed (red) contacts |
| **Device expired** | Admin + Client | Which device, install date, request to schedule replacement |
| **Footage ready** | Client | Secure, time-limited download link |
| **Payment success** | Client (optional) | Confirmation of subscription activation |
| **Payment received, QB sync pending** | Client (optional) | Payment confirmed; accounting will update when office system syncs |
| **QuickBooks task failed / needs review** | Admin | Task error summary with link to review queue |
| **Collection email draft ready** | Admin | Draft for review—not auto-sent initially |

### Automated schedules

| Schedule | Action |
|----------|--------|
| **Nightly** | Check all device install dates; send expiry alerts |
| **Future (optional)** | Pre-maintenance reminders (e.g., 30 days before battery expiry) |
| **Future (optional)** | Monthly account summary emails to clients |

---

## 13. External Systems & Integrations

The portal depends on several external services. The table below describes each by **business function**. Section 19 covers how these map to the target rebuild stack.

| System | Role in the Product |
|--------|---------------------|
| **McKee Security Website** (`mckeesecurity.ca`) | Hosts the portal as part of the rebuilt Next.js site on Vercel |
| **Supabase** | Primary database (PostgreSQL), authentication (Google + email/password), Row Level Security, and realtime capabilities where useful |
| **Vercel** | Hosts the Next.js application, serverless API routes, and edge functions for lighter backend logic |
| **Google Cloud Run** *(optional)* | Runs advanced backend services—webhooks, scheduled jobs, complex business logic, AWS Arctic integration—when Vercel alone is insufficient |
| **Google OAuth** | Primary social sign-in for clients (and optionally staff); expandable to other providers later |
| **Payment Provider (Stripe)** | Checkout for monitoring and cloud backup; webhooks update portal subscription status |
| **QuickBooks Desktop (Canada)** | *(Follow-on)* System of record—see Section 23 |
| **Local QuickBooks Bridge** | *(Follow-on)* Windows process on office QB machine |
| **Cloud task queue** | *(Follow-on)* Supabase tables for QB posting tasks |
| **Accounting MCP server** | *(Future product)* Structured tools for NL accounting agent—not current portal MVP |
| **Email Service** | Invitation emails, alerts, caller ID change notifications, footage-ready links, device expiry warnings (Supabase, Resend, SendGrid, etc.—dev team choice) |
| **AWS Arctic Archive Storage** | Long-term, cost-effective storage for archived camera footage; retrieval source for footage requests. AWS CLI access is available in the new dev environment |
| **Camera Systems** | Source of live and archived video (integration details with camera vendor to be confirmed) |

### Infrastructure notes for the development team

| Decision | Guidance |
|----------|----------|
| **Vercel vs Cloud Run** | Start with Vercel for the Next.js app and simpler API routes. Introduce Cloud Run when business logic, long-running jobs, or integration complexity warrants a dedicated service |
| **Cloud Run vs legacy Elastic Beanstalk** | Prefer Cloud Run for lower cost and simpler ops. Elastic Beanstalk remains an option only if AWS-proximity latency for Arctic retrieval measurably outweighs Cloud Run benefits—the team should benchmark both |
| **Cloud Run + AWS Arctic** | Cloud Run can integrate with AWS Arctic via AWS SDK/API credentials—no requirement to stay on Elastic Beanstalk for storage access |
| **Backend language on Cloud Run** | TypeScript/Node.js is preferred (aligns with Next.js); Java is acceptable if the team prefers it for specific services |
| **Security boundary** | Never expose service-role Supabase keys or AWS credentials to the client. RLS protects client data; privileged operations run server-side only |

### Domains & environments

| Domain / Service | Purpose |
|------------------|---------|
| `mckeesecurity.ca` | Production website and portal (Vercel) |
| Supabase project | Auth, database, RLS |
| Cloud Run service(s) | Optional backend microservices |
| AWS (Arctic/Glacier) | Archived footage storage and retrieval |
| QuickBooks Desktop PC | Windows host running company file + local bridge (office machine—not 24/7) |

See [Section 23](#23-quickbooks-integration--portal-scope--future-roadmap) for what is **in scope now** vs **future**. Full detail: [`QUICKBOOKS_ACCOUNTING_DISCOVERY.md`](./QUICKBOOKS_ACCOUNTING_DISCOVERY.md).

---

## 14. Brand, UX & Experience Guidelines

The portal must deliver an **exceptional user interface and user experience** on both **desktop and mobile**. It is part of the rebuilt McKee Security website (`mckeesecurity.ca`)—not a visually separate product. Clients should feel they never left the main site.

### 14.1 Integration with mckeesecurity.ca

| Requirement | Detail |
|-------------|--------|
| **Visual continuity** | Reuse typography, spacing, header/footer patterns, and design tokens from the rebuilt website wherever possible |
| **Shared component library** | Prefer the same UI primitives (buttons, forms, cards, modals) as the main site build |
| **Navigation** | Portal navigation should feel native—consistent placement, hover states, and mobile menu behavior |
| **Brand authority** | If `frontend-react-app/BRANDING_GUIDELINES.md` conflicts with the live site's evolved styles, **the live mckeesecurity.ca rebuild takes precedence**—the portal follows the current site |
| **Dark theme** | Portal remains dark-themed per brand guidelines; ensure contrast and readability match or exceed the main site's accessibility standards |

The development team should inspect the production/staging mckeesecurity.ca codebase for tokens, CSS variables, and layout patterns before building dashboard UI from scratch.

---

### 14.2 UX Quality Bar

| Area | Expectation |
|------|-------------|
| **Desktop** | Full dashboard layout up to 1400px; clear information hierarchy; scannable sections |
| **Mobile** | Fully usable on phones—no horizontal scroll, touch-friendly targets (min ~44px), collapsible sections, sticky primary actions where helpful |
| **Tablet** | Graceful intermediate layout at ~768px breakpoint |
| **Loading** | Skeleton states or branded spinners—never blank screens during data fetch |
| **Empty states** | Helpful copy when a client has no caller IDs, no cloud backup, or pending activation |
| **Errors** | Plain-language messages with recovery actions (retry, contact support) |
| **Forms** | Inline validation, clear required fields, accessible labels |
| **Critical actions** | Confirm destructive actions (cancel plan, delete contact) with explicit dialogs |
| **Performance** | Perceived speed matters—optimize auth checks and dashboard data loading |

**Goal:** A client should be able to update their caller ID list or check device status in under a minute on a phone without frustration.

---

### 14.3 Visual identity

| Element | Specification |
|---------|---------------|
| **Primary brand color** | Dark crimson `#660000` — buttons, links, accents, call-to-action |
| **Theme** | Dark mode throughout — no light backgrounds |
| **Primary background** | Deep black-gray `#1a1a1a` |
| **Card/surface background** | Dark charcoal `#2d2d2d` |
| **Primary text** | White `#ffffff` |
| **Secondary text** | Light gray `#e0e0e0` |
| **Success** | Green `#2e7d32` |
| **Warning** | Amber `#f57c00` |
| **Error** | Distinct red `#d32f2f` (separate from brand crimson) |

### Layout

| Element | Guideline |
|---------|-----------|
| **Dashboard max width** | Up to 1400px for full dashboard layouts |
| **Content cards** | Up to 600px for focused content |
| **Responsive breakpoints** | Tablet at 768px, mobile at 640px |

### Tone & personality

- **Sophisticated** — rich dark palette, strategic use of white text
- **Confident** — bold brand color on primary actions
- **Professional** — clear typography hierarchy, consistent spacing
- **Accessible** — high contrast ratios, visible focus states for keyboard navigation

### Key UI patterns

- Primary actions use brand crimson buttons
- Cards use dark charcoal with subtle borders
- Loading states use brand-colored spinners
- Expired/warning states use amber or error colors—not brand crimson
- Login button labeled **Manage Account** or clear **Continue with Google** / **Sign in with email** options
- Google sign-in button should follow familiar Google branding guidelines for trust and recognition

*Full design token specifications are available in `frontend-react-app/BRANDING_GUIDELINES.md`.*

---

## 15. Future Enhancements (Optional)

The following are mentioned in planning documents as **optional future features**, not core MVP:

| Feature | Benefit |
|---------|---------|
| **Additional auth providers** | Apple, Microsoft, or others beyond Google |
| **Technician dashboard** | Field staff can view and update assigned installation tasks |
| **Audit logs** | Track all admin changes for compliance and troubleshooting |
| **Pre-maintenance email reminders** | Notify clients months before device expiry (not just after) |
| **Client support chat** | Embedded third-party chat widget for live support |
| **Cloud storage usage display** | Show GB used per client for cloud backup |
| **Invoice history** | Display past payment invoices from payment provider |
| **Usage heatmaps / analytics** | Dashboard analytics for admin on subscription and usage patterns |
| **Monthly summary emails** | Automated monthly account summary sent to clients |

---

## 16. Current Prototype Status

To set expectations: the **legacy codebase in this directory** is an early portal prototype from the WordPress era (WordPress plugin + injected React + Cognito + separate Node backend). It is **not** the current mckeesecurity.ca website—which has **already been rebuilt** on Next.js and Vercel without WordPress.

| What | Status |
|------|--------|
| **Public website (`mckeesecurity.ca`)** | Migrated — modern Next.js stack, no WordPress |
| **Customer/admin portal (this product)** | Not yet built — to be added natively into the live site |
| **Code in this handover folder** | Historical reference only (~5–10% of intended portal scope) |

Use this folder for product intent, branding notes, and UX copy tone—not as the codebase to extend.

### What the legacy prototype demonstrates

| Feature | Status |
|---------|--------|
| Basic client login/logout concept | Working (legacy Cognito flow) |
| Client dashboard — welcome / logged-in greeting | Working |
| Branding guidelines documented | Complete |
| Product vision documented in Word docs | Complete |

### What the new team builds from scratch on Supabase + Vercel

| Feature | Status |
|---------|--------|
| Supabase Auth (Google + email/password) | To build |
| Row Level Security policies | To build |
| Security monitoring section (view tier/status) | To build |
| Cloud backup section (plan, cancel, footage) | To build |
| Caller ID management | To build |
| Device maintenance tracker | To build |
| Payment / checkout integration | To build |
| Admin dashboard (all features) | To build |
| Account activation flow (invite + Google/email) | To build |
| AWS Arctic footage retrieval | To build |
| Automated device expiry checks | To build |
| Email notifications (all types) | To build |

**Estimated completion of intended product scope in legacy prototype: ~5–10%**

The new team should treat this handover as the **source of truth for portal product requirements**, build into the **already-migrated** mckeesecurity.ca codebase, and use Section 19 as technical direction—not extend the legacy prototype in this folder.

---

## 17. Planning Document Evolution

Three Word documents in the project root describe the product at different stages of refinement. The new team should understand how requirements evolved:

### Document 1: User-Admin-Dashboard Theory.docx
- **Focus:** High-level architecture concept
- **Model:** Single subscription tier per user (`SecurityBasic`, `SecurityPro`)
- **Key idea:** Admin assigns tier; client only pays; two dashboards with different auth approaches

### Document 2: Development Roadmap.docx
- **Focus:** Phased build plan for foundational features
- **Model:** Still single-tier, but adds account setup flow and Stripe subscribe button
- **Key idea:** Admin creates user → client sets up account → client pays for assigned tier

### Document 3: Advanced Multi-Product SASS Roadmap.docx *(most complete — treat as primary reference)*
- **Focus:** Full multi-product platform
- **Model:** Multiple services per user (security + cloud backup), each with own tier and status
- **Adds:** Caller ID management, device maintenance, AWS Arctic footage, email alerts, database-first service records

### Recommended interpretation for rebuild

Use the **Advanced Multi-Product roadmap** as the primary specification for *product scope*. The earlier documents describe a simpler MVP that was superseded as the product scope expanded. Where the simpler docs conflict with the advanced doc, follow the advanced doc.

**However:** All three documents date from the original development effort. Treat their technical suggestions (Cognito, WordPress shortcodes, specific API routes, etc.) as historical context. The new team should fulfill the same business capabilities using current best practices—not mirror outdated implementation choices.

---

## 18. Open Questions for the New Team

These items are not fully specified in planning documents and should be clarified with McKee stakeholders before or during development:

| # | Question |
|---|----------|
| 1 | What are the exact feature differences between Security Monitoring tiers (Basic, Standard, Pro)? |
| 2 | What are the prices for each cloud backup tier (7-day, 30-day, 90-day)? |
| 3 | Does the client pay for security monitoring through the portal, or is billing handled entirely offline/by admin? |
| 4 | What happens to cloud footage when a client cancels cloud backup (retention period, deletion policy)? |
| 5 | What is the activation link expiry policy for invite tokens? |
| 6 | What is the download link expiry period for footage requests? |
| 7 | Which admin email address(es) receive operational alerts? |
| 8 | How are cameras listed in the footage request form (fixed list per client, dynamic from camera system)? |
| 9 | Is caller ID change history required for admin, or is current list sufficient? |
| 10 | Should the technician role be included in the initial rebuild or deferred? |
| 11 | Are there specific compliance or privacy requirements for storing client addresses and caller ID data? |
| 12 | Should clients receive in-portal notifications in addition to email, or email only? |
| 13 | Should admin require a specific invite email before Google activation is allowed, or can any Google account activate via valid token? |
| 14 | Which workloads belong on Vercel vs Cloud Run (webhooks, cron, Arctic retrieval, Stripe)? |
| 15 | Is Elastic Beanstalk worth evaluating for AWS-proximity, or proceed with Cloud Run + AWS SDK from the start? |
| 16 | Minimum and maximum caller ID contacts per client? |
| 17 | Should caller ID change history be in MVP admin UI or backend-only for v1? |
| 18 | Exact QuickBooks chart of accounts for Stripe clearing, fees, HST/GST, and monitoring income? *(bookkeeper)* |
| 19 | Annual vs semi-annual vs monthly monitoring billing cycles—which first? |
| 20 | Which QuickBooks machine is the canonical bridge host? |

---

## 19. Target Platform & Rebuild Direction

This section describes a **recommended starting point** for the rebuild—not a rigid blueprint. Product requirements in Sections 1–18 define *what* must exist; this section suggests *how* it might be built today. The development team should adapt, substitute, or improve any part of this stack when a better approach exists.

### 19.1 Guiding Principles

| Principle | Meaning |
|-----------|---------|
| **Product first** | Business rules (admin-assigned tiers, caller ID alerts, device expiry, etc.) define success—not fidelity to old documents or the legacy prototype |
| **Modern by default** | Prefer current best practices over patterns from the original multi-year-old plan (WordPress shortcodes, Cognito Hosted UI, separate auth subdomains, etc.) |
| **Modern UX** | Prefer frictionless patterns—especially Google sign-in—for client-facing flows |
| **Security by default** | Strong auth, row-level data isolation, server-side privilege checks, no secrets in the browser |
| **Pragmatic architecture** | Use the simplest secure approach that works; add complexity (e.g., Cloud Run) only when justified |
| **Team ownership** | The development team chooses libraries, schema design, API shape, deployment split, and UX details. Document decisions; don't wait for verbatim instructions |

### 19.1.1 Fixed vs Flexible (at a glance)

| Fixed (business requirements) | Flexible (team decides) |
|--------------------------------|-------------------------|
| Admin creates accounts; no public signup | Exact invite/activation UX and token strategy |
| Security tier assigned by admin; client read-only | Dashboard layout, section order, mobile patterns |
| Cloud backup self-service + footage requests | Vercel-only vs Cloud Run split |
| Caller ID changes notify admin | Email provider, template design, diff format |
| Device expiry rules (5 yr / 10 yr) | Cron platform, reminder timing, optional pre-alerts |
| McKee branding (dark theme, crimson accent) | Component library, typography stack, animation |
| Footage retrieved from AWS Arctic archive | Retrieval service design, queue vs sync, link expiry |
| Supabase + Next.js as general direction | Exact RLS policy structure, table names, edge cases |

---

### 19.2 Target Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│  mckeesecurity.ca — Next.js + TypeScript (Vercel)           │
│  Client dashboard · Admin dashboard · Account activation    │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ Supabase Auth   │ │ Supabase DB  │ │ Vercel Server        │
│ Google OAuth    │ │ PostgreSQL   │ │ Functions / API      │
│ Email/password  │ │ + RLS        │ │ Routes (lighter      │
│ Roles           │ │              │ │ backend logic)       │
└─────────────────┘ └──────────────┘ └──────────┬───────────┘
                                                 │
                           Optional when needed ▼
                                    ┌────────────────────────┐
                                    │ Google Cloud Run       │
                                    │ Webhooks · Cron ·      │
                                    │ Arctic retrieval ·     │
                                    │ Complex business logic │
                                    └───────────┬────────────┘
                                                │
                                                ▼
                                    ┌────────────────────────┐
                                    │ AWS Arctic Archive     │
                                    │ (footage storage)      │
                                    └────────────────────────┘
```

---

### 19.3 Frontend — Next.js on Vercel

| Aspect | Direction |
|--------|-----------|
| **Framework** | Next.js (App Router recommended) |
| **Language** | TypeScript throughout |
| **Hosting** | Vercel |
| **Integration** | Portal pages are part of the rebuilt McKee website—not a WordPress plugin or separate subdomain app |
| **Auth client** | Supabase client libraries for session handling, Google OAuth, and email/password |

The development team owns component structure, state management, and UI library choices (e.g., shadcn/ui, Tailwind—already common in modern Next.js stacks).

---

### 19.4 Authentication — Supabase Auth + RLS

| Aspect | Direction |
|--------|-----------|
| **Provider** | Supabase Auth |
| **Client sign-in methods** | **Google OAuth** (launch with this) + **email/password** |
| **Future providers** | Apple, Microsoft, etc.—architecture should allow adding more without rewriting core flows |
| **Account creation** | Admin-provisioned only; no public registration page |
| **Activation** | Secure invite link → client activates via Google or email/password (Section 8) |
| **Admin access** | Admin role in Supabase; protected routes + RLS policies |
| **Data isolation** | **Row Level Security (RLS)** on all client-scoped tables—clients can only read/write their own rows |

**RLS expectations (conceptual):**

| Data | Client policy | Admin policy |
|------|---------------|--------------|
| Own profile & services | Read (and limited write where allowed) | Full read/write |
| Own caller ID list | Read/write | Read all clients |
| Own device records | Read only | Read/write all clients |
| Own footage requests | Read/create own | Read all |
| Other clients' data | **No access** | As role permits |

Server-side service role keys must only be used in trusted server contexts (API routes, Cloud Run)—never exposed to the browser.

---

### 19.5 Database — Supabase (PostgreSQL)

All business records described in Section 10 live in Supabase:

- Client profiles (linked to `auth.users`)
- Service subscriptions (`user_services` concept)
- Caller ID contacts
- Device maintenance records
- Footage requests
- Activation/invite tokens

The development team designs the schema, migrations, indexes, and RLS policies. Prefer normalized tables with clear foreign keys to `auth.users` or a `profiles` table.

**Scheduled jobs** (e.g., nightly device expiry checks) can run via:
- Supabase Edge Functions + pg_cron
- Vercel Cron
- Cloud Run scheduled jobs

Choose based on reliability and operational simplicity.

---

### 19.6 Backend Logic — Vercel vs Google Cloud Run

Not all business logic needs a separate backend. Use a tiered approach:

| Workload | Recommended home | Rationale |
|----------|-------------------|-----------|
| Page rendering, client UI | Vercel (Next.js) | Native hosting |
| Simple CRUD via Supabase client + RLS | Vercel + Supabase | RLS handles authorization |
| Stripe checkout session creation | Vercel API route or Cloud Run | Must be server-side; either works |
| Stripe webhooks | Cloud Run or Vercel (with raw body handling) | Needs reliable signature verification |
| Caller ID diff + admin email | Vercel API route or Cloud Run | Server-side email trigger |
| Device expiry cron (nightly) | Cloud Run, Vercel Cron, or Supabase cron | Scheduled execution |
| AWS Arctic footage retrieval | **Cloud Run recommended** | AWS SDK integration, potentially long-running |
| Admin bulk operations | Cloud Run or Vercel | Depends on complexity |

**When to introduce Cloud Run:** When the team needs long-running processes, heavier AWS integration, isolated scaling, or cleaner separation of privileged backend services. There is no requirement to use it on day one if Vercel + Supabase covers MVP needs—except where AWS Arctic integration complexity pushes toward a dedicated service.

**Legacy Elastic Beanstalk:** The previous prototype used AWS Elastic Beanstalk. For the rebuild, **Google Cloud Run is preferred** (lower cost, simpler deployment). Elastic Beanstalk remains a fallback only if latency to AWS Arctic storage is proven to be a bottleneck and co-location on AWS materially improves retrieval performance. Cloud Run integrating with AWS via SDK/credentials is the expected default path.

---

### 19.7 Cloud Storage — AWS Arctic Archive

| Aspect | Direction |
|--------|-----------|
| **Purpose** | Long-term, cost-effective storage for archived camera footage |
| **Provider** | AWS Arctic archive tier (Glacier-class storage) |
| **Access** | AWS CLI and credentials available in the new development environment |
| **Integration** | Footage request workflow initiates retrieval from Arctic; client receives secure expiring download link when ready |
| **Implementation** | Development team chooses SDK approach; likely lives in Cloud Run or a dedicated serverless function with AWS IAM credentials |

Keep storage costs down by using Arctic for cold/archive footage rather than hot storage tiers.

---

### 19.8 Languages & Runtime Choices

| Layer | Preferred | Acceptable alternatives |
|-------|-----------|-------------------------|
| **Frontend** | TypeScript + Next.js | — |
| **Vercel API routes** | TypeScript (Node.js runtime) | — |
| **Cloud Run services** | TypeScript / Node.js | Java, if team prefers for specific services |
| **Database** | SQL (PostgreSQL via Supabase) | — |

Aligning Cloud Run with TypeScript/Node.js reduces context-switching since the frontend is already TypeScript. Java is fine where the team has stronger expertise or existing libraries.

---

### 19.9 What the Team Should Decide During Build

The following are **intentionally left open**. The development team should propose approaches in early architecture review and is encouraged to choose options that are simpler or more modern than what the original plans assumed:

1. Exact Supabase invite/activation pattern (custom tokens table vs Supabase invite APIs vs magic links)
2. Vercel-only MVP scope vs immediate Cloud Run introduction
3. Email provider (Supabase built-in, Resend, SendGrid, etc.)
4. Payment provider details (Stripe assumed from planning docs; confirm with stakeholders—or propose alternatives)
5. Whether admin staff also use Google sign-in or email/password only
6. Cron/scheduler platform for device expiry checks
7. Cloud Run vs Elastic Beanstalk benchmark for Arctic retrieval latency (if footage requests are early MVP)—or skip Elastic Beanstalk entirely
8. In-portal notification system vs email-only for v1
9. Any UX, routing, or data-model improvements not described in the original plans

**Expectation:** Bring recommendations to McKee stakeholders; don't treat silence in this document as a requirement to build something a specific way.

---

### 19.10 Migration from Legacy Prototype

**Important distinction:**

| Artifact | Status |
|----------|--------|
| **mckeesecurity.ca (live website)** | Already on Next.js + Vercel — **WordPress migration complete** |
| **This directory (`Dashboard Software/`)** | Legacy portal **prototype only** — WordPress plugin + Cognito + Express; **do not extend** |
| **Portal product (this handover)** | **To be built** into the live Next.js website repo |

The legacy directory (`frontend-react-app`, `main-user-management`, WordPress plugin) should **not** be migrated line-by-line. Treat it as:

| Legacy artifact | Use for rebuild |
|-----------------|-----------------|
| Word planning documents | Product requirements (Sections 1–18) |
| `BRANDING_GUIDELINES.md` | Visual identity |
| Legacy login UX copy | Tone reference ("Manage Account", welcome messaging) |
| Cognito/WordPress/Elastic Beanstalk code | **Do not port**—replace with Supabase + Next.js + Vercel |

The subdomain `user-management.app-mckeesecurity.ca` from the legacy prototype will likely be retired in favor of Supabase Auth callbacks and Vercel-hosted API routes (exact URL structure is a dev team decision).

---

### 19.11 Why We're Leaving the Legacy Stack

The original customer-portal prototype—and the way it was meant to plug into the old website—used **WordPress**, **injected React apps via shortcodes**, **AWS Cognito**, **Elastic Beanstalk**, **MySQL session stores**, and a **separate auth subdomain**. That approach is **fully retired**. McKee has already completed a broader migration: the public website at `mckeesecurity.ca` is no longer WordPress. It has been **rebuilt from the ground up** on the modern stack (Next.js, TypeScript, Vercel) so the company can ship faster, integrate directly with AI development agents (CLI/MCP), and deliver a cohesive product experience for **both clients and internal administrative staff**.

This section explains why the legacy model was abandoned—not to criticize the original effort, but to give the new team clear context. The codebase in *this* handover directory is a **historical prototype** of the portal only. It does **not** represent the current website, which is already on the new stack.

#### What McKee already completed (website migration)

| Done | Detail |
|------|--------|
| **WordPress removed** | No more WordPress theme, plugins, or PHP maintenance for the public site |
| **No more injected React embeds** | Eliminated shortcode-mounted React bundles that loaded separately from the CMS |
| **Unified Next.js codebase** | Marketing pages, layout, navigation, and shared components live in one TypeScript project |
| **Vercel deployment** | Modern CI/CD, preview deployments, and environment management |
| **Agent-ready development** | Direct Cursor/agent integration via CLI and MCP (Supabase, Vercel, AWS, etc.) for faster iteration |

**Why WordPress + injected React had to go:**

- **Two platforms to maintain** — PHP/WordPress on one side, React build pipeline on the other; every change touched both
- **Slow and brittle UX** — loading spinners, fade-in hacks, and manifest/asset mismatches between plugin and frontend builds
- **Split routing and auth** — dashboard logic on different URLs/subdomains with CORS and cookie pain (`mckeesecurity.ca` vs `user-management.app-mckeesecurity.ca`)
- **Poor fit for a product suite** — hard to evolve toward admin tools, client portals, and integrated billing as first-class app features
- **Inefficient for the team** — agents and developers could not work in one coherent codebase with modern tooling

The website migration was driven by the same goal as this portal rebuild: **dramatically streamline development, increase efficiency, and deliver an incredible suite of software products**—for McKee staff and for clients.

#### What this handover is building next

The **customer and admin portal** described in this document is the next major capability to add **natively into the already-rebuilt site**—not as a WordPress plugin or iframe. Same repo, same design system, same deployment pipeline.

| Legacy approach | Limitation | Modern alternative | Benefit |
|-----------------|------------|-------------------|---------|
| **WordPress + React shortcode embed** | Slow, dual-stack, painful to manage; already **removed from production** | **Next.js pages in live mckeesecurity.ca repo** | Single codebase; shared layout; fast loads; portal feels native |
| **AWS Cognito Hosted UI** | Rigid hosted login; awkward cross-domain cookies; heavy admin user SDK work | **Supabase Auth** | Native Next.js integration; Google OAuth in minutes; flexible invite flows |
| **Elastic Beanstalk** | Heavier ops, higher baseline cost, slower iteration | **Vercel + optional Cloud Run** | Faster deploys, pay-per-use, simpler scaling |
| **Separate backend subdomain** | CORS/cookie complexity across domains | **Supabase + Vercel API routes** | Same-origin or simpler auth callbacks |
| **MySQL session store (Express)** | Extra infrastructure; session sync issues | **Supabase JWT sessions** | Stateless auth with RLS-backed data access |
| **Custom OAuth (openid-client)** | More code to maintain and secure | **Supabase Auth providers** | Battle-tested OAuth; less custom security surface |

#### Broader modernization wins (already in motion)

- **One stack for web + portal** — TypeScript and Next.js from marketing page to admin dashboard
- **RLS** replaces much custom auth middleware at the database layer
- **Supabase MCP / CLI** — agents and developers manage schema, migrations, and policies without context-switching
- **Direct agent integration** — Cursor agents with CLI/MCP access deploy, migrate, and test without the human running every command manually
- **Faster delivery loop** — preview URLs, shared components, and unified env management on Vercel

The development team should **never reintroduce WordPress, shortcode embeds, or a split CMS/app architecture**. If a legacy pattern from this directory or the Word docs suggests doing so, treat it as obsolete. Build portal features into the existing modern website the same way any other first-class app route would be built.

The team should feel empowered to reject any other legacy pattern (Cognito, Elastic Beanstalk, separate auth subdomain) that reintroduces the same pain points.

---

## 20. Suggested Build Phases (Recommended Order)

This is a **recommended sequencing**, not a mandatory project plan. Build incrementally: complete a phase, test it with real flows, get stakeholder sign-off where noted, then proceed. Skipping or reordering is fine if dependencies are respected.

### Phase 0 — Foundation & Design Alignment

**Focus:** Extend the **existing** mckeesecurity.ca Next.js project; wire up Supabase; align portal UI with the live design system.

| Deliver | Human checkpoint? |
|---------|-------------------|
| Supabase project (dev + staging recommended) | **Yes** — human creates project, provides URL/keys |
| Portal routes added to existing Vercel/Next.js repo | **Yes** — human confirms repo access and env var locations |
| Environment variables documented in a shared checklist | **Yes** — human adds secrets to Vercel/Supabase |
| Portal routes scaffolded (`/user-dashboard`, `/admin-dashboard`, `/account/activate`) | No |
| Shared UI tokens/components reused from live site (not re-invented) | No |
| Mobile-responsive layout shell (empty dashboard frames) | No |

**Test gate:** Portal pages render on desktop and mobile inside the live site chrome; Supabase connection verified.

---

### Phase 1 — Authentication, Roles & RLS Foundation

**Focus:** Sign-in works; data isolation is proven before any business features.

| Deliver | Human checkpoint? |
|---------|-------------------|
| Supabase Auth: Google OAuth + email/password | **Yes** — Google Cloud Console OAuth client, Supabase provider config |
| Admin vs client roles | No |
| RLS policies on `profiles` (or equivalent) | No |
| Client dashboard: sign-in / sign-out / welcome state | No |
| Admin dashboard: route protection for admin role | No |

**Test gate:** Client cannot access admin routes. User A cannot read User B's profile via API or direct query. Google and email login both work.

---

### Phase 2 — Admin Provisioning & Client Activation

**Focus:** End-to-end onboarding—the core operational loop.

| Deliver | Human checkpoint? |
|---------|-------------------|
| Admin: create pending client + assign tiers | No |
| Activation invite email | **Yes** — email provider + domain/DKIM if new |
| Activation page: Google + email/password paths | No |
| Link auth user → pending profile → show assigned tiers | No |
| Admin: resend activation link | No |

**Test gate:** Admin creates client → client receives email → activates via Google *and* separately test email path → sees assigned tiers on dashboard.

---

### Phase 3 — Service Display & Security Monitoring (Read-Only)

**Focus:** Client sees their subscriptions; admin can view/manage client list.

| Deliver | Human checkpoint? |
|---------|-------------------|
| `user_services` (or equivalent) schema + RLS | No |
| Client: Security Monitoring section (tier + status, read-only) | No |
| Client: Cloud Backup section (display only initially) | No |
| Admin: client list + view services | No |
| Admin: modify tiers, cancel/restart services | No |

**Test gate:** Tier changes by admin reflect immediately on client dashboard. Client has no controls to change security tier.

---

### Phase 4 — Caller ID & Device Maintenance

**Focus:** High-value daily operations features without external payment/storage dependencies.

| Deliver | Human checkpoint? |
|---------|-------------------|
| Caller ID CRUD + validation | No |
| Caller ID change email to admin | **Yes** — if new email templates/domains |
| Device maintenance display + expiry highlighting | No |
| Admin: update device install dates | No |
| Caller ID change history (recommended) | No |

**Test gate:** Caller ID save triggers admin email with correct diff. Expired device shows warning on client dashboard.

---

### Phase 5 — Stripe & Cloud Backup Billing

**Focus:** Self-service cloud backup subscriptions.

| Deliver | Human checkpoint? |
|---------|-------------------|
| Stripe products/prices for 7/30/90-day tiers | **Yes** — human creates Stripe account/products |
| Checkout session creation (server-side) | **Yes** — Stripe API keys in env |
| Webhook handler for subscription status | **Yes** — webhook URL registered in Stripe |
| Client: Change Plan, Cancel Plan | No |
| Tier validation before checkout | No |
| Payment success UX on dashboard | No |

**Test gate:** Full checkout in Stripe test mode; webhook updates service status; cancel flow works.

---

### Phase 6 — Footage Requests & AWS Arctic

**Focus:** Most complex integration—defer until core portal is stable.

| Deliver | Human checkpoint? |
|---------|-------------------|
| Footage request form + DB records | No |
| AWS IAM credentials / Arctic access | **Yes** — human provisions AWS access |
| Retrieval service (likely Cloud Run) | **Yes** — human creates Cloud Run service if used |
| Email with expiring download link | No |
| Request status lifecycle (pending → ready/failed) | No |

**Test gate:** End-to-end test with dummy archive object in AWS; client receives working time-limited link.

---

### Phase 7 — Automation, Hardening & Launch Polish

**Focus:** Production readiness.

| Deliver | Human checkpoint? |
|---------|-------------------|
| Nightly device expiry cron | **Yes** — if new scheduler/cron service |
| Failed auth/setup logging and monitoring | Optional — Sentry, LogTail, etc. |
| Full mobile UX pass on all sections | No |
| Security review: RLS audit, webhook signatures, rate limits | No |
| Staging → production promotion | **Yes** — human confirms prod env vars and DNS |

**Test gate:** Stakeholder walkthrough on mobile and desktop; expiry cron fires in staging; security checklist (Section 22) satisfied.

---

### Phase dependency summary

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
                              ↘ Phase 5 and 6 can swap order if footage is lower priority
```

**Parallel track — QuickBooks integration (Section 23):** **Optional follow-on** after core portal Phases 0–5 are stable. **Do not block portal MVP on QuickBooks.** Design Stripe webhooks and customer records in Phase 5 so QB tasks can be added later without rework. The **natural-language accounting agent and full MCP tool suite** are a **future product** (QB Phases 5–6)—not this implementation.

---

## 21. Development Workflow — Human Checkpoints & Agent Access

Building this portal involves spinning up external services, secrets, and integrations. **The human administrator (McKee stakeholder) has final authority** over which services are created and when. The development agent or team **recommends** what to set up, **why**, and **what env vars are needed**—then **pauses** until the human confirms the infrastructure is live.

### 21.1 When to pause for human action

Stop forward development and request human setup when any of the following is needed for the first time (or a new environment):

| Trigger | Human action required | Agent/team provides |
|---------|----------------------|---------------------|
| New Supabase project or branch | Create project; share URL, anon key, service role key (securely) | Schema migration list; RLS policy summary |
| Google OAuth | Create OAuth client; configure redirect URIs in Google Cloud + Supabase | Exact redirect URLs; consent screen copy |
| Vercel deployment / env vars | Add variables in Vercel dashboard; confirm deployment succeeds | `.env.example` with descriptions (no secret values) |
| Email provider (Resend, SendGrid, etc.) | Create account; verify domain; add API key | DNS records needed; template requirements |
| Stripe | Create account/products/webhook endpoint | Webhook URL; required events list |
| AWS Arctic / IAM | Create IAM user/role with least-privilege Arctic access | Policy JSON; bucket/archive identifiers |
| Google Cloud Run | Create service; configure secrets; deploy container | Dockerfile/service spec; env var list |
| Custom domain / DNS | Point records; confirm SSL | DNS record table |
| Production promotion | Approve go-live checklist | Staging test results |
| **QuickBooks Desktop bridge host** | Install bridge software on designated Windows PC; grant SDK access to company file | Bridge installer spec; qbXML command list |
| **QuickBooks SDK / company file access** | Authorize application in QuickBooks; confirm Canadian edition compatibility | SDK version notes (Desktop SDK 17.x supports QB 2023 R16+ / 2024 R18+ Canada) |
| **Stripe ↔ accounting reconciliation** | Bookkeeper confirms GL accounts for clearing, fees, HST | Account mapping document |

**Rule:** Do not assume secrets exist. Do not commit secrets to the repo. Confirm with the human: *"Have you added `[ENV_VAR]` to Vercel/Supabase and verified the service is responding?"*

---

### 21.2 Human–agent decision model

```
Agent/team identifies need for new service or integration
        ↓
Agent explains: what, why, recommended approach, alternatives, cost/ops impact
        ↓
Human decides: approve, defer, or choose alternative
        ↓
Human provisions infrastructure and env vars
        ↓
Human confirms: "It's live" (URL, test ping, or screenshot)
        ↓
Agent verifies connectivity (CLI/MCP) then continues development
```

The agent has **freedom to recommend**; the human has **final say**. If the human defers an integration (e.g., footage/Arctic until later), the team builds against stubs or feature flags until ready.

---

### 21.3 Agent & developer tooling access

To streamline development, the agent (Cursor) or developers should have **direct access** to manage services where safe:

| Tool | Use for |
|------|---------|
| **Supabase CLI** | Migrations, local dev, type generation, policy testing |
| **Supabase MCP server** | Schema inspection, project management from the IDE |
| **Vercel CLI** | Deployment previews, env inspection (not secrets in chat) |
| **AWS CLI** | Arctic/Glacier operations, retrieval testing (when credentials provided) |
| **Stripe CLI** | Webhook forwarding during local/preview dev |
| **QuickBooks bridge logs** | Inspect queue state and sync status (when bridge deployed) |
| **GitHub CLI (`gh`)** | PRs, CI status |

**Note:** **Cursor/Supabase MCP** above is for **development** (schema, deploys). The **accounting MCP server** (staff-facing NL agent tools) is a **future product**—Section 23.5—not required to build the portal.

**Human responsibility:** Provision credentials and MCP/CLI auth for the agent at project start where possible. Without CLI/MCP access, the agent relies on the human to run commands—slowing iteration.

**Security note:** Service role keys and AWS credentials must never appear in client-side code, chat logs, or public repos.

---

### 21.4 Environment strategy (recommended)

| Environment | Purpose |
|-------------|---------|
| **Local** | Supabase local dev or linked dev project; Stripe test mode |
| **Staging / Preview** | Vercel preview deployments; Supabase staging project or branch |
| **Production** | Live mckeesecurity.ca portal; production Supabase; Stripe live mode |

Maintain a living **`ENV_SETUP.md`** or similar (created by dev team) listing every variable, which service owns it, and which phase requires it—updated at each human checkpoint.

---

## 22. Security Hardening & Quality Expectations

These items come from the original Phase 10 security/QA planning and modern best practices. They are **expectations for production**, not optional nice-to-haves.

### 22.1 Authentication & authorization

| Control | Expectation |
|---------|-------------|
| **RLS everywhere** | Every client-scoped table has policies tested with client, admin, and anonymous roles |
| **Server-side admin checks** | Admin APIs verify role even if RLS exists—defense in depth |
| **No open registration** | Public sign-up disabled; activation requires valid invite token |
| **Invite token security** | Single-use, expiring, cryptographically random tokens |
| **Google account linking** | Prevent hijacking: valid token required to link Google to pending profile |
| **Session handling** | Use Supabase session refresh; secure cookie settings on production domain |

### 22.2 API & integration security

| Control | Expectation |
|---------|-------------|
| **Stripe webhooks** | Verify signatures; idempotent processing; never trust client-reported payment alone |
| **Tier validation** | Server validates assigned tier before creating checkout session |
| **CORS / origin** | Restrict sensitive API routes to mckeesecurity.ca (and staging domains) |
| **Rate limiting** | Login, activation, and footage request endpoints rate-limited to prevent abuse |
| **AWS credentials** | IAM least privilege; only on server/Cloud Run; rotate if exposed |
| **Footage download links** | Time-limited, signed URLs; no permanent public links |

### 22.3 Observability & failure handling

| Control | Expectation |
|---------|-------------|
| **Failed login / activation logging** | Log failed attempts without storing passwords |
| **Webhook failures** | Alert or retry queue if Stripe/webhook processing fails |
| **Email failures** | Log and surface admin-visible errors if invite or alert email fails |
| **Footage retrieval failures** | Update request status to `failed`; notify client and admin |
| **Error boundaries** | React error boundaries on dashboard sections so one failure doesn't blank the whole page |

### 22.4 QA expectations before launch

- Cross-browser smoke test (Chrome, Safari, Firefox; iOS Safari + Android Chrome for mobile)
- RLS penetration test: two test clients cannot access each other's data
- Stripe test mode full flow + webhook replay
- Admin workflow: create → activate → modify tier → cancel service
- Accessibility spot check: keyboard navigation, focus rings, form labels

---

## 23. QuickBooks Integration — Portal Scope & Future Roadmap

This section clarifies **what belongs in the current portal implementation** vs what is **planned as a separate future product** (full MCP + natural-language accounting agent). Discovery research is preserved in [`QUICKBOOKS_ACCOUNTING_DISCOVERY.md`](./QUICKBOOKS_ACCOUNTING_DISCOVERY.md)—that document describes the **entire eventual MCP/accounting vision**; **this handover does not require building all of it now**.

**McKee will continue using QuickBooks Desktop (Canada)** as the accounting system of record when integration is built. There is no plan to migrate to QuickBooks Online for this initiative.

---

### 23.0 Implementation scope — read this first

| Scope | What it includes | When |
|-------|------------------|------|
| **A. Core portal (primary focus)** | Sections 1–22, Section 20 Phases 0–7: auth, dashboards, services, caller ID, devices, Stripe checkout, footage, emails | **Current implementation** |
| **B. QuickBooks plumbing (follow-on)** | Local Windows bridge, cloud task queue, Stripe webhook → enqueue QB post, admin sync/queue UI, idempotency, `needs_review` | **After portal MVP stable** — QB Phases 1–3 in §23.12 |
| **C. Accounting automation (future product)** | NL accounting agent, full MCP tool suite, batch monitoring invoices, collections, estimates/POs, AR dashboards, draft emails via agent | **Future** — QB Phases 4–6; see discovery doc |

**Do not conflate B and C.** The **MCP server + “ask the agent to do accounting tasks”** experience is essentially **another product** built on top of the same queue/bridge foundation. Current work should **design for it** (structured tasks, audit fields, cloud API) but **not implement** the full agent surface.

**What “basic MCP setup” means in the current context:** Infrastructure patterns that help **development** (Supabase MCP, Stripe CLI, bridge logging)—plus a **cloud API and task schema** that *could* expose MCP tools later. **Not** shipping a staff-facing conversational accounting assistant in portal v1.

---

### 23.1 How this connects to the client portal *(follow-on integration)*

When built, QuickBooks integration extends the portal—not replaces it:

| Portal capability | QuickBooks tie-in *(when live)* |
|-------------------|----------------------------------|
| Security monitoring pay | Stripe webhook → optional QB receive-payment task |
| Client profile | Optional sync to QB customer ListID |
| Admin dashboard | Payment sync status, task queue, needs-review *(not NL agent in v1)* |
| Cloud backup Stripe | Same webhook → queue pattern |

Design Stripe webhooks and customer IDs in portal Phase 5 so QB tasks can plug in later without rework.

---

### 23.2 Recommended architecture (hybrid local + cloud)

QuickBooks Desktop runs on an **office Windows machine** with the live company file—it is **not** available 24/7. The architecture must tolerate that.

```
Client portal / Admin dashboard
        ↓
Cloud Management API  (Vercel / Cloud Run + Supabase PostgreSQL)
        ↓
Durable task queue + audit log  (+ optional read mirrors)
        ↓
Local QuickBooks Bridge  (Windows — office PC)
        ↓
QuickBooks Desktop company file  (system of record)

(Future: AI agent / MCP tools → same Cloud API — not in portal v1)
```

| Layer | Role |
|-------|------|
| **Cloud** | Stripe webhooks, task queue, admin queue UI, logging |
| **Local bridge** | Only component that talks to QuickBooks via **Desktop SDK / qbXML** |
| **QuickBooks Desktop** | Authoritative financial data |

**Canadian context:** Desktop SDK / qbXML (SDK 17.x) supports QuickBooks Desktop Canada (2023 R16+, 2024 R18+).

**Preferred integration path:** Custom local Windows bridge using Desktop SDK/qbXML directly.

**Alternative:** QuickBooks Web Connector polling a cloud web service (valid if team prefers; still requires local Windows component).

**Avoid as primary:** Screen-scraping / RPA automation of the QuickBooks UI—fragile and unsupported.

The cloud layer can live primarily in **Supabase** (task tables, mirrored customers/invoices, RLS for admin) with **Cloud Run** or Vercel functions for webhooks and MCP API—team's choice.

---

### 23.3 Why an offline-safe queue is non-negotiable

If a client pays monitoring fees at 9 PM and the QuickBooks PC is off, the payment **must still succeed** in Stripe and the portal. Accounting posts **later**.

Every QuickBooks write becomes a **durable task** with explicit state:

`pending` → `validated` → `ready_for_quickbooks` → `in_progress` → `posted_to_quickbooks` | `failed` | `needs_review` | `cancelled`

Task types include (examples): create/update customer, create invoice, receive payment, create estimate, sync balances, AR aging report pull.

Each task stores: idempotency key, source (Stripe event ID, portal user, agent tool), payload JSON, attempt count, errors, approval metadata, QuickBooks transaction IDs/edit sequences on success.

---

### 23.4 Local bridge responsibilities

The bridge on the QuickBooks machine should:

1. Authenticate to the cloud API
2. Poll for pending tasks (or receive push notification to wake)
3. Validate payloads against **predefined commands**—no arbitrary writes
4. Execute qbXML requests; capture responses and QB object IDs
5. Report success/failure back to cloud
6. Periodically **sync read-only mirrors** (customers, open invoices, balances) so portal and agents can answer questions when QB is offline

Example command families (team defines exact API): `customer.query|create|update`, `invoice.create|query`, `receive_payment.create`, `estimate.create|update`, `item.query`, `report.ar_aging`, etc.

---

The cloud layer can live primarily in **Supabase** (task tables, RLS for admin) with **Cloud Run** or Vercel functions for Stripe webhooks—team's choice.

---

### 23.5 Natural-language accounting agent & MCP *(future product — not current portal MVP)*

> **This subsection describes a separate future product.** It is documented so the portal and queue are **designed compatibly**, but **implementing** the NL accounting agent, full MCP tool registry, draft/post chat UX, collections automation, and batch invoicing via conversation is **out of scope** for the current portal handover.

McKee's long-term vision: authorized staff interact with accounting through **plain English**, via an MCP tool layer on top of the same cloud API and task queue—not by giving AI unrestricted QuickBooks access.

**Future flow (when built):**

```
Staff natural-language request
        ↓
AI selects approved MCP tool
        ↓
Cloud API validates permissions
        ↓
Read / Draft / Post (with approval) → task queue → local bridge → QuickBooks
```

Example future requests: overdue invoice queries, draft monitoring batches, draft collection emails, revenue summaries.

**For current implementation:** Ensure task queue records, idempotency, approval fields, and cloud API endpoints are structured so MCP tools can be added later without redesign. **Do not build** the agent UI, tool catalog, or posting-from-chat flows in portal v1.

Full permission tiers, example tools, and agent categories: [`QUICKBOOKS_ACCOUNTING_DISCOVERY.md`](./QUICKBOOKS_ACCOUNTING_DISCOVERY.md) Sections 12, 21.

### 23.6 Permission model *(apply when integration is built; agent tiers = future)*

For **portal follow-on** (admin UI + queue): posting tasks require explicit approval; no unrestricted writes.

| Tier | Portal v1 / follow-on | Future MCP agent product |
|------|----------------------|---------------------------|
| **Read-only** | Admin views sync status, mirrored balances (optional) | Agent queries via MCP read tools |
| **Draft** | — | Agent drafts estimates, invoices, emails for review |
| **Posting** | Admin approves queued tasks from Stripe/portal | Agent requests post → same approval queue |
| **Disabled** | Void/delete, journal entries, chart of accounts changes | Same restrictions |

Collection emails and batch invoicing: **future product** (discovery doc §17–19).

### 23.7 Priority workflow when integration is built: monitoring payments

The **first QuickBooks integration milestone** (QB Phase 3) is: portal Stripe payment → webhook → queue → receive payment in QuickBooks—not the full agent or batch billing suite.

Target for **follow-on scope only**:

- Post Stripe monitoring/cloud payments into QuickBooks via queue
- Admin sees sync status in dashboard
- Failed / needs-review tasks handled in admin UI

Batch invoices, AR aging dashboards, collection drafts: **future product** (QB Phase 4+).

### 23.8 Stripe reconciliation (confirm with bookkeeper)

Automation must preserve proper accounting—not treat net Stripe deposits as gross revenue.

Conceptual pattern:

```
Customer pays $X via Stripe
        ↓
QuickBooks: gross payment / invoice at full amount
        ↓
Stripe processing fee recorded separately
        ↓
Net payout reconciled to bank deposit via clearing account
```

Likely accounts ( **names must be confirmed with bookkeeper** ): Stripe Clearing, Stripe Fees, Bank, Monitoring Income, HST/GST Payable, Accounts Receivable.

---

### 23.9 Idempotency & conflict handling

**Idempotency examples:**

- `stripe_payment:{payment_intent_id}`
- `monitoring_invoice:{customer_id}:{billing_period}`
- `receive_payment:{invoice_txn_id}:{payment_intent_id}`

**Move to `needs_review` instead of guessing:**

- Payment received but no matching invoice
- Two possible QuickBooks customer matches
- Amount mismatch beyond tolerance
- Invoice already paid manually in QB
- QuickBooks rejects qbXML write
- Duplicate Stripe webhook (safe ignore)

If QuickBooks file is restored from backup or manually edited, sync logic should detect drift and flag review—not blindly overwrite.

---

### 23.10 Data sync strategy

The cloud database is a **working mirror + queue**, not a replacement for QuickBooks.

Mirror enough to power portal, dashboards, and agents:

Customers, jobs, open invoices, payments, estimates, items/services, open balances, monitoring billing status, AR aging snapshots, transaction cross-refs (ListID, TxnID, EditSequence).

QuickBooks wins on conflict for **posted financial data** unless an admin approves a corrective task.

---

### 23.11 Future automation *(future MCP/accounting product)*

Documented in discovery; **not current portal scope:**

- Estimate/invoice/PO automation via agent
- Collections automation and AR dashboards
- Batch monitoring invoice creation
- Job profitability and advanced reporting

See [`QUICKBOOKS_ACCOUNTING_DISCOVERY.md`](./QUICKBOOKS_ACCOUNTING_DISCOVERY.md) Sections 16–20.

---

### 23.12 Suggested QuickBooks build phases

**Follow-on to portal MVP — optional parallel track.**

#### Current implementation target (Scope B)

| Phase | Focus | Portal dependency |
|-------|--------|-------------------|
| **QB-1** | Read-only bridge POC: customer/invoice/payment query, logging, Supabase schema | Portal Phase 1+ (auth/DB) |
| **QB-2** | Task queue, bridge polling, state machine, idempotency, admin queue UI | QB-1 |
| **QB-3** | Stripe monitoring payment → webhook → queue → receive payment in QB | Portal Phase 5 (Stripe) |

**End state for current scope:** Customer pays on portal → Stripe webhook → portal updated → QB task posts when office PC online → admin sees sync status.

#### Future product (Scope C — do not build in portal v1)

| Phase | Focus |
|-------|--------|
| **QB-4** | Monitoring billing automation: invoice batches, paid/unpaid dashboards, payment links at scale |
| **QB-5** | **MCP server + natural-language accounting agent** (separate product) |
| **QB-6** | Estimates, collections, advanced reporting via agent + admin UI |

---

### 23.13 Team freedom & constraints

**Fixed:**

- QuickBooks Desktop stays; no forced cloud accounting migration
- No unrestricted AI or website writes to QuickBooks
- Offline-safe queue; Stripe webhooks as payment truth
- Approval gates for posting; audit trail for accounting tasks
- Canadian QB Desktop compatibility

**Flexible:**

- Bridge implementation language (C#/.NET common for SDK; team choice)
- Cloud Run vs Supabase Edge Functions for webhooks
- MCP server hosting and exact tool granularity
- Web Connector vs custom SDK bridge
- Which monitoring billing cycle to automate first

When discovery details conflict with portal-only assumptions, **Sections 1–22 govern the current build**; Section 23 Scope B governs optional QuickBooks follow-on; **full MCP/agent scope lives in the discovery doc as a future product**.

---

## Appendix A — Page & Feature Checklist

Use this as a build checklist for the new team:

### Client Dashboard (`/user-dashboard`)
- [ ] Sign in / sign out (Google + email/password via Supabase Auth)
- [ ] Row Level Security verified—clients cannot access other clients' data
- [ ] Welcome header with client name
- [ ] Section: Security Monitoring (read-only tier + status)
- [ ] Section: Cloud Backup (tier, status, change plan, cancel)
- [ ] Section: Cloud Backup — Request Footage form
- [ ] Section: Caller ID (list, add, remove, save)
- [ ] Section: Device Maintenance (battery date, smoke date, expiry highlight)
- [ ] Payment / Subscribe flow for assigned tiers
- [ ] Payment success confirmation
- [ ] Loading, empty, and error states
- [ ] Mobile-responsive layout (phone + tablet verified)
- [ ] Visual alignment with mckeesecurity.ca design system

### Admin Dashboard (`/admin-dashboard`)
- [ ] Admin role enforcement (route + RLS + server checks)
- [ ] Create new client form
- [ ] Assign service tiers at creation
- [ ] Send / resend activation invitation
- [ ] View all clients and services
- [ ] Modify service tiers
- [ ] Cancel / restart services
- [ ] Device management (view and update install dates)
- [ ] Caller ID viewer

### Account Activation (`/account/activate`)
- [ ] Token validation
- [ ] Continue with Google option
- [ ] Email + password option
- [ ] Link auth identity to pending admin-created profile
- [ ] Redirect to dashboard with pre-assigned services visible

### Platform & Backend
- [ ] Supabase schema + migrations
- [ ] RLS policies for all client-scoped tables (penetration tested)
- [ ] Admin privilege enforcement (server-side)
- [ ] Service subscription records (multi-service per client)
- [ ] Caller ID storage, validation, change diffing, and optional history
- [ ] Device maintenance records and expiry calculation
- [ ] Footage request lifecycle and AWS Arctic integration
- [ ] Stripe checkout, tier validation, and webhook handling
- [ ] Email: account invitation
- [ ] Email: caller ID change alert
- [ ] Email: device expiry alert
- [ ] Email: footage ready notification
- [ ] Nightly device expiry scheduled job
- [ ] Cloud Run service(s) if required for Arctic/webhooks/cron
- [ ] `ENV_SETUP.md` or equivalent env documentation
- [ ] Mobile-responsive UX pass on all dashboard sections
- [ ] Shared design tokens aligned with mckeesecurity.ca rebuild

### QuickBooks integration — follow-on (Section 23 Scope B, after portal MVP)
- [ ] Cloud task queue schema + idempotency
- [ ] Local Windows QuickBooks bridge (SDK/qbXML)
- [ ] Read-only QB connectivity POC
- [ ] Stripe webhook → QB task enqueue (monitoring payments)
- [ ] Admin: payment sync status + task queue + needs-review UI
- [ ] Bookkeeper-approved GL mapping for Stripe reconciliation

### Accounting MCP / NL agent — future product (Section 23 Scope C — not portal v1)
- [ ] MCP server + tool registry
- [ ] Natural-language admin accounting assistant
- [ ] Batch monitoring invoices, collections, AR dashboards
- [ ] Estimate/PO automation via agent

*Full future scope: [`QUICKBOOKS_ACCOUNTING_DISCOVERY.md`](./QUICKBOOKS_ACCOUNTING_DISCOVERY.md)*

---

## Appendix B — Source Documents

| Document | Location | Description |
|----------|----------|-------------|
| Advanced Multi-Product SASS Roadmap.docx | Project root | Primary product specification (multi-service model) |
| Development Roadmap.docx | Project root | Earlier phased plan (single-tier model) |
| User-Admin-Dashboard Theory.docx | Project root | Architecture and auth strategy overview |
| BRANDING_GUIDELINES.md | frontend-react-app/ | Visual design system |
| Legacy prototype codebase | `frontend-react-app/`, `main-user-management/` | Reference only—do not extend |
| Target platform guidance | Section 19 of this document | Rebuild architecture starting point |
| Suggested build order | Section 20 | Phased delivery recommendation |
| Human checkpoints | Section 21 | Infrastructure pause points |
| QuickBooks Desktop discovery | Section 23 | Billing automation & agentic admin (July 2026) |

---

## Appendix C — Pre-Handover Audit

This appendix records the audit performed against the project directory before sending this document to the development team. It confirms coverage and documents hardening additions made during the audit.

### C.1 Sources reviewed

| Source | Audited for |
|--------|-------------|
| `Advanced Multi-Product SASS Roadmap.docx` / `_extracted_docs/*.txt` | Full product scope, Stripe rules, Arctic footage, admin APIs, security QA |
| `Development Roadmap.docx` | Onboarding, payment flow, tier assignment rules |
| `User-Admin-Dashboard Theory.docx` | Dual-dashboard model, admin-assigns/client-pays |
| `frontend-react-app/` (legacy) | Implemented vs planned; branding; UX copy |
| `main-user-management/` (legacy) | Auth/session patterns to **avoid** porting |
| `BRANDING_GUIDELINES.md` | Visual identity (superseded by live site where evolved) |
| QuickBooks Desktop MCP discovery handoff | Section 23 (interpreted from July 2026 agent research) | Billing, queue, agent workflows |
| **QuickBooks research (full detail)** | [`QUICKBOOKS_ACCOUNTING_DISCOVERY.md`](./QUICKBOOKS_ACCOUNTING_DISCOVERY.md) | Standalone accounting integration overview |

### C.2 Product coverage confirmation

All major product areas from the directory are represented in this handover:

| Product area | Document section | Status |
|--------------|------------------|--------|
| Security monitoring (read-only) | §6.2, §9.1 | Covered |
| Cloud backup (self-service) | §6.3, §9.2 | Covered |
| Caller ID management | §6.4 | Covered + validation hardening added |
| Device maintenance + expiry | §6.5, §11.9 | Covered |
| Footage requests + Arctic | §6.3, §10.5, Phase 6 | Covered + lifecycle added |
| Admin dashboard (all features) | §7 | Covered |
| Client activation / onboarding | §8 | Covered + Google auth modernization |
| Stripe billing rules | §9.3 | **Added during audit** |
| Multi-service data model | §10 | Covered |
| Email notifications | §12 | Covered |
| Optional future features | §15 | Covered |
| QuickBooks Desktop integration | §23 | **Scoped:** follow-on (B) + future agent product (C) |
| Monitoring payment → QB workflow | §11.11, §23.7 | Follow-on, not core MVP |
| NL accounting agent / full MCP | §23.5, discovery doc | **Future product — not current portal** |

### C.3 Gaps identified and addressed in this revision

| Gap | Resolution |
|-----|------------|
| No suggested build order | Added Section 20 with phased plan and test gates |
| No human-in-the-loop for infrastructure | Added Section 21 |
| UX/mobile/mckeesecurity.ca integration underspecified | Expanded Section 14 |
| Why leave legacy stack (WordPress already migrated; Cognito/EB retired) | Section 19.11 |
| Stripe security vs cloud backup rules unclear | Added Section 9.3 |
| Footage request status lifecycle missing | Added to Section 10.5 |
| Caller ID validation / audit trail not mentioned | Added to Section 6.4 |
| Security QA from original Phase 10 not consolidated | Added Section 22 |
| Admin optional invite email on create | Added to Section 7.2 |
| Paused vs Cancelled service status undefined | Clarified in Section 9.1 |
| Agent CLI/MCP access not mentioned | Added Section 21.3 |
| Legacy tier names (SecurityBasic, etc.) | Noted in Section 9.3 |
| QuickBooks / monitoring billing not in original portal docs | Section 23 (July 2026 discovery) |
| Stripe → QB offline queue | §11.11, §23.3 |
| NL accounting agent requirements | §23.5–23.6 |

### C.4 Remaining items for stakeholder / dev team (not blockers to send)

These remain in Section 18 (Open Questions) and require McKee input during build—not before sending this handover:

- Exact tier feature differences and pricing
- Footage/cancellation data retention policies
- Admin alert email addresses
- Camera list source for footage form
- Minimum caller ID contacts policy

### C.5 Handover readiness

**Verdict: Ready to send.** This document captures the full product ideation from the project directory, modernizes auth and platform direction, gives the team explicit freedom to improve on legacy plans, and adds practical guidance for phased delivery and human-in-the-loop infrastructure setup.

---

*This document describes the **McKee Security customer/admin portal** as the **primary implementation focus** (Sections 1–22). QuickBooks integration plumbing (Section 23 Scope B) is optional follow-on work. The **full MCP server and natural-language accounting agent** are a **separate future product** documented in [`QUICKBOOKS_ACCOUNTING_DISCOVERY.md`](./QUICKBOOKS_ACCOUNTING_DISCOVERY.md)—not required for portal v1.*
