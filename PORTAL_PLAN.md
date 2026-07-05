# McKee Security Customer Portal: Implementation Plan

> **Single source of truth for building the portal in this repo.** Read this before each portal work session so context never drifts.
>
> **Requirements source of truth:** [`PRODUCT_HANDOVER.md`](./PRODUCT_HANDOVER.md) defines *what* the portal must do and *why* (business rules, roles, workflows). This document defines *how* it gets built in this repository: exact routes, files, schema, RLS policies, flows, phases, and checkpoints. If the two conflict on a business rule, the handover wins, **unless a dated stakeholder decision in the Decision Register amends the handover** (e.g. R21). If they conflict on implementation detail, this plan wins because it is verified against the actual codebase and live infrastructure.

**Product:** Client and admin portal built natively into the live `mckeesecurity.ca` Next.js site.
**Scope:** Handover Sections 1 to 22 (core portal, Phases 0 to 7). QuickBooks plumbing (Scope B) and the accounting agent (Scope C) are deferred; the only obligation toward them is clean Stripe event and customer record-keeping (Section 8 of this plan).
**Build order (decided 2026-07-05):** Track 1 is the core portal: Phases 0 to 5, then Phase 7 hardening and launch. Track 2 is the camera cloud backup service: Phases 6A/6B, started **after** the core portal is live. The camera design (Sections 9.2/9.3) is fully specified and stays in this plan, but nothing in Track 1 depends on it.

---

## Writing Rules

No em dashes anywhere in this project. Use periods, commas, or colons. Complete sentences in copy, commits, and documentation.

---

## 1. Current State Snapshot (verified 2026-07-04)

### 1.1 Repository

| Fact | Implication |
|------|-------------|
| Next.js **16.2.9**, React 19.2.4, TypeScript, Tailwind 4, Zod 4, RHF 7, `@supabase/supabase-js` 2.108. Vercel root `website/`. `node_modules` installed | Portal is new routes in `website/src/app/`. Read `node_modules/next/dist/docs/` guides before each new API surface |
| Next 16 verified from bundled docs: `middleware.ts` is deprecated and renamed **`proxy.ts`**; `cookies()` is async; `params`/`searchParams` are Promises; caching is opt-in | Every portal file must follow these. `proxy.ts` without a `matcher` runs on every request including static assets, so always scope the matcher |
| `next.config.ts` permanent-redirects `/login`, `/registration`, `/registration-success`, `/profile`, `/user-dashboard` to `/our-courses` | Remove in Phase 0. They are 308s, so prior visitors may have them cached; acceptable because portal users are new invitees |
| Email: `src/lib/email.ts` sends via Resend raw fetch. **Hardcodes recipient to `CONTACT_EMAIL`**, no `to` parameter | Must be extended with an optional `to` field before any client-facing email (Phase 2, task 2.1) |
| Branded email HTML exists in `src/lib/email-templates.ts` (dark layout, red CTA buttons) | Extend for portal templates, do not rebuild |
| Existing gate patterns: Data Drops (`dd_auth`) and Starlink admin (`sl_admin_auth` + `guardAdminApi()` in `src/lib/starlink/admin-guard.ts`) | Architectural template for portal layout gates and API guards. Portal replaces shared passwords with Supabase sessions |
| Supabase usage today is service-role only: `src/lib/starlink/supabase-admin.ts` (`server-only`, lazy client, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) | Pattern to mirror for the portal's service-role client. `@supabase/ssr` is NOT installed yet |
| Design tokens in `src/app/globals.css`: bg `#0a0a0a`, McKee red `#c91818` (hover `#a80f0f`), blue `#1e99e6`, surface `#262626`, muted `rgba(255,255,255,0.65)`, Lato + Dancing Script. Shared UI: `Button` (primary/secondary/outline/ghost), `SectionHeading`, `mckee-forms.css`, `FadeIn` | **Live site tokens win** over the handover palette (`#660000`/`#1a1a1a`/`#2d2d2d`), per handover Section 14.1. Warning amber `#f57c00` and error red `#d32f2f` from the handover are additive and do not conflict |
| Forms: RHF + Zod + `@hookform/resolvers` + `useAutofillSync` (`src/lib/use-autofill-sync.ts`) | Reuse for all portal forms |
| No Stripe anywhere. No auth library. AWS CLI v2 + `eb-cli` profile exist (ca-central-1) | Stripe is greenfield (Phase 5). AWS CLI access enables the footage build, but the storage layer itself does not exist yet (1.4, Phase 6A) |

### 1.2 Supabase platform (project `cxmydfhbclfwzboqibmo`)

| Fact | Implication |
|------|-------------|
| Project renamed **"McKee Security Platform"** (was "McKee Starlink Rentals") on 2026-07-04 via Management API. Region ca-central-1, Postgres 17, ACTIVE_HEALTHY | D1 resolved: single platform database for rentals + portal. Ref, URL, and keys unchanged, so the live Starlink admin is unaffected |
| Existing tables: `public.units` (RLS on, no policies), `public.rentals` (RLS on, no policies). Advisors: INFO only (rls_enabled_no_policy on both) | Correct for service-role-only access. Portal `authenticated` users get zero access to them by default, which is exactly right. Do not add policies to these tables |
| `auth.users` is empty. Auth config observed: `disable_signup=false`, Google provider **disabled**, email provider enabled, `mailer_autoconfirm=false`, `site_url=http://localhost:3000`, `uri_allow_list` empty, JWT exp 3600s | Phase 1 must: enable Google provider (human creates the OAuth client), set `site_url=https://mckeesecurity.ca`, add redirect allow-list (prod + `https://*-brendenmckees-projects.vercel.app/**` + localhost). Agent can PATCH `config/auth` via Management API; provider secrets go in via dashboard |
| Modern **publishable key** exists (`sb_publishable_...`) alongside legacy anon key | Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (current Supabase guidance), not the legacy anon key |
| Supabase CLI v2.84.2 installed and authenticated (Management API reachable). Supabase MCP available (`execute_sql`, `apply_migration`, `get_advisors`, `generate_typescript_types`, branches, logs) | Schema work happens through MCP/CLI per handover Section 21.3. Repo has no `supabase/` directory yet; Phase 0 initializes it |

### 1.3 Supabase SSR guidance (verified against current docs, 2026-07)

- Use `@supabase/ssr` with the `getAll`/`setAll` cookie adapter.
- **A `proxy.ts` is required** to refresh expired auth tokens: Next.js Server Components cannot write cookies. The proxy calls `getClaims()` and persists refreshed cookies, with a matcher scoped to portal routes only.
- **Use `getClaims()` to protect pages and data** (verifies the JWT, locally when the project uses asymmetric signing keys). Use `getUser()` only when a fresh server-confirmed user record is needed. Never trust `getSession()` alone server-side.
- **Never use `user_metadata` for authorization** (user-editable). Roles live in `profiles.role`, checked in RLS via a `security definer` function kept in an unexposed schema.
- Postgres RLS gotcha: **UPDATE requires a SELECT policy** on the same rows, or updates silently affect 0 rows.

### 1.4 AWS account state (audited and cleaned up, 2026-07-04)

The account (490004615514, profile `eb-cli`) was fully audited and then cleaned per stakeholder approval. Findings first, current state second.

**Audit findings that shaped the plan:**

- The legacy `nvr-backup` EB environment had **zero application versions deployed** (stock EB sample app, inbound 80/22 only, no FTP/RTSP ever opened). There was no recoverable ingest code anywhere (also checked `nvr-backup-app` in us-east-2 and `user-dashboard-cloud-storage`: both empty). The camera cloud backup system is fully greenfield.
- **No Glacier vaults and no footage S3 buckets existed.** The handover's "AWS Arctic archive storage" was aspirational; Phase 6A creates the storage layer.
- The legacy Cognito-era portal backend (`main-user-management`) and its predecessors were still running, costing roughly $45+/month across two idle t3.micros, an idle application load balancer, and associated addresses.

**Cleanup executed 2026-07-04 (all approved):** deleted six EB applications + environments: `nvr-backup`, `main-user-management`, `user-management`, `mckee-security`, `user-dashboard-cloud-storage` (ca-central-1) and `nvr-backup-app` (us-east-2); their instances, load balancer, and Elastic IPs released; 71 orphaned deployment objects removed from the EB S3 bucket. Two stale legacy security groups were detached from `mckeesecurity-rds` (they blocked stack deletion; Data Drops connects through the `default` group). Data Drops verified healthy (HTTP 200 against the live API) after each step.

**Current AWS footprint (everything that now exists):**

| Resource | Purpose | Keep |
|----------|---------|------|
| EB app + env `data-drops-app` (t3.micro, Node 22, ALB with 3 EIPs behind `app-mckeesecurity.ca`) | Data Drops Express API (active internal tool; the site proxies to it via `/api/dd/*`) | Yes |
| RDS `mckeesecurity-rds` (MySQL, db.t4g.micro) | Data Drops database. Also still holds the legacy portal's `McKeeSecurityRDS` database (data preserved; the legacy app that used it is gone) | Yes |
| EB S3 buckets (ca-central-1, us-east-2) | Deployment bundles for `data-drops-app` only | Yes |
| Supabase (not AWS) + Vercel | Everything else in this plan | Yes |

**Follow-ups:** rotate the `mckee.cloud.storage@gmail.com` app password that sat in plaintext EB config (cannot be done via CLI); remove any DNS record still pointing at the deleted `main-user-management` load balancer; Cognito user pool from the legacy prototype can be deleted whenever convenient (no cost while idle). Phase 6A adds: footage bucket, per-site IAM, SSM hybrid activations.

### 1.5 Camera fleet and connectivity constraints (research verified, 2026-07)

| Fact | Implication |
|------|-------------|
| UNV/Uniview NVRs support FTP upload of **snapshots only** (D1-resolution stills, scheduled or event-triggered). No native continuous video push to FTP/cloud. EZCloud is P2P viewing, not backup | The NVR alone cannot deliver the cloud backup product. An **on-site gateway** must capture and upload video (Section 9.2) |
| UNV cameras: Ultra265/H.265 with U-code smart codec, dual/triple streams, RTSP mainstream at `/media/video1`, up to 32 concurrent stream users, ONVIF Profile S/T | The gateway pulls **mainstream RTSP directly from each camera** in parallel with the NVR (32-user headroom makes one extra consumer safe). H.265 4MP mainstream runs 2 to 4 Mbps real-world with U-code |
| Starlink 2026 (Gen 4 dishes, Standard/Standard 4x): Residential fixed plans officially spec **15 to 35 Mbps upload**, ~22 Mbps median, improving year over year. Residential still uses **CGNAT** (public IP only on Priority plans) with a **1,200 concurrent session limit**; Starlink explicitly warns VPNs burn sessions | Mainstream upload is now feasible for typical sites (4 cameras x ~3 Mbps = 12 Mbps, inside the envelope, capped by the uploader). All connections must be outbound-initiated. **Avoid always-on VPNs**: they add cost, burn CGNAT sessions, and are unnecessary (R17) |

---

## 2. Decision Register

### Resolved

| # | Decision | Choice |
|---|----------|--------|
| D1 | Supabase project | **Reuse project `cxmydfhbclfwzboqibmo`, renamed "McKee Security Platform"** (done 2026-07-04). Dev/staging via Supabase branches or a second free project, decided at Phase 0 kickoff; production schema changes go through reviewed migrations |
| R1 | Email provider | Resend via existing `src/lib/email.ts`, extended with a `to` override |
| R2 | Payments | Stripe Checkout (subscription mode) + webhooks |
| R3 | Backend split | **Vercel-only through Phase 5.** Re-evaluate at Phase 6 only if footage restore notification cannot be solved with cron + lazy checks (Section 9.4) |
| R4 | Scheduler | Vercel Cron (`vercel.json`) hitting `/api/cron/*` routes protected by `CRON_SECRET` Bearer check. Fallback: Supabase `pg_cron` + Edge Function if Vercel plan limits bite (Hobby allows daily-only crons) |
| R5 | Auth stack | `@supabase/ssr`, publishable key, `getClaims()` for route protection, `getUser()` where freshness matters |
| R6 | Route protection | Three layers: (1) `proxy.ts` scoped to portal routes for token refresh, (2) server layout gates per route group for UX-level authorization, (3) per-action server-side role re-checks + RLS as the final authority. No security decision relies on the proxy alone |
| R7 | Roles | `profiles.role` enum (`client`, `admin`; `technician` reserved). RLS checks via `private.is_admin()` security definer function (unexposed schema, EXECUTE granted to `authenticated`) |
| R8 | Activation | Custom `invitations` table: 32-byte random token, **SHA-256 hash stored**, single-use, 7-day expiry (configurable). Supports both Google and email/password on the same invite. Full flows in Section 6 |
| R9 | Public signups | `disable_signup` stays **false** at the Auth layer (required for the Google activation path to create the auth user). "No open registration" is enforced at the app layer: no signup UI, orphan auth users (no linked profile) see nothing due to RLS, get a "no account" screen, and are purged by a cleanup job (Section 6.6) |
| R10 | Routes | `/user-dashboard`, `/admin-dashboard`, `/account/activate` as in the handover |
| R11 | Brand | Live site tokens via `globals.css` + existing shared components. Amber `#f57c00` for warning, `#d32f2f` for error states |
| R12 | Mutations | Server actions for portal CRUD. Route handlers only for: OAuth callback, Stripe webhook, cron endpoints |
| R13 | Data access in admin features | Admin UI reads/writes through the **user-context client** (RLS admin policies), not the service role. Service role is reserved for: `auth.admin` operations, webhook/cron contexts, and invitation validation before a session exists |
| R14 | Device expiry alerts | `expiry_alerted_at` timestamp on `devices`, cleared when the install date changes, so the nightly cron emails once per expiry event instead of every night |
| R15 | Dev environment | Supabase org is on a **paid plan** (confirmed 2026-07-04): use a **Supabase development branch** of the platform project for schema iteration, promote to production via reviewed migrations. Local stack remains available for offline work |
| R16 | Camera ingestion platform | **No Elastic Beanstalk and no 24/7 ingest server.** On-site gateway devices upload directly to S3 over HTTPS (outbound-only, CGNAT-safe); Supabase holds sites/cameras/gateway metadata; Vercel API routes are the control plane (heartbeats, config, provisioning). Full rationale and rejected alternatives in Section 9.2.6 |
| R17 | Gateway remote management | **No VPN services or tunnel subscriptions.** Gateways register as free AWS SSM hybrid nodes (outbound HTTPS agent, works through CGNAT): remote shell and run-command are pay-per-use ($0.05/session, $0.002/command, zero standing cost). Day-to-day config changes ride the gateway's own config-poll channel, so SSM is for break-glass support only |
| R18 | Capture quality | **Mainstream (full resolution H.265) capture is the default**, so retrieved footage is evidence-grade. Continuous recording by default; motion-gated upload available per camera as a cost lever (D9). The NVR remains the on-site system of record |
| R19 | Retention tiers map to S3 storage classes | 7-day tier = S3 Standard, 30-day = Standard-IA, 90-day = **Glacier Instant Retrieval** ("Arctic"). Each tier's retention window equals its class minimum-duration billing floor, so zero early-delete penalties, and every class serves instant GETs: **no restore jobs anywhere in the product** (9.2.5) |
| R20 | Storage resolution tiers | Clients choose stored resolution **per camera**: 1080p, 1440p, or 2160p (full 4K). Implementation is **pure stream copy at every tier, no transcoding**: 2160p pulls the 4K mainstream; 1080p/1440p pull the camera sub-stream, which is set to the purchased resolution on the NVR/camera at install (sub-stream resolution is fully configurable on the fleet, per ops). Lower future tiers (e.g. 720p) are just config plus a new price cell. The NVR records full 4K mainstream locally in every case. Pricing = retention x resolution matrix (9.2.4, 9.2.7) |
| R21 | Cloud backup plan management is **admin-only** | Supersedes handover 6.3 self-service (stakeholder, 2026-07-05). Clients view backup status and request footage; **all plan assignment, tier/resolution changes, and cancellation are admin actions.** Rationale: the service runs on McKee-managed on-site hardware and NVR/sub-stream configuration (R20), so a plan change is an operational event (config-sync, possibly a camera reconfig), not a self-service toggle. The only client-initiated money action anywhere in the portal is Pay Now checkout for an admin-assigned tier |
| R22 | Dual billing rails: autopay + manual | Every paid service is `billing_method = 'stripe'` (autopay via Checkout/webhooks) or `'manual'` (legacy e-transfer/cheque/cash). Manual services carry `monthly_amount_cents` + `next_due_on`; a daily cron reminds the client before due and when overdue (R14-style `due_alerted_at` guard, once per cycle) and sends the admin a collections digest so no legacy payment is missed. Payments are recorded in an append-only `manual_payments` ledger that advances `next_due_on`. The admin Billing tab (7.2/7.3) is the collections console; failed Stripe payments land on the same board |

### Open (stakeholder or phase-gated)

| # | Decision | Needed by | Notes |
|---|----------|-----------|-------|
| D2 | Google OAuth client (Google Cloud Console) + provider secrets into Supabase dashboard | Phase 1 | Agent supplies exact redirect URI (`https://cxmydfhbclfwzboqibmo.supabase.co/auth/v1/callback`) and consent screen copy |
| D3 | Admin staff sign-in method | Phase 1 | Recommended: same Google + email/password as clients, role decides access |
| D4 | Stripe account, products/prices, webhook endpoint | Phase 5 | Agent supplies product/price definitions and required webhook events |
| D5 | AWS footage storage provisioning | Phase 6A | **Audit finding: no bucket, vault, or IAM exists yet; all greenfield.** Human approves: footage bucket creation (ca-central-1), lifecycle rules per tier (9.2.5), an admin-capable IAM path for the agent or console work, per-site upload credentials model (9.2.3). "Arctic" is implemented as S3 storage classes chosen per retention tier, not a separate product |
| D6 | Handover Section 18 business answers | Rolling | Blocking map: Q1/Q3 (tier features, monitoring paid in portal?) by Phase 3; Q7 (admin alert inbox) by Phase 2; Q16/Q9 (caller ID min/max, history in UI?) by Phase 4; Q2 (cloud tier pricing) by Phase 6A (Track 2; retail matrix recommendation ready in 9.2.7); Q4/Q6 (retention on cancel, link expiry) by Phase 6B. Q8 (camera list source) is resolved structurally: cameras are registered rows in the `cameras` table, populated at gateway provisioning (9.2.3) |
| D7 | Vercel plan cron limits | Phase 7, re-check at 6A | If on Hobby (daily-only crons), nightly expiry and cleanup work; sub-daily gateway-health needs pg_cron fallback (R4). Verify plan when writing `vercel.json` and again at Track 2 kickoff |
| D8 | Gateway site kit | Phase 6A | Recommendation: fanless x86 mini PC (Intel N100 class, 8GB RAM, 500GB to 1TB NVMe, ~$200 to $280 one-time per site): native NVMe, headroom, and Quick Sync as free contingency (not required since all tiers are stream copy, R20). Human approves hardware SKU + pilot site (recommendation: one McKee-controlled Starlink site first to prove CGNAT behavior end to end) |
| D9 | Per-site capture tuning | Phase 6A | Default is continuous mainstream H.265 (R18). Per-camera knobs: bitrate cap pushed to the camera (U-code, target 2 to 3 Mbps for 4MP), motion-gated upload for constrained links or budget-sensitive clients. Confirm defaults against pilot bandwidth data |
| D10 | Legacy AWS decommission | **Done 2026-07-04** | Executed with stakeholder approval: all six legacy EB applications deleted across both regions, orphaned S3 objects removed, stale security groups detached from RDS, Data Drops + RDS untouched and verified healthy (1.4). Remaining human items: rotate the exposed Gmail app password; remove stale DNS records for the deleted load balancer |
| D11 | Manual payment instructions + reminder cadence | Phase 5 | E-transfer address (or other instructions) for the reminder email, days-before-due for the first reminder (default 7), overdue re-reminder cadence (default: on due date, then the admin digest carries it until recorded). Copy for the client dashboard's manual-payment banner |

---

## 3. Target Architecture

### 3.1 File manifest (files to create)

```
website/
├── proxy.ts                                    # NEW: token refresh, matcher scoped to portal routes
├── vercel.json                                 # NEW (Phase 7): cron schedules
└── src/
    ├── app/
    │   ├── (portal)/
    │   │   ├── layout.tsx                      # getClaims() gate; logged-out renders <SignIn/>; noindex
    │   │   ├── user-dashboard/page.tsx         # 4 sections + payment banner
    │   │   └── account/
    │   │       └── activate/page.tsx           # token validation + method choice
    │   ├── (admin-portal)/
    │   │   ├── layout.tsx                      # getClaims() + role=admin gate; noindex
    │   │   └── admin-dashboard/page.tsx        # tabbed admin UI
    │   └── api/
    │       ├── auth/callback/route.ts          # PKCE code exchange, activation-aware redirect
    │       ├── stripe/webhook/route.ts         # Phase 5
    │       └── cron/
    │           ├── device-expiry/route.ts      # Phase 7
    │           ├── cleanup/route.ts            # Phase 7: orphan auth users, expired invites, expired footage links
    │           ├── payment-due/route.ts        # Phase 7: manual-payer reminders + admin collections digest (R22)
    │           ├── gateway-health/route.ts     # Track 2 (6A): offline alerting + site_usage rollup
    │           └── footage-poller/route.ts     # dormant (only if a Deep Archive tier is ever sold, 9.3)
    ├── components/portal/
    │   ├── sign-in.tsx                         # Google button + email/password form
    │   ├── activate-account.tsx                # Google / set-password chooser
    │   ├── dashboard/                          # client dashboard section components
    │   │   ├── monitoring-card.tsx
    │   │   ├── cloud-backup-card.tsx           # status display + footage request form (no plan controls, R21)
    │   │   ├── caller-id-card.tsx
    │   │   ├── devices-card.tsx
    │   │   └── payment-banner.tsx
    │   └── admin/                              # admin dashboard components (tab spec in 7.2)
    │       ├── overview-stats.tsx              # KPI cards + activity feed
    │       ├── client-table.tsx                # search, filters, sort, pagination
    │       ├── create-client-form.tsx
    │       ├── client-detail.tsx               # services, billing, devices, caller IDs, invites per client
    │       ├── billing-board.tsx               # autopay failures + manual dues/overdues (7.3)
    │       ├── record-payment-form.tsx         # manual_payments insert (7.3)
    │       └── ...
    ├── lib/portal/
    │   ├── supabase/
    │   │   ├── server.ts                       # createServerClient (publishable key + cookies), per-request
    │   │   ├── client.ts                       # createBrowserClient for client components
    │   │   ├── admin.ts                        # service-role client, server-only (mirror starlink pattern)
    │   │   └── proxy-session.ts                # session refresh helper used by proxy.ts
    │   ├── auth.ts                             # getAuthUser(), requireUser(), requireAdmin()
    │   ├── invitations.ts                      # token generate/hash/validate/consume
    │   ├── actions/                            # server actions by feature
    │   │   ├── admin-clients.ts                # create/invite/resend/tier changes/cancel/restart
    │   │   ├── activation.ts                   # link auth user to pending profile
    │   │   ├── caller-id.ts                    # save list + diff + history + admin email
    │   │   ├── devices.ts                      # admin date updates
    │   │   ├── billing.ts                      # checkout session; admin-only plan change/cancel (Phase 5, R21)
    │   │   ├── payments.ts                     # record manual payment, billing method switch (Phase 5, R22)
    │   │   └── footage.ts                      # create request (Phase 6B)
    │   ├── emails.ts                           # portal template builders (uses lib/email.ts)
    │   ├── phone.ts                            # NANP/E.164 normalization + validation
    │   ├── stripe.ts                           # Stripe client + tier-to-price map (Phase 5)
    │   ├── footage-retrieval.ts                # S3 presign + Glacier restore (Phase 6B)
    │   └── database.types.ts                   # generated via MCP generate_typescript_types
    └── styles/portal.css                       # dashboard-specific styles (pattern: starlink-admin.css)

supabase/
├── config.toml                                 # CLI init
└── migrations/                                 # committed migration files (workflow in 4.4)

camera-gateway/                                 # NEW top-level app (Phase 6A), runs on site devices
├── README.md                                   # technician install SOP (plug-in-and-verify, 9.2.3)
├── agent/                                      # Node/TypeScript service (systemd-supervised)
│   ├── capture.ts                              # ffmpeg mainstream RTSP -> segmented mp4, per camera
│   ├── uploader.ts                             # store-and-forward queue -> S3 multipart upload, bandwidth-capped
│   ├── heartbeat.ts                            # POST /api/gateway/heartbeat (status, disk, queue, bytes)
│   ├── config-sync.ts                          # GET /api/gateway/config on version bump (cameras, creds, caps)
│   └── discovery.ts                            # ONVIF/RTSP camera discovery assist for installs
└── provision/                                  # office imaging: base OS, agent, SSM hybrid registration
```

Portal API additions for the gateway control plane (Phase 6A): `src/app/api/gateway/heartbeat/route.ts` and `src/app/api/gateway/config/route.ts` (per-gateway secret auth; heartbeat updates `gateways.last_seen_at` + metrics, config serves the site's camera and capture configuration).

Modified files: `src/lib/email.ts` (add `to`/`cc` override), `next.config.ts` (remove 5 legacy redirects), `src/app/sitemap.ts` (exclude portal routes if pattern requires), `package.json` (`@supabase/ssr`, `stripe`, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` in Phase 6B).

### 3.2 Request flow summary

```
Browser -> proxy.ts (portal matcher only: refresh session cookies)
        -> (portal)/layout.tsx        getClaims() -> no session: render SignIn -> children
        -> (admin-portal)/layout.tsx  getClaims() + profiles.role check -> not admin: 404-style denial
        -> server actions             requireUser()/requireAdmin() re-check, then RLS-scoped queries
        -> Stripe webhook             signature verify -> billing_events idempotency -> service-role writes
        -> cron routes                CRON_SECRET Bearer check -> service-role batch work
```

`proxy.ts` matcher: `['/user-dashboard/:path*', '/admin-dashboard/:path*', '/account/:path*']`. The proxy only refreshes sessions and never makes authorization decisions by itself.

---

## 4. Database Schema

Conventions: `snake_case`, `uuid` PKs via `gen_random_uuid()`, `timestamptz` timestamps, `created_at`/`updated_at` on every table (shared `set_updated_at()` trigger), FKs `on delete cascade` from profile-scoped tables to `profiles`. All portal tables live in `public` with RLS enabled before first write. Enums as Postgres types.

### 4.1 Enums

```sql
create type public.user_role        as enum ('client', 'admin', 'technician');
create type public.profile_status   as enum ('pending', 'active', 'disabled');
create type public.service_type     as enum ('monitoring', 'cloud_backup');
create type public.monitoring_tier  as enum ('basic', 'standard', 'pro');
create type public.cloud_tier       as enum ('7day', '30day', '90day');
create type public.service_status   as enum ('active', 'paused', 'cancelled', 'unpaid');
create type public.device_type      as enum ('battery', 'smoke_detector');
create type public.footage_status   as enum ('pending', 'processing', 'ready', 'failed', 'expired');
create type public.billing_method   as enum ('stripe', 'manual');
create type public.payment_method   as enum ('etransfer', 'cheque', 'cash', 'other');
```

`service_status.unpaid` covers "assigned but not yet paid" (handover 6.6: Pay Now shown when tier assigned but unpaid). Tier columns are typed per service, stored as a single `text tier` column with a CHECK per `service_type` (see 4.2) to keep one `services` table.

### 4.2 Tables

**`profiles`** (client identity; row exists before the auth user does)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK default `gen_random_uuid()` |
| `user_id` | uuid | NULL until activation. FK `auth.users(id) on delete set null`. **Unique** |
| `first_name`, `last_name` | text | not null |
| `email` | text | nullable (invite may omit); unique when set (partial unique index) |
| `address` | text | nullable |
| `role` | user_role | not null default `'client'` |
| `status` | profile_status | not null default `'pending'` |
| `stripe_customer_id` | text | nullable, unique when set (Phase 5) |

**`invitations`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `profile_id` | uuid | FK profiles, not null |
| `token_hash` | text | not null, unique (SHA-256 hex of raw token; raw token never stored) |
| `target_email` | text | nullable (constrains activation email when set) |
| `expires_at` | timestamptz | not null default `now() + interval '7 days'` |
| `used_at` | timestamptz | nullable |
| `created_by` | uuid | FK auth.users (the admin), nullable |

Partial unique index: at most one unused invitation per profile (`unique (profile_id) where used_at is null`). Resend = expire old row (set `expires_at = now()`), insert new.

**`services`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `profile_id` | uuid | FK profiles, not null |
| `service_type` | service_type | not null |
| `tier` | text | not null. CHECK: `monitoring` in ('basic','standard','pro'); `cloud_backup` in ('7day','30day','90day') |
| `status` | service_status | not null default `'unpaid'` |
| `stripe_subscription_id` | text | nullable, unique when set |
| `billing_method` | billing_method | not null default `'manual'` (R22); set to `'stripe'` when a subscription activates via webhook |
| `monthly_amount_cents` | integer | nullable; required when `billing_method='manual'` (reminder emails and the Billing tab quote it) |
| `next_due_on` | date | nullable; manual billing only; advanced one cycle each time a payment is recorded |
| `due_alerted_at` | timestamptz | nullable; R14-style guard so each due cycle reminds once; cleared when a payment is recorded |
| `unique (profile_id, service_type)` | | one row per client per product (handover 9.4) |

**`caller_id_contacts`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `profile_id` | uuid | FK profiles, not null |
| `phone` | text | not null, E.164 normalized, CHECK `phone ~ '^\+1[2-9]\d{9}$'` (NANP; revisit if non-NA clients appear) |
| `label` | text | not null, length 1..80 |
| `unique (profile_id, phone)` | | duplicate prevention (handover 6.4) |

Contact cap (default 15, pending D6/Q16) enforced in the server action, not the schema.

**`caller_id_changes`** (audit history, handover 6.4 recommended)

| Column | Type |
|--------|------|
| `id` | uuid PK |
| `profile_id` | uuid FK |
| `changed_by` | uuid FK auth.users |
| `added` | jsonb (array of `{phone,label}`) |
| `removed` | jsonb (array of `{phone,label}`) |
| `created_at` | timestamptz |

**`devices`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `profile_id` | uuid | FK profiles, not null |
| `device_type` | device_type | not null |
| `installed_on` | date | not null |
| `expiry_alerted_at` | timestamptz | nullable, cleared on `installed_on` change (R14) |
| `unique (profile_id, device_type)` | | one battery + one smoke detector per client (extend later if multi-device needed) |

Expiry is computed, not stored: battery `installed_on + interval '5 years'`, smoke detector `+ 10 years` (handover 6.5).

**`sites`** (Phase 6A; one row per physical install location)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `profile_id` | uuid | FK profiles, not null |
| `label` | text | not null (e.g. "Cottage", "Main Office") |
| `s3_prefix` | text | not null, unique (e.g. `sites/<site_id>/`), the only prefix its gateway can write |
| `connectivity` | text | free text ops note (e.g. "Starlink CGNAT", "Bell fibre") |

**`cameras`** (Phase 6A; resolves handover Q8: the footage form lists these rows)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `site_id` | uuid | FK sites, not null |
| `name` | text | not null (client-facing label, e.g. "Driveway") |
| `rtsp_path` | text | not null (gateway-side stream config; never shown to client) |
| `capture_mode` | text | `'mainstream'` / `'events_only'` / `'substream'` (D9, R18), default `'mainstream'` |
| `resolution` | text | `'2160p'` / `'1440p'` / `'1080p'` (R20), default `'2160p'`; drives stream selection (mainstream vs sub-stream) and the billing matrix |
| `active` | boolean | not null default true |

**`gateways`** (Phase 6A; one row per site device)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `site_id` | uuid | FK sites, not null, unique |
| `secret_hash` | text | not null (SHA-256 of per-gateway API secret) |
| `hardware_serial` | text | nullable, unique (claim/imaging identity) |
| `ssm_node_id` | text | nullable (`mi-...` hybrid node id for break-glass access, R17) |
| `config_version` | integer | not null default 0 (bumped on config change; gateway polls and applies) |
| `last_seen_at` | timestamptz | nullable (heartbeat) |
| `metrics` | jsonb | nullable (disk free, queue depth, per-camera capture state, bytes uploaded) |

**`site_usage`** (Phase 6A; nightly rollup for margin visibility, 9.2.7)

| Column | Type | Constraints |
|--------|------|-------------|
| `site_id` | uuid | FK sites, not null |
| `day` | date | not null |
| `bytes_uploaded` | bigint | not null default 0 |
| `unique (site_id, day)` | | |

**`footage_requests`** (Phase 6B)

| Column | Type |
|--------|------|
| `id` | uuid PK |
| `profile_id` | uuid FK |
| `camera_id` | uuid FK cameras, not null |
| `range_start`, `range_end` | timestamptz not null, CHECK `range_end > range_start` |
| `status` | footage_status not null default `'pending'` |
| `s3_keys` | jsonb nullable (matched segment objects) |
| `download_url` | text nullable |
| `download_expires_at` | timestamptz nullable |
| `failure_reason` | text nullable |
| `completed_at` | timestamptz nullable |

**`billing_events`** (Phase 5; webhook idempotency + QB Scope B forward compatibility)

| Column | Type |
|--------|------|
| `stripe_event_id` | text PK |
| `type` | text not null |
| `payload` | jsonb not null |
| `processed_at` | timestamptz not null default now() |

Duplicate webhook delivery = PK conflict = safe no-op. This table is the future source for QB task enqueueing (handover 23.1) without portal rework.

**`manual_payments`** (Phase 5; append-only ledger for legacy e-transfer/cheque/cash payers, R22)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `service_id` | uuid | FK services, not null |
| `profile_id` | uuid | FK profiles, not null (denormalized for reporting) |
| `amount_cents` | integer | not null, CHECK `> 0` |
| `method` | payment_method | not null |
| `paid_on` | date | not null |
| `recorded_by` | uuid | FK auth.users (the admin), not null |
| `note` | text | nullable (e.g. e-transfer reference) |

Append-only: no UPDATE or DELETE policies exist; a mistake is corrected by a reversing note and a new row. Recording a payment advances the service's `next_due_on` by one cycle, clears `due_alerted_at`, and sets `status='active'` if it was `'unpaid'`. This ledger plus `billing_events` gives QB Scope B a complete money trail across both rails.

### 4.3 RLS policy matrix

Helper (unexposed schema, per Supabase security checklist):

```sql
create schema if not exists private;
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;
grant execute on function private.is_admin() to authenticated;
```

| Table | anon | authenticated client | admin |
|-------|------|----------------------|-------|
| `profiles` | none | SELECT own (`user_id = auth.uid()`). No INSERT/UPDATE/DELETE (name/address changes go through admin) | SELECT/INSERT/UPDATE all via `private.is_admin()`. DELETE withheld (disable instead) |
| `invitations` | none | none (validation happens server-side pre-session via service role) | SELECT/INSERT/UPDATE |
| `services` | none | SELECT own via profile join | SELECT/INSERT/UPDATE all. Client tier/status changes happen only through server actions and webhooks (service role), never direct client writes |
| `caller_id_contacts` | none | SELECT/INSERT/DELETE own (+ SELECT required for any UPDATE; list saves are delete+insert in a transaction) | SELECT all. No admin writes (handover 7.5: admin views, client manages) |
| `caller_id_changes` | none | none (server action writes with user context INSERT-own policy) | SELECT all |
| `devices` | none | SELECT own | SELECT/INSERT/UPDATE all |
| `sites` | none | SELECT own (via profile join), minus ops columns if needed (view or column grants) | SELECT/INSERT/UPDATE all |
| `cameras` | none | SELECT own active cameras (`id`, `name` only; `rtsp_path` excluded via a `security_invoker` view or column-level grants) | SELECT/INSERT/UPDATE all |
| `gateways` | none | none (ops-only; heartbeat writes use service role) | SELECT/INSERT/UPDATE all |
| `footage_requests` | none | SELECT own, INSERT own (status forced `'pending'` via column default and policy `with check`; `camera_id` must belong to own site, enforced in policy) | SELECT/UPDATE all |
| `billing_events` | none | none | SELECT (service role writes) |
| `manual_payments` | none | none (v1; clients get email confirmation when a payment is recorded) | SELECT/INSERT. No UPDATE/DELETE policies: append-only ledger, corrections are reversing entries |
| `units`, `rentals` (existing) | none | **none, leave as-is** | none (Starlink admin uses service role) |

Every policy is written with the `(select auth.uid())` wrapping pattern for performance. RLS penetration tests in Phase 1/7 verify this matrix exactly.

### 4.4 Migration workflow (per Supabase skill)

1. Iterate on the **dev environment** (Supabase branch or local stack, chosen at Phase 0) using MCP `execute_sql`, never `apply_migration`, so diffs stay clean.
2. When a phase's schema is final: run MCP `get_advisors` (security + performance), fix findings, then commit a migration file (`supabase migration new <name>` + `supabase db pull`, or `apply_migration` against production as the promotion step).
3. Regenerate `database.types.ts` via MCP `generate_typescript_types` after every applied migration.
4. Never modify the existing `units`/`rentals` tables in portal migrations.

---

## 5. Auth Configuration (Supabase + Google)

Phase 1 configuration steps, in order:

| Step | Who | Detail |
|------|-----|--------|
| 1. Create Google OAuth client | **Human (D2)** | Google Cloud Console. Authorized redirect URI: `https://cxmydfhbclfwzboqibmo.supabase.co/auth/v1/callback`. Consent screen: "McKee Security" branding |
| 2. Enable Google provider in Supabase | **Human** | Dashboard: Auth > Providers > Google, paste client ID + secret (secrets never through chat) |
| 3. Set `site_url` + redirect allow-list | Agent (Management API `PATCH config/auth`) | `site_url=https://mckeesecurity.ca`; allow-list: `https://mckeesecurity.ca/**`, `https://vercel-mckee-security.vercel.app/**`, `https://*-brendenmckees-projects.vercel.app/**`, `http://localhost:3000/**` |
| 4. Env vars to Vercel + `.env.local` | **Human** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`SUPABASE_SERVICE_ROLE_KEY` already set) |
| 5. Seed first admin | Agent | Service-role script: `auth.admin.createUser` for the McKee staff email + `profiles` row with `role='admin'`, `status='active'` |

Email/password settings: keep `mailer_autoconfirm=false`; activation-created users are created with `email_confirm: true` by the admin API so no confirmation email is needed (the invite link itself proves email ownership when `target_email` matches; when the invite has no target email, require Supabase email confirmation before dashboard access).

---

## 6. Auth & Activation Flows (precise)

### 6.1 Returning sign-in (handover 11.1)

1. Visitor hits `/user-dashboard`. Proxy refreshes any existing session. Layout calls `getClaims()`.
2. No session: render `SignIn` in place (logged-out state copy: "Securely manage your account information, cloud backups, and more." CTA "Manage Account", prominent "Continue with Google", secondary email/password form).
3. Google: `signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/api/auth/callback?next=/user-dashboard' }})` (PKCE). Callback route exchanges the code, sets cookies, redirects.
4. Email/password: `signInWithPassword` from the client component; on success `router.refresh()`.
5. Session exists but **no linked profile** (orphan): show "We could not find an account for `<email>`. If you received an invitation, use your activation link. Otherwise contact McKee Security." with sign-out button. Log the event.
6. Session + profile: render dashboard sections (Section 7).

### 6.2 Admin creates client (handover 7.2, 11.2)

Server action `createClient` (requireAdmin):

1. Validate input (Zod): first/last name required; email optional but validated; monitoring tier and/or cloud tier optional.
2. Insert `profiles` (`status='pending'`, `user_id=null`), insert `services` rows (`status='unpaid'` for monitoring per Q3 default, `'active'` if admin marks manually-billed) in one transaction.
3. Generate raw token (`crypto.randomBytes(32)` base64url), insert `invitations` with `token_hash=sha256(raw)`, `target_email` if provided.
4. If email provided: send invite email (Section 8) with `https://mckeesecurity.ca/account/activate?token=<raw>`. If not provided: surface the link in the admin UI for manual delivery.
5. Return created client to refresh the admin table.

Resend (handover 7.3): expire open invitation, create new token, re-send. Available until profile `status='active'`.

### 6.3 Activation, email/password path (handover 8.2, 11.3)

1. Client opens `/account/activate?token=...`. Server component: hash the token, look up via **service role** (no session exists yet). Invalid / expired / used: render the error screen with "contact McKee" copy (handover 8.2 business rule).
2. Valid: render chooser. Email path: email field (pre-filled and locked to `target_email` when set) + password with strength requirements.
3. Server action `activateWithPassword`: re-validate token, then `auth.admin.createUser({ email, password, email_confirm: <target_email ? true : false> })`, link `profiles.user_id`, set `status='active'`, set `invitations.used_at`, all transactional in intent (compensate: if profile linking fails, delete the created auth user).
4. Sign the user in (`signInWithPassword` server-side or client-side follow-up), redirect to `/user-dashboard`.

### 6.4 Activation, Google path (handover 8.2; hijack prevention per 22.1)

1. On "Continue with Google" from the activation page: server action sets a **short-lived (10 min) httpOnly cookie** `activation_token` containing the raw token, then triggers `signInWithOAuth` with `redirectTo=<origin>/api/auth/callback?next=/account/activate/complete`.
2. Callback exchanges the code (auth user now exists via OAuth signup, which is why R9 keeps signups enabled).
3. `/account/activate/complete` (server): read + clear the cookie, validate the token, and check: if `invitations.target_email` is set, it must equal the Google account email (case-insensitive); mismatch = show error, sign out, do not consume the token.
4. Link `profiles.user_id = user.id`, `status='active'`, mark invitation used, redirect to `/user-dashboard`.
5. **Invariant:** a Google identity is linked to a pending profile only when the request carries a valid unconsumed token. A Google sign-in without one lands in the orphan flow (6.1 step 5), never in someone's account.

### 6.5 Admin access gate

`(admin-portal)/layout.tsx`: `getClaims()`; then fetch own profile via user-context client; `role !== 'admin'` renders a neutral not-found response (do not advertise the route). Every admin server action independently calls `requireAdmin()` (fresh DB check, not JWT claims, so demotions apply immediately).

### 6.6 Orphan and hygiene rules

- Orphan auth users (no `profiles.user_id` link) older than 7 days: deleted by the cleanup cron (Phase 7).
- Expired unused invitations: retained 90 days for audit, then deleted by cleanup cron.
- Sign-out: standard `supabase.auth.signOut()` from the dashboard header.
- Rate limiting (Phase 7): activation validation and footage submission get a small Postgres-based per-IP counter (`private.rate_limits` table); Supabase Auth endpoints have their own built-in limits.

---

## 7. Client & Admin Dashboard Specification

### 7.1 Client dashboard `/user-dashboard` (handover 6)

Global chrome: site `Header`/`Footer` stay (portal is native to the site); welcome header "Welcome, {first_name}", sign-out, loading skeletons per card, per-section error boundaries with retry (handover 22.3).

| Section | Content | Client actions | Rules enforced |
|---------|---------|----------------|----------------|
| Security Monitoring | tier + status badge | **none** (read-only; no controls rendered at all) | Handover 6.2: client never changes tier/status |
| Cloud Backup | tier + status (display from Phase 3; card hidden if client has no cloud service) | Request Footage (Phase 6B). **No plan controls: plan assignment, changes, and cancellation are admin-only (R21).** Card copy points plan questions at McKee | Handover 6.3 as amended by stakeholder 2026-07-05 (R21) |
| Caller ID | contact list (phone + label) | add, remove, save (single save action commits the batch) | Validation: NANP format, no duplicates, cap (D6). Save triggers admin diff email |
| Device Maintenance | battery + smoke install dates, expiry state | none | Expired = amber/error highlight, not brand red (handover 14) |
| Payment banner | shown when any service is `'unpaid'` or a manual payment is due/overdue | Autopay services: Pay Now -> Stripe Checkout (Phase 5). Manual services: due date + amount + payment instructions (D11), no checkout button | Tier server-validated, success/cancel return states; banner variant driven by `billing_method` (R22) |

Mobile: cards stack, 44px touch targets, no horizontal scroll (handover 14.2). Empty states for every section.

### 7.2 Admin dashboard `/admin-dashboard` (handover 7)

Layout pattern: follow `starlink-admin` component density. The admin dashboard is the **operating console for the whole business**: every client, service, and payment (and every camera site in Track 2) is visible, searchable, and manageable from one place. The admin should be able to answer "who pays by card, who is overdue, who is healthy" in one glance and reach any client in two clicks. Tabs:

| Tab | Capabilities | Phase |
|-----|--------------|-------|
| Overview | KPI cards + simple trends: active clients, pending activations, services by type and tier, revenue split autopay vs manual, unpaid services, overdue manual payers, failed card payments (last 30 days), recent activity feed (activations, tier changes, caller ID changes, payments recorded) | 3 skeleton, completed in 5 |
| Clients | searchable table: instant text filter on name/email, filters for status, service type, tier, billing method, and overdue; sortable columns; pagination; create-client form; row click opens client detail | 2 basic table, 3 search + filters |
| Client detail | one page per client: profile info, services (assign/modify tier, cancel/restart, set billing method, amount, next due), payment history (both rails), devices, caller IDs + change history, invitation state + resend | 3 core, 5 billing fields |
| Billing | the collections console (7.3): autopay board (active subscriptions, failed payments needing follow-up) and manual board (upcoming dues, overdue highlighted amber/red, one-click record-payment) | 5 |
| Fleet | gateway health, per-site storage and margin (9.2.7) | 6A (Track 2) |
| Alerts | recent device expiry alerts, failed email sends, payment follow-ups | 7 |

All writes are server actions with `requireAdmin()`. Tier changes reflect immediately on the client dashboard (no caching of dashboard data: portal pages are dynamic). Analytics are plain SQL aggregates over the portal tables computed at request time; at McKee's scale this needs no analytics infrastructure, and if a query ever slows down the fix is a materialized view, not a new system.

### 7.3 Payments oversight: autopay and manual billing (R22)

Not every client pays by credit card, and the business must never depend on someone remembering to chase a legacy payer. Billing method is a first-class per-service attribute:

- **`stripe` (autopay):** the Phase 5 rails. Client pays once via Checkout for the admin-assigned tier; renewals are automatic; webhooks keep `services.status` truthful. `invoice.payment_failed` events surface on the Billing tab and email the admin, so a bounced card is a task, not a surprise.
- **`manual` (legacy e-transfer/cheque/cash):** admin sets `monthly_amount_cents` and `next_due_on` when assigning the service. The system then drives collection:
  1. Daily cron (9.4) finds manual services due within the reminder window (D11, default 7 days) or overdue, where `due_alerted_at` is null: emails the client the amount, due date, and payment instructions, and stamps the guard.
  2. The same cron sends the admin a **collections digest** (who is due, who is overdue, totals) whenever the list is non-empty; the Billing tab shows the live version.
  3. Admin records the received payment (one click from the Billing tab or client detail): inserts a `manual_payments` row, advances `next_due_on` one cycle, clears `due_alerted_at`, flips `'unpaid'` to `'active'`, and emails the client a confirmation.
- **Switching a client to autopay is one action:** admin flips `billing_method` to `'stripe'`; the client sees the Pay Now banner on next visit; the webhook completes the switch. The manual ledger stays as history.

---

## 8. Email System

Task 2.1 extends `src/lib/email.ts`: optional `to: string | string[]` and `cc` in the payload (default stays `CONTACT_EMAIL`). Portal templates live in `src/lib/portal/emails.ts` reusing the existing branded HTML shell.

| Template | Trigger | To | Phase |
|----------|---------|----|----|
| Account invitation | admin creates client / resend | client | 2 |
| Caller ID change alert | client saves list | admin inbox (`PORTAL_ADMIN_ALERT_EMAIL`, fallback `CONTACT_EMAIL`) | 4 |
| Device expiry alert | nightly cron detects newly expired | admin + client | 7 |
| Footage ready | retrieval presigns links, request marked ready | client | 6B |
| Footage failed | retrieval failure | client + admin | 6B |
| Payment success | Stripe webhook (optional per handover 12) | client | 5 |
| Manual payment reminder | cron: `next_due_on` within window or overdue (R22) | client | 5 template, 7 cron |
| Manual payment recorded | admin records a payment (7.3) | client | 5 |
| Collections digest | cron: any manual payer due or overdue | admin inbox | 7 |
| Card payment failed | Stripe `invoice.payment_failed` webhook | admin inbox | 5 |

Caller ID diff email: added contacts styled green, removed styled red (handover 6.4), plain-text fallback included. Email send failures are logged and surfaced in the admin alerts area (handover 22.3); a failed notification never rolls back the underlying save.

---

## 9. Integrations

### 9.1 Stripe (Phase 5)

- **Model:** one Stripe Product per service type. Monitoring: one recurring Price per tier (3 prices, only if Q3 confirms in-portal monitoring payment). Cloud backup: one recurring **per-camera** Price per (retention tier, resolution) cell (9 prices, matrix in 9.2.7); the subscription carries an item per cell in use with quantity = camera count. Price IDs live in a server-side map in `lib/portal/stripe.ts`, keyed by `(service_type, tier, resolution)`. Client code never sends price IDs.
- **Checkout:** server action verifies the caller owns the `services` row and reads the **admin-assigned tier from the database** (anti-spoofing, handover 9.3), creates a subscription-mode Checkout Session with `customer` (created/reused `stripe_customer_id`), `metadata: { profile_id, service_id, service_type, tier }`, success URL `/user-dashboard?payment=success`, cancel URL `/user-dashboard?payment=cancelled`.
- **Plan changes and cancellation are admin-only for every service type (R21).** Admin tier/resolution change with an active subscription = server-side `subscriptions.update` swapping the price (proration default) from the admin client-detail page. Cancel = `cancel_at_period_end` (data retention policy per D6/Q4). Clients never see change or cancel controls; their only money action is Pay Now checkout for the admin-assigned tier.
- **Billing method (R22):** checkout success webhook sets `services.billing_method='stripe'`. Manual-billing services never touch Stripe; they are tracked via `next_due_on` + `manual_payments` (7.3).
- **Webhook `/api/stripe/webhook`:** raw body via `await req.text()`, `stripe.webhooks.constructEvent` signature verification. Insert into `billing_events` first (PK conflict = already processed, return 200). Handle: `checkout.session.completed` (service -> `active`, store subscription id), `customer.subscription.updated` (tier/status sync), `customer.subscription.deleted` (-> `cancelled`), `invoice.payment_failed` (-> flag + optional admin email). All writes via service role.
- **Webhook is the source of truth** for payment state; the success redirect only drives UX (handover/discovery rule).

### 9.2 Camera cloud backup ingestion (Phase 6A)

The audit (1.4, 1.5) established the constraints: the storage layer is greenfield, UNV NVRs cannot push continuous video natively, Starlink Residential remains CGNAT (outbound-only), and 2026 Starlink uplink (15 to 35 Mbps) makes **mainstream-quality upload feasible**. The product goal: evidence-grade footage in the cloud, minimum recurring cost per site, and a plug-in-and-verify install for technicians.

#### 9.2.1 Architecture

```
Client site (Starlink Gen 4 or any ISP: outbound-only assumed)
│
├── UNV cameras + NVR             # NVR keeps its local recording exactly as today (unchanged)
│         │ mainstream RTSP (H.265/U-code) pulled per camera over the local network
│         v
├── McKee gateway device          # fanless mini PC + NVMe buffer (D8), one per site
│   ├── ffmpeg per camera         # mainstream RTSP -> 5-min mp4 segments, stream copy (no re-encode)
│   ├── store-and-forward queue   # NVMe buffer rides out Starlink outages (days of backlog)
│   ├── uploader                  # S3 multipart PUT, outbound 443 only, bandwidth-capped
│   ├── heartbeat + config-sync   # HTTPS to portal API: status up, config down
│   └── amazon-ssm-agent          # free hybrid node registration; break-glass remote access (R17)
│
└── (no inbound ports, no port forwarding, no public IP, no VPN)

AWS (ca-central-1)
├── S3 footage bucket             # sites/<site_id>/<camera_id>/<yyyy>/<mm>/<dd>/<hhmmss>.mp4
│   ├── objects PUT directly into the tier's storage class (9.2.5)
│   ├── lifecycle: expiration-only rules per tier prefix (9.2.5)
│   └── SSE-S3 encryption, versioning off, public access blocked
└── Per-site IAM credentials      # PutObject scoped to that site's prefix only (9.2.3)

Portal / cloud
├── Supabase: sites, cameras, gateways (+ daily usage rollup) (schema 4.2)
├── /api/gateway/heartbeat        # fleet health -> admin dashboard + offline alerting
├── /api/gateway/config           # versioned per-site config the gateway polls
└── Phase 6B retrieval reads the same bucket with a read-only credential
```

Design rules: the NVR stays the on-site system of record; the cloud copy is the sellable retention product, captured at **mainstream quality (R18)** so a retrieved clip is usable as evidence. The gateway initiates every connection, so CGNAT, double NAT, and dynamic IPs are irrelevant. Total recurring per-site infrastructure cost is S3 storage plus fractions of a cent of API calls: there is no server, no VPN subscription, and no per-camera license (9.2.6).

#### 9.2.2 Gateway software (`camera-gateway/`)

- Node/TypeScript agent supervised by systemd; ffmpeg spawned per active camera: `rtsp_transport tcp`, `-c copy` remux into 5-minute fragmented mp4 segments. **Every tier is a pure stream copy, no transcoding anywhere**, so an N100 handles 8+ cameras with trivial CPU.
- **Resolution tier handling (R20):** 2160p pulls the 4K mainstream (`/media/video1` on UNV); 1080p and 1440p pull the camera sub-stream (`/media/video2`), whose resolution is set to the purchased tier on the NVR/camera during install (fully configurable on the fleet). Bench test confirms sub-stream resolution options per deployed model; Quick Sync transcode on the N100 exists only as a contingency if some model ever caps its sub-stream below a purchased tier.
- Bitrate and resolution are controlled **at the camera** (UNV: H.265 + U-code; targets: ~5 Mbps 4K mainstream, ~3 Mbps 1440p sub-stream, ~2 Mbps 1080p sub-stream). The NVR keeps recording the full 4K mainstream locally regardless of the purchased cloud resolution.
- Store-and-forward: segments land on the NVMe queue first; the uploader drains oldest-first with retry/backoff and a per-site bandwidth cap (default: 60% of measured uplink, configurable). A 500GB buffer holds roughly 3.5 days of 4-camera backlog at 3 Mbps; 1TB roughly 7 days. If the buffer high-watermark is hit during an extended outage, oldest segments are dropped and the drop window is reported via heartbeat (the NVR still has that footage locally).
- Heartbeat every 5 minutes to `/api/gateway/heartbeat` (per-gateway secret, hash in `gateways.secret_hash`): per-camera capture state, queue depth, disk free, cumulative bytes uploaded, agent version. Config changes flow the other way: heartbeat response carries the current `config_version`; on mismatch the agent GETs `/api/gateway/config` and applies (add/remove cameras, caps, capture mode) with no site visit.
- Clock discipline: NTP required (segment timestamps drive retrieval matching).
- Watchdog: systemd restarts on crash; the agent restarts individual ffmpeg processes on stall (no-data timeout) and reports flaps in the heartbeat.

#### 9.2.3 Provisioning and the technician experience

The install must be plug-in-and-verify: no laptop at the site, no router changes, no networking knowledge beyond plugging in two cables.

**Office (once per gateway, before the truck rolls):**
1. Flash the standard gateway image (`camera-gateway/provision/`): OS, agent, amazon-ssm-agent with a hybrid activation, and the gateway's identity file (gateway id + API secret). Record `hardware_serial` in the admin dashboard; the device row now exists and shows "awaiting first contact".
2. Admin creates the site in the admin portal, assigns the gateway to it, and enters the cloud tier. The per-site IAM credential is provisioned (script in `provision/`) and baked into the identity file.

**On site (technician, target under 15 minutes):**
1. Plug the gateway into the camera network (NVR switch or PoE switch port) and power.
2. The gateway boots, reaches the internet outbound, heartbeats in, and pulls its config. The admin dashboard (on the technician's phone) flips the gateway to green.
3. Camera discovery: the agent scans for UNV cameras (ONVIF probe), reports candidates in the heartbeat, and the technician confirms/names them in the admin portal (labels like "Driveway"). Camera credentials are the standard McKee install credentials entered once per site in the portal, delivered to the gateway via config-sync, never stored in the portal in plaintext (encrypted column or Vault).
4. The dashboard shows a per-camera live checklist: RTSP connected, first segment written, first segment uploaded. All green = done; the SOP in `camera-gateway/README.md` is one page.

**Credentials (least privilege):** one IAM credential per site allowing `s3:PutObject` + multipart helpers **only under `sites/<site_id>/*`**. No read, no list, no delete, no other prefixes: a stolen gateway cannot read any footage, not even its own site's. Start with per-site IAM users; move to short-lived STS via a token-vending route if the fleet grows (recorded hardening item). Camera rows drive both gateway capture config and the client-facing footage request form (Q8 resolved).

#### 9.2.4 Bandwidth and cost model (retention x resolution matrix, validate in pilot)

The fleet is mostly **8MP (4K) ColorHunter/LightHunter cameras**; clients choose the stored resolution per camera (R20). H.265 + U-code working bitrates and volumes:

| Resolution | Bitrate | Per camera per day | Path |
|------------|---------|--------------------|------|
| 1080p | ~2 Mbps | 21.6 GB | sub-stream set to 1080p, copy |
| 1440p | ~3 Mbps | 32.4 GB | sub-stream set to 1440p, copy |
| 2160p (4K) | ~5 Mbps | 54 GB | 4K mainstream, copy |

**Monthly wholesale cost per camera** (ca-central-1 approx: Standard ~$0.025, Standard-IA ~$0.0138, Glacier Instant Retrieval ~$0.005 per GB):

| | 7-day | 30-day | 90-day |
|-|-------|--------|--------|
| 1080p | ~$3.80 | ~$8.95 | ~$9.70 |
| 1440p | ~$5.70 | ~$13.40 | ~$14.60 |
| 2160p | ~$9.45 | ~$22.40 | ~$24.30 |

Everything else is noise: PUT requests $0.05 to $0.35/camera/month, upload into S3 free, a 1-hour retrieval ~$0.16 to $0.27 all-in. Gateway hardware is ~$250 one-time per site: under $2/camera/month on a 4-camera site amortized over 3 years.

Notes that shape pricing and site design:

- **The 90-day quirk:** Glacier Instant Retrieval is so cheap that 90-day wholesale is barely above 30-day at every resolution, making 90-day the natural high-margin flagship.
- **Starlink uplink budget** (Residential median ~22 Mbps up): 4 cameras at 2160p = 20 Mbps, workable but tight; at 1440p = 12 Mbps comfortable; at 1080p = 8 Mbps trivial. Mixed-resolution sites usually land comfortably. Beyond 4 to 5 full-4K cameras: drop some to 1440p, use motion-gated upload, or move the site to Starlink Priority (40+ Mbps up). The uploader's bandwidth cap plus the NVMe buffer absorbs peak-hour dips either way.
- **Cost levers, in order of impact:** motion-gated upload (`events_only` typically cuts 70 to 95% at rural sites while the NVR keeps the continuous record), the resolution tier itself (1080p costs 40% of 4K), and per-camera pricing so heavy sites pay for what they use. Starlink Residential data is unlimited standard data, so upload volume costs the client nothing.

These wholesale numbers feed the retail matrix recommendation in 9.2.7 (final pricing is D6/Q2).

#### 9.2.5 Retention tiers map directly to S3 storage classes (this is "Arctic")

Each tier's retention window equals a storage class minimum-duration billing floor, so there are no early-delete penalties and no lifecycle transition costs: the gateway PUTs each object **directly into the tier's class** via the `x-amz-storage-class` header, and an expiration-only lifecycle rule deletes at end of window.

| Tier | Storage class at PUT | Class minimum duration | Lifecycle rule | Retrieval behavior |
|------|---------------------|------------------------|----------------|--------------------|
| 7-day | S3 Standard | none | expire day 7 | instant GET, no fee |
| 30-day | S3 Standard-IA | 30 days (exact fit) | expire day 30 | instant GET, $0.01/GB |
| 90-day | S3 Glacier Instant Retrieval | 90 days (exact fit) | expire day 90 | **instant GET**, $0.03/GB |

Glacier Instant Retrieval is genuinely Glacier-class economics (83% cheaper than Standard) with millisecond GETs, so the "Arctic" brand promise holds while **no restore jobs exist anywhere in the product**. Deep Archive (180-day minimum) only enters if a future 6-month/1-year archive tier is sold; the restore-job flow in 9.3 step 4 is reserved for that. A tier change updates the gateway's PUT class via config-sync and the site's expiration rule; existing objects keep their class and age out under the old window (acceptable, documented behavior).

#### 9.2.6 Platform decision record (R16)

| Option | Verdict | Why |
|--------|---------|-----|
| Gateway -> direct S3, Supabase metadata, Vercel control plane | **Chosen** | No 24/7 server, no inbound ports, near-zero fixed cost (S3 plus pennies of API), per-site scaling, CGNAT-native |
| Rebuild on Elastic Beanstalk (legacy direction) | Rejected | Audit showed nothing was ever built there; a 24/7 ingest VM adds ~$30+/month fixed cost and a single point of failure with no benefit over direct-to-S3. The legacy EB apps were deleted in the 2026-07-04 cleanup (1.4) |
| Always-on VPN/tunnel (Tailscale, WireGuard mesh) | Rejected | Recurring per-device subscription or self-hosted coordinator to babysit; burns Starlink's 1,200-session CGNAT budget; unnecessary because SSM covers break-glass access (R17) |
| AWS Transfer Family (managed FTP/SFTP) | Rejected | ~$216/month idle endpoint; FTP only receives NVR snapshots anyway (1.5) |
| Kinesis Video Streams | Rejected for v1 | Per-GB ingest pricing, per-stream management, SDK complexity; overkill for segment backup |
| Third-party cloud adapter (e.g. Videoloft) | Rejected | Per-camera licensing, no ownership; conflicts with building McKee's own product |
| NVR-native upload only | Rejected | Snapshots only (1.5); cannot deliver the video backup product |

Remote management stack (R17): amazon-ssm-agent registers each gateway as a free AWS hybrid node over outbound HTTPS. Fleet-wide day-to-day changes ride the config-sync channel (free). Break-glass shell access is SSM Session Manager at $0.05/session, run-command at $0.002/invocation: a support incident costs cents, and a healthy fleet costs zero.

#### 9.2.7 Business operations integration

- **Client experience:** the cloud backup card shows per-camera protection status ("Driveway: backed up 3 minutes ago" from heartbeat data), the tier and its retention window, and the footage request form (camera + date/time range). Requests return working links typically within a minute (9.3). No client ever interacts with AWS concepts, and no plan controls are rendered: tier, resolution, and cancellation go through McKee (R21).
- **Admin experience:** a fleet board in the admin dashboard: every site, gateway health (last heartbeat, queue depth, disk, per-camera state), storage consumption, and open footage requests. Offline gateways surface red within 30 minutes and email the admin (9.4).
- **Accounting:** heartbeats carry cumulative uploaded bytes; a nightly rollup writes per-site daily usage (`site_usage` table: `site_id`, `day`, `bytes_uploaded`, unique on both). The admin fleet board shows per-site GB stored and estimated wholesale cost next to the subscription price, so margin per client is visible at a glance. Pricing is **per camera per (retention, resolution) cell** (R20): one Stripe Price per cell (9 prices), the site's subscription carries one item per cell in use with quantity = camera count, and resolution changes are admin actions (R21) that swap the subscription item with proration and config-sync the gateway. Flat per-site pricing is avoided because cost scales linearly with cameras. `billing_events` capture keeps this QB Scope B ready.

Recommended retail matrix at ~60% gross margin, pending D6/Q2 sign-off (wholesale from 9.2.4 in parentheses):

| Per camera per month | 7-day | 30-day | 90-day |
|----------------------|-------|--------|--------|
| 1080p | $9.99 (~$3.80) | $21.99 (~$8.95) | $27.99 (~$9.70) |
| 1440p | $14.99 (~$5.70) | $32.99 (~$13.40) | $41.99 (~$14.60) |
| 2160p | $24.99 (~$9.45) | $54.99 (~$22.40) | $69.99 (~$24.30) |

Every cell sits between 59% and 66% gross margin, and the ladder reads cleanly to clients: resolution up = quality, retention up = protection.
- **Support runbook (in `camera-gateway/README.md`):** offline gateway -> check site power/internet, then SSM session; camera down -> config-sync re-push, then discovery re-run; buffer filling -> confirm uplink, lower cap or bitrate. Every action is remote; a truck roll is the last resort.

### 9.3 Footage retrieval (Phase 6B)

1. Client submits camera (a `cameras` row) + time range; `footage_requests` insert (`pending`); rate-limited.
2. Server lists matching segments under `sites/<site_id>/<camera_id>/` for the range (`ListObjectsV2`, timestamp-keyed names), stores keys in `s3_keys`, status -> `processing`.
3. All three product tiers serve **instant GETs** (9.2.5): presign immediately. Single segment = one presigned GET; multi-segment = per-segment presigned links listed on the dashboard (server-side zip bundling is a later nicety). Status -> `ready`, email sent, typically within a minute of the request.
4. Restore-job path (dormant until a Deep Archive tier is ever sold): `RestoreObject`, then completion per D7: (a) cron poller (`HeadObject` `x-amz-restore`), (b) S3 Event Notifications -> webhook route, or (c) lazy dashboard check + daily sweep.
5. Presigned TTL per D6/Q6 (default 72h; 7-day max with IAM user credentials). Cleanup cron marks `ready` past TTL as `expired`. Failures -> `failed` + reason + client and admin emails.

Vercel-side IAM (separate from gateway credentials): list + read (+ restore for the dormant path) on the footage bucket, no write, no delete. Credentials only in Vercel env.

### 9.4 Scheduled jobs (Phase 7)

`vercel.json` crons, all routes check `Authorization: Bearer ${CRON_SECRET}`:

| Route | Schedule | Work |
|-------|----------|------|
| `/api/cron/device-expiry` | daily 06:00 UTC | expired devices where `expiry_alerted_at is null` -> email admin + client, stamp `expiry_alerted_at` (R14) |
| `/api/cron/cleanup` | daily | orphan auth users >7d, invitations expired >90d, footage links past TTL |
| `/api/cron/payment-due` | daily 06:00 UTC | manual services with `next_due_on` inside the reminder window or overdue and `due_alerted_at is null` -> remind client (amount, date, instructions per D11), stamp guard; send admin the collections digest when any manual payer is due or overdue (R22, 7.3) |
| `/api/cron/gateway-health` | every 30 min (plan permitting, else hourly + dashboard-first). Added in Track 2 (6A) | gateways with `last_seen_at` older than 30 min and not already alerted -> email admin; also writes the nightly `site_usage` rollup on its midnight run |
| `/api/cron/footage-poller` | dormant | only if a Deep Archive tier is ever sold (9.3 step 4) |

Fallback if Vercel plan is Hobby: `pg_cron` + Supabase Edge Function for sub-daily jobs (R4).

---

## 10. Phase Plan

**Execution order: 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 7 (core portal launch), then 6A -> 6B (camera cloud backup, Track 2, post-launch).** Phase numbers are kept stable because the rest of this document references them; 6A/6B simply run after 7. Each phase ends with a test gate; do not start the next phase with a failing gate. **[HUMAN]** marks stakeholder checkpoints (handover Section 21 model).

### Phase 0: Foundation

- [x] D1: reuse existing Supabase project, renamed "McKee Security Platform" (2026-07-04)
- [x] Dev-environment strategy: Supabase development branch (paid plan confirmed, R15)
- [ ] **[HUMAN]** Add to Vercel (all environments) and `.env.local`: `NEXT_PUBLIC_SUPABASE_URL=https://cxmydfhbclfwzboqibmo.supabase.co` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_4YC9QGFgdzv7GVReW5u3iA_EFKLH-LP` (both values are public-safe by design)
- [ ] `npm install @supabase/ssr` in `website/`
- [ ] Create `lib/portal/supabase/{server,client,admin}.ts` + `proxy.ts` with portal-scoped matcher
- [ ] Scaffold `(portal)` + `(admin-portal)` route groups: branded empty shells, `noindex` metadata, mobile-checked
- [ ] Remove the 5 legacy redirects from `next.config.ts`
- [ ] `supabase init` at repo root (`supabase/` directory), link to project
- [ ] Read `node_modules/next/dist/docs/` guides for proxy, route handlers, server actions before writing auth code

**Gate:** shells render inside site chrome on desktop + mobile preview deploy; a server component successfully queries Supabase; `npm run build` clean; existing Starlink admin and Data Drops still work.

### Phase 1: Auth, Roles, RLS

- [ ] **[HUMAN]** D2/D3: Google OAuth client created; provider enabled in Supabase dashboard
- [ ] Agent: PATCH auth config (`site_url`, redirect allow-list) via Management API
- [ ] Migration 1: enums, `private.is_admin()`, `profiles`, `set_updated_at()`, RLS policies per 4.3
- [ ] `auth.ts` helpers; `SignIn` component; OAuth callback route; orphan screen (6.1 step 5)
- [ ] Admin layout gate; seed first admin user (5.5)
- [ ] Generate `database.types.ts`
- [ ] Run `get_advisors` (security) and resolve findings

**Gate (test matrix):** Google sign-in works on preview; email sign-in works; signed-out visitor to `/admin-dashboard` and client-role visitor both denied; two test users cannot read each other's `profiles` rows through the publishable-key client (scripted check); advisors clean.

### Phase 2: Provisioning & Activation

- [ ] Task 2.1: extend `lib/email.ts` with `to`/`cc` override (keep default behavior for existing forms)
- [ ] Migration 2: `invitations`, `services` (+ RLS)
- [ ] Admin: create-client form + server action (6.2); client table; resend invite
- [ ] `invitations.ts` token utilities; invite email template
- [ ] `/account/activate`: validation states, email/password path (6.3), Google path with activation cookie (6.4)
- [ ] Orphan + "sign in before activating" messaging (handover 8.2)
- [ ] **[HUMAN]** D6/Q7: confirm admin alert inbox (`PORTAL_ADMIN_ALERT_EMAIL`)

**Gate:** on preview: admin creates client A (Google activation) and client B (email/password activation); both see assigned tiers; token reuse fails; expired token fails; Google email mismatch against `target_email` fails without consuming the token; resend works.

### Phase 3: Services Display & Management

- [ ] **[HUMAN]** D6/Q1+Q3: tier feature copy; whether monitoring is paid in-portal
- [ ] Client dashboard: monitoring card (read-only), cloud backup card (display-only, no plan controls per R21), welcome header, skeletons, empty states, error boundaries
- [ ] Admin: client detail with tier modify, cancel/restart, manual cloud-backup assign (all server actions, `requireAdmin()`)
- [ ] Admin Clients tab: search (name/email instant filter), filters (status, service type, tier), sortable columns, pagination (7.2)
- [ ] Admin Overview tab skeleton: active clients, pending activations, services by type/tier, activity feed (billing KPIs join in Phase 5)

**Gate:** admin tier change appears on client dashboard on next load; client session has no UI or action path that mutates `services` (verified by scripted RLS write attempt); admin finds any client by partial name or email in one search.

### Phase 4: Caller ID & Devices

- [ ] Migration 3: `caller_id_contacts`, `caller_id_changes`, `devices` (+ RLS)
- [ ] `phone.ts` normalization; caller ID card with add/remove/save; save action: transactional replace, diff compute, history insert, admin email (green/red diff)
- [ ] Devices card with expiry highlighting; admin device date editor (updates clear `expiry_alerted_at`)
- [ ] Admin caller ID viewer + history
- [ ] **[HUMAN]** D6/Q16+Q9 answered (cap, history in UI)

**Gate:** saving a change emails admin with the exact correct diff; duplicate phone rejected; invalid format rejected; device installed 2018 renders expired with amber/error styling; admin date update clears the expired state.

### Phase 5: Stripe & Billing

Track 1 scope: build the complete billing rails on **both methods** (R22): Stripe checkout/webhooks for autopay, and the manual-payment ledger + reminder machinery for legacy payers. Monitoring prices go live if Q3 confirms in-portal monitoring payment. The cloud backup 9-cell matrix (9.2.7) is set up in test mode only and is **not client-payable until Track 2 ships** (the service cannot run before ingestion exists); admins can still record cloud backup `services` rows for manually-arranged clients. All plan changes and cancellations are admin actions per R21.

- [ ] **[HUMAN]** D4: Stripe account; products/prices per 9.1; webhook endpoint registered; keys in Vercel. D6/Q3 confirmed (monitoring paid in portal?). D11: payment instructions + reminder window. Q2 cloud pricing can wait for Track 2
- [ ] Migration 4: `billing_events`; `manual_payments`; `profiles.stripe_customer_id`; `services.stripe_subscription_id`, `billing_method`, `monthly_amount_cents`, `next_due_on`, `due_alerted_at`
- [ ] `stripe.ts` (SDK + price map); checkout server action with DB-side tier validation; webhook route (9.1); payment banner (both variants, 7.1); admin-only plan change/cancel actions (R21); success/cancel UX
- [ ] `payments.ts` actions: record manual payment (ledger insert + due-date advance + confirmation email), switch billing method (7.3)
- [ ] Admin Billing tab (7.3): autopay board with failed payments, manual board with dues/overdues, record-payment flow; Overview billing KPIs (revenue split, overdue count, failed payments)
- [ ] Email templates: manual payment reminder, manual payment recorded, card payment failed (admin); payment success (optional, per handover 12)

**Gate (Stripe test mode):** full checkout activates the service via webhook (not redirect); webhook replay is a no-op; tampered tier/price attempts are impossible via API surface; admin cancel sets `cancel_at_period_end`; admin plan change swaps price with proration; client session exposes no change/cancel path (R21); recording a manual payment advances `next_due_on`, clears the guard, activates the service, and emails the client; a simulated `invoice.payment_failed` lands on the Billing tab and emails the admin.

### Phase 6A: Camera Cloud Backup Ingestion (Track 2, starts after Phase 7 launch)

- [ ] **[HUMAN]** D5: approve footage bucket creation + tier storage-class mapping (9.2.5) + IAM model (9.2.3); provide admin-capable AWS access for setup. D8: gateway hardware SKU purchased and pilot site selected. D9: capture defaults confirmed (mainstream bitrate target)
- [ ] Create S3 bucket (ca-central-1): public access blocked, SSE-S3, expiration-only lifecycle rules per tier
- [ ] Migration 5: `sites`, `cameras`, `gateways`, `site_usage` (+ RLS incl. `rtsp_path` exclusion for clients)
- [ ] Admin dashboard: site + camera registration, gateway assignment and secret generation, fleet board (9.2.7: health, storage, margin view)
- [ ] `/api/gateway/heartbeat` + `/api/gateway/config` routes (per-gateway secret auth, config versioning)
- [ ] Build `camera-gateway/` agent: capture per resolution tier (stream copy at every tier: mainstream for 2160p, sub-stream for 1080p/1440p), store-and-forward uploader with bandwidth cap and direct-to-class PUT, heartbeat, config-sync, ONVIF discovery assist
- [ ] Provisioning image: OS + agent + amazon-ssm-agent hybrid registration + identity file; one-page technician SOP in `camera-gateway/README.md` (includes setting the sub-stream resolution to the purchased tier on the NVR/camera)
- [ ] Bench test: gateway + one 8MP UNV camera on the shop network, all three resolution tiers verified as stream copies (4K mainstream; sub-stream reconfigured to 1080p and then 1440p, confirming the fleet's sub-stream resolution options per model), uploads landing in the correct storage class, per-camera checklist green in the admin dashboard
- [ ] **[HUMAN]** Pilot install at the selected Starlink site by a technician following only the SOP (agent developer hands-off: this validates the install experience, not just the software)

**Gate:** pilot uploads mainstream continuously for 7 days through Starlink CGNAT with zero inbound ports and no VPN; a forced 2-hour internet outage backfills from the buffer with no gap; a config change (camera rename + bitrate cap) applies remotely via config-sync without a site visit; SSM break-glass session works; heartbeat outage alert reaches the admin; per-site IAM credential verifiably cannot read or list anything; expiration rule observed deleting aged objects (short-window test rule); technician completed the install in under 15 minutes from the SOP alone.

### Phase 6B: Footage Requests & Retrieval (Track 2)

- [ ] **[HUMAN]** D6/Q4+Q6 (retention on cancel, link TTL). D7: Vercel plan check (affects gateway-health cron cadence)
- [ ] Migration 6: `footage_requests` (+ RLS with camera-ownership check)
- [ ] `footage-retrieval.ts` (list, presign; dormant restore path); request form in cloud backup card (cameras from DB); per-camera protection status on the client card (9.2.7); requests list with statuses; admin view of all requests
- [ ] Ready/failed emails; rate limiting on request creation

**Gate:** end-to-end on the pilot site: client requests a range -> presigned link email arrives typically within a minute -> mainstream footage plays -> link expires at TTL; a 90-day-tier (Glacier Instant Retrieval) object serves instantly with no restore job; request against a camera the client does not own is impossible (RLS + action check); forced failure notifies client + admin and marks `failed`.

### Phase 7: Automation, Hardening, Launch (core portal goes live here)

- [ ] `vercel.json` crons + `CRON_SECRET`; device-expiry job (R14 semantics); cleanup job (6.6); payment-due job (R22: client reminders + admin collections digest, 7.3). Gateway-health cron joins in Track 2 (9.4)
- [ ] Rate limiting on activation endpoints (6.6); footage endpoints get the same treatment in Track 2
- [ ] RLS penetration script: for every portal table x {anon, client A, client B, admin}, assert the 4.3 matrix; run against production before launch
- [ ] Security sweep: webhook signature tests, `get_advisors` clean, no service-role usage outside `admin.ts`/webhook/cron, secrets audit
- [ ] Full mobile UX pass; accessibility spot check (focus rings, labels, keyboard nav)
- [ ] Cross-browser smoke (Chrome, Firefox, Safari, iOS Safari, Android Chrome) per handover 22.4
- [ ] **[HUMAN]** stakeholder walkthrough (mobile + desktop) and production sign-off

**Gate:** handover Section 22 checklist fully satisfied; crons observed firing in preview (including a payment-due run that reminds a test manual payer exactly once per cycle); sign-off recorded in Progress Log.

---

## 11. Business Rule Traceability

| Handover rule | Enforced by |
|---------------|-------------|
| Admin-provisioned accounts, no open registration (4, 8) | No signup UI; activation requires valid token (6.3/6.4); orphan handling + cleanup (6.6); R9 |
| Client never changes monitoring tier/status (6.2, 9.1) | No UI controls; no client RLS write on `services` (4.3); tier changes only via admin actions + webhooks |
| Client pays only the admin-assigned tier (6.6, 9.3) | Checkout server action reads tier from DB; price map server-side only (9.1) |
| Cloud backup: client requests footage; plan is admin-managed (6.3 as amended 2026-07-05, R21) | Phase 6B request flow (9.3); admin-only plan actions on Phase 5 rails; no client change/cancel UI anywhere |
| Legacy (non-card) payers are reminded, tracked, and collected (stakeholder 2026-07-05) | R22: `billing_method` + `manual_payments` ledger + payment-due cron + Billing tab (4.2, 7.3, 9.4) |
| Admin can search, analyze, and manage the whole client base from one console (7, stakeholder 2026-07-05) | Tabbed admin dashboard: Overview KPIs, searchable Clients, Billing collections console (7.2/7.3) |
| Caller ID changes alert admin with green/red diff (6.4, 12) | Save action diff + email (Section 8); history table |
| Device expiry 5yr battery / 10yr smoke, alerts to both parties (6.5, 11.9) | Computed expiry (4.2); nightly cron + `expiry_alerted_at` (9.4, R14) |
| Cloud retention tiers 7/30/90-day actually enforced (9.2 handover) | Direct-to-class PUT + expiration-only lifecycle per site prefix (9.2.5, R19) |
| Footage stored durably off-site at evidence quality and retrievable (6.3, 13) | Mainstream gateway ingestion (9.2, R18), outbound-only through CGNAT with no VPN (1.5, R17); instant presigned retrieval on all tiers (9.3) |
| Cameras listed per client in footage form (18/Q8) | `cameras` table registered at provisioning (4.2, 9.2.3) |
| Activation token: single-use, expiring, cryptographically random (22.1) | 32-byte random, SHA-256 stored, `used_at`, partial unique index (4.2, R8) |
| Google linking requires valid token, no hijacking (22.1) | Activation cookie flow + target-email match invariant (6.4) |
| RLS on all client-scoped tables, tested (22.1, 22.4) | Matrix 4.3; scripted penetration gates (Phases 1, 7) |
| Webhooks: signature-verified, idempotent, source of truth (9.3, 22.2) | 9.1 webhook design + `billing_events` PK |
| Footage links time-limited and signed (22.2) | Presigned URLs + TTL + expiry cron (9.3) |
| AWS credentials least-privilege, server-side only (22.2) | Per-site write-only prefix-scoped IAM for gateways (9.2.3); read-only Vercel credential (9.3); nothing client-side |
| Server-side admin checks beyond RLS (22.1) | `requireAdmin()` fresh DB check in every admin action (6.5) |
| Portal feels native to mckeesecurity.ca (14) | Live tokens + shared components (R11); site chrome retained (7.1) |
| Human checkpoints for all new infrastructure (21) | **[HUMAN]** items in every phase; secrets never through chat |
| QB Scope B compatibility without building it (23.1) | `billing_events` + `stripe_customer_id`/`subscription_id` retention (4.2, 9.1) |

---

## 12. Environment Variables (portal additions)

| Variable | Scope | Phase |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local | 0 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel + local | 0 |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel only | exists (Starlink) |
| `PORTAL_ADMIN_ALERT_EMAIL` | Vercel | 2 (fallback `CONTACT_EMAIL`) |
| `PORTAL_ETRANSFER_EMAIL` | Vercel | 5 (payment instructions in manual reminder emails, D11) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Vercel only | 5 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel + local | 5 |
| `FOOTAGE_AWS_ACCESS_KEY_ID`, `FOOTAGE_AWS_SECRET_ACCESS_KEY`, `FOOTAGE_AWS_REGION`, `FOOTAGE_BUCKET` | Vercel only | 6B (read/list/restore-only credential, 9.3) |
| `CRON_SECRET` | Vercel only | 7 |

Phase 0 values (public-safe): `NEXT_PUBLIC_SUPABASE_URL=https://cxmydfhbclfwzboqibmo.supabase.co`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_4YC9QGFgdzv7GVReW5u3iA_EFKLH-LP`.

**Not in Vercel by design:** per-site gateway credentials (write-only, prefix-scoped) live only on each gateway device (9.2.3); gateway heartbeat secrets are hashed in `gateways.secret_hash`.

Existing and unchanged: `RESEND_API_KEY`, `CONTACT_EMAIL`, `EMAIL_FROM`, `DATA_DROPS_*`, `STARLINK_ADMIN_*`, `SUPABASE_URL`, `GOOGLE_PLACES_*`.

---

## 13. Progress Log

| Date | Milestone |
|------|-----------|
| 2026-07-04 | Handover audited against repo; plan v1 created |
| 2026-07-04 | Supabase project renamed to "McKee Security Platform" (Management API, verified via MCP). Auth config audited: site_url still localhost, Google disabled, publishable key available. Advisors: INFO-only (units/rentals no policies, intentional) |
| 2026-07-04 | Plan hardened to v2: verified Next 16 proxy/cookies facts from bundled docs, adopted `getClaims()` + publishable key + required `proxy.ts` per current Supabase SSR guidance, full schema + RLS matrix + flow specs + traceability added. `npm install` run in `website/` (node_modules present). Phase 0 remaining items ready to start |
| 2026-07-04 | Plan v3: camera cloud backup added end to end. AWS audit via CLI found the legacy `nvr-backup` EB env has **no deployed code** (stock sample app) and no Glacier vaults or footage buckets exist: ingestion is greenfield. Research confirmed UNV NVRs push snapshots only and Starlink CGNAT blocks inbound. Designed gateway-to-S3 ingestion (9.2), lifecycle-based retention (9.2.5), instant presigned retrieval (9.3), new `sites`/`cameras`/`gateways` schema, Phase 6 split into 6A/6B. Legacy EB decommission + Gmail credential rotation flagged (D10) |
| 2026-07-04 | Plan v4 + AWS cleanup executed. Ingest redesigned around 2026 realities: mainstream H.265 capture (R18, Starlink Gen 4 uplink 15 to 35 Mbps makes it feasible), no VPN anywhere (R17, SSM hybrid nodes now free to register), retention tiers PUT directly into matching storage classes with instant GETs on all tiers (R19: Standard / Standard-IA / Glacier Instant Retrieval = "Arctic"). Zero-touch technician provisioning (9.2.3), full cost model (9.2.4), business ops integration incl. per-site margin visibility (9.2.7). AWS cleaned: six legacy EB apps deleted, only Data Drops (EB + RDS) remains (1.4, D10) |
| 2026-07-05 | Resolution tiers added (R20): per-camera 1080p/1440p/2160p storage choice. Cost model rebuilt as a retention x resolution wholesale matrix (9.2.4) with a 9-cell retail recommendation at ~60% margin (9.2.7); Stripe model updated to per-camera prices per cell (9.1) |
| 2026-07-05 | R20 simplified per ops input: the camera sub-stream resolution is fully configurable via the NVR, so 1080p and 1440p are sub-stream copies set to the purchased resolution at install. **No transcoding anywhere**; Quick Sync demoted from D8 requirement to contingency. Bench test now verifies per-model sub-stream resolution options |
| 2026-07-05 | Final pre-build audit passed. Build order locked: Track 1 = core portal (Phases 0-5, 7), Track 2 = camera cloud backup (6A/6B) after launch. Cloud backup client purchase flows deferred to Track 2; Q2 pricing moved to the 6A gate. Plan v4.2, ready for Phase 0 |
| 2026-07-05 | Plan v4.3 per stakeholder: cloud backup plan management locked to admin (R21, supersedes handover 6.3 self-service). Admin console fully specified: Overview analytics, searchable Clients tab, Billing collections console (7.2/7.3). Dual billing rails added (R22): `billing_method` on services, append-only `manual_payments` ledger, payment-due reminder cron with admin collections digest, new emails, D11 opened. Schema, RLS, Stripe, phases, traceability all updated |

## 14. Decision Log

| Date | Decision |
|------|----------|
| 2026-07-04 | `PRODUCT_HANDOVER.md` kept unmodified as requirements baseline; this file owns implementation |
| 2026-07-04 | Live site brand tokens supersede handover palette (per handover 14.1) |
| 2026-07-04 | Vercel-only MVP; Cloud Run only if Phase 6 evaluation demands it |
| 2026-07-04 | R1 to R14 adopted (Section 2): Resend, Stripe, Vercel Cron, `@supabase/ssr` + `getClaims()` + scoped `proxy.ts`, custom hashed invitation tokens, signups enabled at Auth layer with app-layer enforcement, admin ops via RLS not service role, `expiry_alerted_at` alert guard |
| 2026-07-04 | D1 resolved: single platform Supabase project (renamed in place); `units`/`rentals` untouched, no policies added |
| 2026-07-04 | R15: Supabase paid plan confirmed; dev via Supabase development branch, promote via migrations |
| 2026-07-04 | R16: camera ingestion = on-site gateway direct to S3 (no Elastic Beanstalk, no 24/7 ingest server); alternatives recorded in 9.2.6 |
| 2026-07-04 | R17: no VPN services or devices; SSM hybrid nodes (free registration, pay-per-use break-glass) + config-poll channel for management |
| 2026-07-04 | R18: mainstream (full resolution) capture is the default so retrieved footage is evidence-grade; camera-side H.265/U-code keeps it to 2 to 3 Mbps |
| 2026-07-04 | R19: tiers map to storage classes with matching minimum durations (Standard / Standard-IA / Glacier Instant Retrieval); direct-to-class PUT, expiration-only lifecycle, instant retrieval on every product tier (9.2.5). Restore-job path dormant unless a Deep Archive tier is sold |
| 2026-07-04 | D10 executed: legacy AWS decommissioned (six EB apps deleted, both regions); Data Drops EB + RDS are the only remaining AWS workloads (1.4) |
| 2026-07-05 | R20: client-selectable storage resolution per camera (1080p/1440p/2160p); stream copy at every tier (sub-stream resolution set on the NVR to the purchased tier, per ops); billing per camera per (retention, resolution) cell |
| 2026-07-05 | Two-track build order: core portal ships first (0-5, 7), camera cloud backup (6A/6B) starts after launch. Camera design stays fully specified in this plan; nothing in Track 1 depends on it |
| 2026-07-05 | R21: cloud backup plan management is admin-only (stakeholder override of handover 6.3 self-service): the service runs on McKee-managed hardware, so plan changes are operational events. Clients keep footage requests and Pay Now only |
| 2026-07-05 | R22: dual billing rails. `billing_method` per service (`stripe`/`manual`); manual payers get automated due reminders and an admin collections digest; payments recorded in append-only `manual_payments`. Admin Billing tab is the collections console |
