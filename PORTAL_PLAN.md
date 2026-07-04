# McKee Security Customer Portal: Implementation Plan

> **Single source of truth for building the portal in this repo.** Read this before each portal work session so context never drifts.
>
> **Requirements source of truth:** [`PRODUCT_HANDOVER.md`](./PRODUCT_HANDOVER.md) defines *what* the portal must do and *why* (business rules, roles, workflows). This document defines *how* it gets built in this repository: exact routes, files, schema, RLS policies, flows, phases, and checkpoints. If the two conflict on a business rule, the handover wins. If they conflict on implementation detail, this plan wins because it is verified against the actual codebase and live infrastructure.

**Product:** Client and admin portal built natively into the live `mckeesecurity.ca` Next.js site.
**Scope:** Handover Sections 1 to 22 (core portal, Phases 0 to 7). QuickBooks plumbing (Scope B) and the accounting agent (Scope C) are deferred; the only obligation toward them is clean Stripe event and customer record-keeping (Section 8 of this plan).

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

### 1.4 AWS account audit (verified via CLI, 2026-07-04)

| Fact | Implication |
|------|-------------|
| EB application `nvr-backup` (ca-central-1) is running a t3.micro but has **zero application versions deployed**: it serves the stock EB Node.js sample app. Only config: `EMAIL_USER=mckee.cloud.storage@gmail.com` + `EMAIL_PASSWORD` (plaintext app password in EB env) | There is **no recoverable legacy NVR-backup code**. The camera cloud backup system is fully greenfield. The environment should be decommissioned (D10) and the Gmail app password rotated |
| `nvr-backup-app` (us-east-2) exists with no environments and no versions; `user-dashboard-cloud-storage` (ca-central-1) has no versions | Same conclusion: nothing to port |
| **No Glacier vaults and no footage S3 buckets exist** in ca-central-1 or us-east-2. Only EB deployment buckets exist | The handover's "AWS Arctic archive storage" is aspirational, not current. The storage layer (bucket, lifecycle, IAM) must be created in Phase 6A |
| `main-user-management` (t3.micro, Node 22, the legacy Cognito portal backend) and `user-management` (grey health, Node 20) are still running | Legacy prototype infrastructure the handover says not to extend. Candidates for decommission after portal launch (D10). Roughly $30/month currently spent across the three idle/legacy t3.micros |
| `nvr-backup` security group allows inbound 80/22 only; no FTP/RTSP ports were ever opened | Confirms no ingest pipeline was ever operational |
| Working CLI access: profile `eb-cli`, account 490004615514 | Sufficient for EB/S3/EC2 auditing today. Footage bucket + scoped IAM will need broader admin action (D5) |

### 1.5 Camera fleet and connectivity constraints (research verified, 2026-07)

| Fact | Implication |
|------|-------------|
| UNV/Uniview NVRs support FTP upload of **snapshots only** (D1-resolution stills, scheduled or event-triggered). No native continuous video push to FTP/cloud. EZCloud is P2P viewing, not backup | The NVR alone cannot deliver the cloud backup product. An **on-site gateway** must capture and upload video (Section 9.2) |
| Many client sites are on **Starlink with CGNAT (double NAT)**: no public IP, no port forwarding, inbound connections impossible | Every site component must be **outbound-initiated**: HTTPS uploads to S3 and an outbound mesh VPN (Tailscale/WireGuard) for remote management both work through CGNAT |
| Starlink residential uplink is typically 5 to 20 Mbps and variable | Continuous main-stream upload (4 to 8 Mbps per camera) is infeasible for multi-camera sites. Upload sub-streams (1 to 2 Mbps) and/or event-triggered clips, with local store-and-forward buffering for outages (Section 9.2.4) |

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
| R16 | Camera ingestion platform | **No Elastic Beanstalk and no 24/7 ingest server.** On-site gateway devices upload directly to S3 over HTTPS (outbound-only, CGNAT-safe); Supabase holds sites/cameras/gateway metadata; Vercel API routes are the control plane (heartbeats, provisioning). Full rationale and rejected alternatives in Section 9.2.6 |

### Open (stakeholder or phase-gated)

| # | Decision | Needed by | Notes |
|---|----------|-----------|-------|
| D2 | Google OAuth client (Google Cloud Console) + provider secrets into Supabase dashboard | Phase 1 | Agent supplies exact redirect URI (`https://cxmydfhbclfwzboqibmo.supabase.co/auth/v1/callback`) and consent screen copy |
| D3 | Admin staff sign-in method | Phase 1 | Recommended: same Google + email/password as clients, role decides access |
| D4 | Stripe account, products/prices, webhook endpoint | Phase 5 | Agent supplies product/price definitions and required webhook events |
| D5 | AWS footage storage provisioning | Phase 6A | **Audit finding: no bucket, vault, or IAM exists yet; all greenfield.** Human approves: footage bucket creation (ca-central-1), lifecycle rules per tier (9.2.5), an admin-capable IAM path for the agent or console work, per-site upload credentials model (9.2.3). "Arctic" is implemented as S3 storage classes chosen per retention tier, not a separate product |
| D6 | Handover Section 18 business answers | Rolling | Blocking map: Q1/Q3 (tier features, monitoring paid in portal?) by Phase 3; Q7 (admin alert inbox) by Phase 2; Q16/Q9 (caller ID min/max, history in UI?) by Phase 4; Q2 (cloud tier pricing) by Phase 5; Q4/Q6 (retention on cancel, link expiry) by Phase 6. Q8 (camera list source) is resolved structurally: cameras are registered rows in the `cameras` table, populated at gateway provisioning (9.2.3) |
| D7 | Vercel plan cron limits | Phase 6/7 | If on Hobby (daily-only crons), nightly expiry works but the footage poller needs pg_cron or S3 event notifications. Verify plan at Phase 6B kickoff |
| D8 | Gateway site kit | Phase 6A | Hardware per site (recommendation: fanless mini PC or Raspberry Pi 5 with SSD buffer, wired to the camera VLAN), procurement, and install SOP for technicians. Pilot site selection (recommendation: one McKee-controlled site first, ideally behind Starlink to prove CGNAT behavior) |
| D9 | Per-site capture strategy | Phase 6A | Default recommendation: continuous **sub-stream** RTSP capture per camera (1 to 2 Mbps) + retain NVR local recording as the full-quality source. Alternatives per site: event-clip-only upload (motion windows) for very constrained links, or main-stream for small sites with good uplink. Confirm per-tier expectations with McKee ops |
| D10 | Legacy AWS decommission | Post-launch (flag now) | Terminate `nvr-backup` EB env (runs only the sample app), delete empty `nvr-backup-app` (us-east-2) and `user-dashboard-cloud-storage` apps, retire `main-user-management` + `user-management` once the portal replaces the legacy prototype. **Rotate the Gmail app password currently sitting in EB env config.** Human approval required; nothing is torn down during portal development |

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
    │           └── footage-poller/route.ts     # Phase 6B (if cron-based polling chosen)
    ├── components/portal/
    │   ├── sign-in.tsx                         # Google button + email/password form
    │   ├── activate-account.tsx                # Google / set-password chooser
    │   ├── dashboard/                          # client dashboard section components
    │   │   ├── monitoring-card.tsx
    │   │   ├── cloud-backup-card.tsx           # + change/cancel plan + footage request form
    │   │   ├── caller-id-card.tsx
    │   │   ├── devices-card.tsx
    │   │   └── payment-banner.tsx
    │   └── admin/                              # admin dashboard components
    │       ├── client-table.tsx
    │       ├── create-client-form.tsx
    │       ├── client-detail.tsx               # services, devices, caller IDs, invites per client
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
    │   │   ├── billing.ts                      # checkout session, plan change, cancel (Phase 5)
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
├── README.md                                   # technician provisioning SOP
├── agent/                                      # Node/TypeScript uploader service
│   ├── capture.ts                              # ffmpeg RTSP -> segmented mp4, per camera
│   ├── uploader.ts                             # store-and-forward queue -> S3 multipart upload
│   ├── heartbeat.ts                            # POST /api/gateway/heartbeat (status, disk, upload lag)
│   └── config.ts                               # per-site config: cameras, streams, bitrate caps
└── provision/                                  # bootstrap scripts: Tailscale, systemd units, IAM creds
```

Portal API addition for the gateway control plane (Phase 6A): `src/app/api/gateway/heartbeat/route.ts` (per-site secret auth, updates `gateways.last_seen_at` + metrics).

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
| `capture_mode` | text | `'substream'` / `'mainstream'` / `'events_only'` (D9), default `'substream'` |
| `active` | boolean | not null default true |

**`gateways`** (Phase 6A; one row per site device)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `site_id` | uuid | FK sites, not null, unique |
| `secret_hash` | text | not null (SHA-256 of per-gateway heartbeat secret) |
| `tailscale_name` | text | nullable (management address) |
| `last_seen_at` | timestamptz | nullable (heartbeat) |
| `metrics` | jsonb | nullable (disk free, upload lag, camera states from last heartbeat) |

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
| Cloud Backup | tier + status | Change Plan (Phase 5), Cancel Plan (Phase 5, confirm dialog), Request Footage (Phase 6B) | Handover 6.3 |
| Caller ID | contact list (phone + label) | add, remove, save (single save action commits the batch) | Validation: NANP format, no duplicates, cap (D6). Save triggers admin diff email |
| Device Maintenance | battery + smoke install dates, expiry state | none | Expired = amber/error highlight, not brand red (handover 14) |
| Payment banner | shown when any service `status='unpaid'` | Pay Now -> Stripe Checkout (Phase 5) | Tier server-validated, success/cancel return states |

Mobile: cards stack, 44px touch targets, no horizontal scroll (handover 14.2). Empty states for every section.

### 7.2 Admin dashboard `/admin-dashboard` (handover 7)

Layout pattern: follow `starlink-admin` component density. Tabs or sections:

| Area | Capabilities |
|------|--------------|
| Clients | table (name, email, status, services, invite state); create client form; client detail view |
| Client detail | modify tiers, cancel/restart services, add cloud backup manually, resend invite, view/edit devices, view caller IDs + change history |
| Alerts (Phase 7) | recent expiry alerts, failed emails |

All writes are server actions with `requireAdmin()`. Tier changes reflect immediately on the client dashboard (no caching of dashboard data: portal pages are dynamic).

---

## 8. Email System

Task 2.1 extends `src/lib/email.ts`: optional `to: string | string[]` and `cc` in the payload (default stays `CONTACT_EMAIL`). Portal templates live in `src/lib/portal/emails.ts` reusing the existing branded HTML shell.

| Template | Trigger | To | Phase |
|----------|---------|----|----|
| Account invitation | admin creates client / resend | client | 2 |
| Caller ID change alert | client saves list | admin inbox (`PORTAL_ADMIN_ALERT_EMAIL`, fallback `CONTACT_EMAIL`) | 4 |
| Device expiry alert | nightly cron detects newly expired | admin + client | 7 |
| Footage ready | poller marks ready | client | 6 |
| Footage failed | retrieval failure | client + admin | 6 |
| Payment success | Stripe webhook (optional per handover 12) | client | 5 |

Caller ID diff email: added contacts styled green, removed styled red (handover 6.4), plain-text fallback included. Email send failures are logged and surfaced in the admin alerts area (handover 22.3); a failed notification never rolls back the underlying save.

---

## 9. Integrations

### 9.1 Stripe (Phase 5)

- **Model:** one Stripe Product per service type, one recurring Price per tier (6 prices total; monitoring prices only if Q3 confirms in-portal monitoring payment). Price IDs live in a server-side map in `lib/portal/stripe.ts`, keyed by `(service_type, tier)`. Client code never sends price IDs.
- **Checkout:** server action verifies the caller owns the `services` row and reads the **admin-assigned tier from the database** (anti-spoofing, handover 9.3), creates a subscription-mode Checkout Session with `customer` (created/reused `stripe_customer_id`), `metadata: { profile_id, service_id, service_type, tier }`, success URL `/user-dashboard?payment=success`, cancel URL `/user-dashboard?payment=cancelled`.
- **Change Plan (cloud backup):** active subscription exists = server-side `subscriptions.update` swapping the price (proration default), after an explicit confirm dialog. No subscription = new Checkout. **Cancel Plan:** `cancel_at_period_end` (data retention policy per D6/Q4).
- **Webhook `/api/stripe/webhook`:** raw body via `await req.text()`, `stripe.webhooks.constructEvent` signature verification. Insert into `billing_events` first (PK conflict = already processed, return 200). Handle: `checkout.session.completed` (service -> `active`, store subscription id), `customer.subscription.updated` (tier/status sync), `customer.subscription.deleted` (-> `cancelled`), `invoice.payment_failed` (-> flag + optional admin email). All writes via service role.
- **Webhook is the source of truth** for payment state; the success redirect only drives UX (handover/discovery rule).

### 9.2 Camera cloud backup ingestion (Phase 6A)

The audit (1.4, 1.5) established three hard constraints: nothing exists in AWS yet, UNV NVRs cannot push continuous video natively, and Starlink CGNAT blocks all inbound connections. The design below satisfies all three.

#### 9.2.1 Architecture

```
Client site (possibly Starlink double NAT: outbound-only)
│
├── UNV cameras + NVR             # NVR keeps full-quality local recording (unchanged)
│         │ RTSP over camera VLAN (local, no internet needed)
│         v
├── McKee gateway device          # fanless mini PC / Pi 5 + SSD (D8)
│   ├── ffmpeg per camera         # sub-stream RTSP -> N-minute mp4 segments (D9)
│   ├── store-and-forward queue   # SSD buffer survives Starlink outages
│   ├── uploader                  # S3 multipart PUT over HTTPS (outbound 443 only)
│   ├── heartbeat                 # HTTPS POST to portal API every few minutes
│   └── Tailscale                 # outbound mesh VPN for remote management (CGNAT-safe)
│
└── (no inbound ports, no port forwarding, no public IP required)

AWS (ca-central-1)
├── S3 footage bucket             # sites/<site_id>/<camera_id>/<yyyy>/<mm>/<dd>/<hhmmss>.mp4
│   ├── lifecycle rules per tier  # 9.2.5
│   └── SSE-S3 encryption, versioning off, public access blocked
└── Per-site IAM credentials      # PutObject scoped to that site's prefix only (9.2.3)

Portal / cloud
├── Supabase: sites, cameras, gateways (schema 4.2)
├── /api/gateway/heartbeat        # gateway status -> admin visibility + offline alerting
└── Phase 6B retrieval reads the same bucket
```

Design rule: the **NVR remains the full-quality system of record on site**; the cloud copy is the backup/retention product (sub-stream by default), which is what the 7/30/90-day tiers actually sell. The gateway initiates every connection, so double NAT, CGNAT, and dynamic IPs are irrelevant.

#### 9.2.2 Gateway software (`camera-gateway/`)

- Node/TypeScript agent supervised by systemd; ffmpeg spawned per active camera (`rtsp_transport tcp`, `-c copy` remux to mp4 segments, default 5 minutes, no re-encode so CPU stays trivial).
- Store-and-forward: segments land on the SSD queue first; the uploader drains oldest-first with retry/backoff and a configurable bandwidth cap (protects the Starlink uplink). Disk watermark: oldest segments dropped if the buffer exceeds its cap during a long outage, with drops reported via heartbeat.
- Heartbeat every 5 minutes to `/api/gateway/heartbeat` (auth: per-gateway secret, hash in `gateways.secret_hash`): camera capture states, queue depth, disk free, last successful upload. Missing heartbeats > 30 minutes surface in the admin dashboard (email alerting joins Phase 7).
- Management: Tailscale (outbound WireGuard mesh) gives SSH access to gateways behind CGNAT; no client router changes ever required.
- Clock discipline: NTP required (segment timestamps drive retrieval matching).

#### 9.2.3 Provisioning and credentials (per site)

1. Admin registers site + cameras in the admin dashboard (writes `sites`, `cameras`, `gateways`, generates the gateway secret).
2. Technician images the gateway with `camera-gateway/provision/`, drops in the site config (site id, camera RTSP paths, secret, IAM credentials), connects it to the camera VLAN.
3. IAM: one credential per site allowing `s3:PutObject` (+ multipart helpers) **only under `sites/<site_id>/*`**. No read, no delete, no other prefixes: a stolen gateway cannot read any footage or touch other sites. Start with per-site IAM users; move to short-lived STS via a Vercel token-vending route if fleet size warrants (future hardening item).
4. Camera rows drive both gateway capture config and the client-facing footage request form (Q8 resolved).

#### 9.2.4 Bandwidth and cost model (defaults, tune at D9)

| Item | Working number |
|------|----------------|
| Sub-stream bitrate | 1 to 2 Mbps per camera (10.8 to 21.6 GB/day per camera) |
| 4-camera site uplink need | 4 to 8 Mbps sustained: below typical Starlink uplink, and capped by the uploader |
| S3 Standard storage | ~$0.025/GB-month (ca-central-1). Example: 4 cameras, 30-day tier, 1.5 Mbps is roughly 1.9 TB, ~$49/month raw storage |
| Cost levers | Lower sub-stream bitrate, `events_only` capture mode, Standard-IA for the 90-day tier tail |

These numbers feed tier pricing (D6/Q2) and must be validated in the pilot.

#### 9.2.5 Retention = S3 lifecycle rules (supersedes the handover's "Arctic" assumption)

The 7/30/90-day tiers are **rolling retention windows**, so objects are short-lived. Glacier-class storage carries minimum-duration charges (Instant Retrieval 90 days, Flexible 90, Deep Archive 180) that make it wrong for most of this data. Implementation:

| Tier | Lifecycle on `sites/<site_id>/` |
|------|--------------------------------|
| 7-day | expire objects after 7 days (S3 Standard throughout) |
| 30-day | expire after 30 days (Standard throughout) |
| 90-day | transition to Standard-IA at day 30 (30-day IA minimum fits), expire at day 90 |

Lifecycle configuration is updated when the admin assigns or changes a site's cloud tier. Consequence for Phase 6B: most retrievals are **instant** (presigned URLs, no restore wait). The Glacier restore path is kept in the design only for a possible future long-archive product. Same business outcome as the handover's "Arctic" language with correct storage economics; flag to stakeholder at D5.

#### 9.2.6 Platform decision record (R16)

| Option | Verdict | Why |
|--------|---------|-----|
| Gateway -> direct S3, Supabase metadata, Vercel control plane | **Chosen** | No 24/7 server, no inbound ports, cheapest (S3 plus pennies of API), per-site scaling, CGNAT-native |
| Rebuild on Elastic Beanstalk (legacy direction) | Rejected | Audit showed nothing was ever built there; a 24/7 ingest VM adds cost and a single point of failure with no benefit over direct-to-S3 |
| AWS Transfer Family (managed FTP/SFTP) | Rejected | ~$216/month idle endpoint; FTP only receives NVR snapshots anyway (1.5) |
| Kinesis Video Streams | Rejected for v1 | Per-GB ingest pricing, per-stream management, SDK complexity; overkill for segment backup |
| Third-party cloud adapter (e.g. Videoloft) | Rejected | Per-camera licensing, no ownership; conflicts with building McKee's own product |
| NVR-native upload only | Rejected | Snapshots only (1.5); cannot deliver the video backup product |

### 9.3 Footage retrieval (Phase 6B)

1. Client submits camera (a `cameras` row) + time range; `footage_requests` insert (`pending`); rate-limited.
2. Server lists matching segments under `sites/<site_id>/<camera_id>/` for the range (`ListObjectsV2`, timestamp-keyed names), stores keys in `s3_keys`, status -> `processing`.
3. Standard/IA objects (the normal case per 9.2.5): presign immediately. Single segment = one presigned GET; multi-segment = per-segment presigned links listed on the dashboard (server-side zip bundling is a later nicety). Status -> `ready`, email sent, typically within a minute.
4. Glacier-class objects (only if a future archive tier exists): `RestoreObject`, then completion per D7: (a) cron poller (`HeadObject` `x-amz-restore`), (b) S3 Event Notifications -> webhook route, or (c) lazy dashboard check + daily sweep.
5. Presigned TTL per D6/Q6 (default 72h; 7-day max with IAM user credentials). Cleanup cron marks `ready` past TTL as `expired`. Failures -> `failed` + reason + client and admin emails.

Vercel-side IAM (separate from gateway credentials): list + read + restore on the footage bucket, no write, no delete. Credentials only in Vercel env.

### 9.4 Scheduled jobs (Phase 7)

`vercel.json` crons, all routes check `Authorization: Bearer ${CRON_SECRET}`:

| Route | Schedule | Work |
|-------|----------|------|
| `/api/cron/device-expiry` | daily 06:00 UTC | expired devices where `expiry_alerted_at is null` -> email admin + client, stamp `expiry_alerted_at` (R14) |
| `/api/cron/cleanup` | daily | orphan auth users >7d, invitations expired >90d, footage links past TTL |
| `/api/cron/footage-poller` | hourly (if option (a) chosen and plan allows) | poll `processing` restores |

Fallback if Vercel plan is Hobby: `pg_cron` + Supabase Edge Function for the poller (R4).

---

## 10. Phase Plan

Each phase ends with a test gate; do not start the next phase with a failing gate. **[HUMAN]** marks stakeholder checkpoints (handover Section 21 model).

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
- [ ] Client dashboard: monitoring card (read-only), cloud backup card (display-only), welcome header, skeletons, empty states, error boundaries
- [ ] Admin: client detail with tier modify, cancel/restart, manual cloud-backup assign (all server actions, `requireAdmin()`)

**Gate:** admin tier change appears on client dashboard on next load; client session has no UI or action path that mutates `services` (verified by scripted RLS write attempt).

### Phase 4: Caller ID & Devices

- [ ] Migration 3: `caller_id_contacts`, `caller_id_changes`, `devices` (+ RLS)
- [ ] `phone.ts` normalization; caller ID card with add/remove/save; save action: transactional replace, diff compute, history insert, admin email (green/red diff)
- [ ] Devices card with expiry highlighting; admin device date editor (updates clear `expiry_alerted_at`)
- [ ] Admin caller ID viewer + history
- [ ] **[HUMAN]** D6/Q16+Q9 answered (cap, history in UI)

**Gate:** saving a change emails admin with the exact correct diff; duplicate phone rejected; invalid format rejected; device installed 2018 renders expired with amber/error styling; admin date update clears the expired state.

### Phase 5: Stripe & Billing

- [ ] **[HUMAN]** D4: Stripe account; products/prices per 9.1; webhook endpoint registered; keys in Vercel. D6/Q2 pricing confirmed
- [ ] Migration 4: `billing_events`; `profiles.stripe_customer_id`; `services.stripe_subscription_id`
- [ ] `stripe.ts` (SDK + price map); checkout server action with DB-side tier validation; webhook route (9.1); payment banner; change/cancel plan flows; success/cancel UX
- [ ] Payment success email (optional, per handover 12)

**Gate (Stripe test mode):** full checkout activates the service via webhook (not redirect); webhook replay is a no-op; tampered tier/price attempts are impossible via API surface; cancel sets `cancel_at_period_end`; plan change swaps price with proration.

### Phase 6A: Camera Cloud Backup Ingestion

- [ ] **[HUMAN]** D5: approve footage bucket creation + lifecycle rules (9.2.5) + IAM model (9.2.3); provide admin-capable AWS access for setup. D8: gateway hardware chosen and pilot site selected. D9: capture strategy defaults confirmed
- [ ] Create S3 bucket (ca-central-1): public access blocked, SSE-S3, lifecycle rules per tier
- [ ] Migration 5: `sites`, `cameras`, `gateways` (+ RLS incl. `rtsp_path` exclusion for clients)
- [ ] Admin dashboard: site + camera registration, gateway secret generation, gateway health view (last heartbeat, queue depth)
- [ ] `/api/gateway/heartbeat` route (per-gateway secret auth)
- [ ] Build `camera-gateway/` agent: capture (ffmpeg segmenting), store-and-forward uploader with bandwidth cap, heartbeat, provisioning scripts (Tailscale, systemd)
- [ ] Bench test: gateway + one UNV camera on the shop network uploading to S3
- [ ] **[HUMAN]** Pilot install at the selected site (ideally Starlink) by technician per `camera-gateway/README.md`

**Gate:** pilot site uploads continuously for 7 days through Starlink CGNAT with zero inbound ports; a forced 2-hour internet outage results in buffered segments uploading afterward with no gap; heartbeat outage alert appears in admin dashboard; per-site IAM credential verifiably cannot read or write outside its prefix; lifecycle rule observed expiring old objects (short-window test rule).

### Phase 6B: Footage Requests & Retrieval

- [ ] **[HUMAN]** D6/Q4+Q6 (retention on cancel, link TTL). D7: Vercel plan check (affects poller option only)
- [ ] Migration 6: `footage_requests` (+ RLS with camera-ownership check)
- [ ] `footage-retrieval.ts` (list, presign, restore path); request form in cloud backup card (cameras from DB); requests list with statuses; admin view of all requests
- [ ] Ready/failed emails; rate limiting on request creation

**Gate:** end-to-end on the pilot site: client requests a range -> presigned link email arrives -> footage plays -> link expires at TTL; request against a camera the client does not own is impossible (RLS + action check); forced failure notifies client + admin and marks `failed`.

### Phase 7: Automation, Hardening, Launch

- [ ] `vercel.json` crons + `CRON_SECRET`; device-expiry job (R14 semantics); cleanup job (6.6)
- [ ] Rate limiting on activation + footage endpoints (6.6)
- [ ] RLS penetration script: for every portal table x {anon, client A, client B, admin}, assert the 4.3 matrix; run against production before launch
- [ ] Security sweep: webhook signature tests, `get_advisors` clean, no service-role usage outside `admin.ts`/webhook/cron, secrets audit
- [ ] Full mobile UX pass; accessibility spot check (focus rings, labels, keyboard nav)
- [ ] Cross-browser smoke (Chrome, Firefox, Safari, iOS Safari, Android Chrome) per handover 22.4
- [ ] **[HUMAN]** stakeholder walkthrough (mobile + desktop) and production sign-off

**Gate:** handover Section 22 checklist fully satisfied; cron observed firing in preview; sign-off recorded in Progress Log.

---

## 11. Business Rule Traceability

| Handover rule | Enforced by |
|---------------|-------------|
| Admin-provisioned accounts, no open registration (4, 8) | No signup UI; activation requires valid token (6.3/6.4); orphan handling + cleanup (6.6); R9 |
| Client never changes monitoring tier/status (6.2, 9.1) | No UI controls; no client RLS write on `services` (4.3); tier changes only via admin actions + webhooks |
| Client pays only the admin-assigned tier (6.6, 9.3) | Checkout server action reads tier from DB; price map server-side only (9.1) |
| Cloud backup self-service: change, cancel, footage (6.3, 9.2) | Phase 5 plan flows + Phase 6B requests (9.3) |
| Caller ID changes alert admin with green/red diff (6.4, 12) | Save action diff + email (Section 8); history table |
| Device expiry 5yr battery / 10yr smoke, alerts to both parties (6.5, 11.9) | Computed expiry (4.2); nightly cron + `expiry_alerted_at` (9.4, R14) |
| Cloud retention tiers 7/30/90-day actually enforced (9.2 handover) | S3 lifecycle rules per site prefix (9.2.5) |
| Footage stored durably off-site and retrievable (6.3, 13) | Gateway ingestion pipeline (9.2), outbound-only through CGNAT (1.5); retrieval via presigned links (9.3) |
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
| 2026-07-04 | Retention tiers implemented as S3 lifecycle rules, not Glacier archive (minimum-duration economics, 9.2.5); Glacier restore path reserved for a future long-archive product |
