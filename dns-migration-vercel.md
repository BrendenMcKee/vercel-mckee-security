# DNS Migration: WordPress.com → Vercel (DNS + hosting)

> **Purpose:** Move `mckeesecurity.ca` from WordPress.com DNS and hosting to **Vercel DNS** and Vercel hosting, using a single vendor, without breaking Google Workspace email, Resend, or other sender authentication.

**Last updated:** 2026-06-21 (Phase 4 complete — site live on `mckeesecurity.ca`; Phase 5 post-cutover QA in progress)
**Related:** Vercel project root directory is `website/`. Repo: `BrendenMcKee/vercel-mckee-security`.

---

## Why Vercel DNS (and why not Cloudflare)

You can host DNS at Vercel and skip Cloudflare entirely. Trade-offs:

- **Simpler:** One vendor for site + DNS. Vercel auto-manages the website records and SSL. No second account, no proxy / "orange cloud" decisions.
- **Same email work either way:** The Google Workspace, Resend, and other sender records have to be recreated no matter who hosts DNS. That part is identical.
- **One real downside vs Cloudflare:** Vercel DNS does **not** auto-scan/import your existing records. You must inventory the current records first (Phase 2 step 1) so nothing is missed. Cloudflare would have imported them for you.
- **What you give up:** Cloudflare's free CDN, WAF, analytics, and page rules. You don't need these for this site today, and you can move DNS to Cloudflare later if you ever do.

**No registrar transfer.** Keep the registrar at HostPapa. We only change the **nameservers** at HostPapa to point at Vercel. This is reversible and avoids the multi-day transfer process.

---

## Current and Target Architecture

| Role | Current | Target |
|------|---------|--------|
| Registrar | HostPapa | HostPapa (no transfer) |
| DNS host | **Vercel DNS** ✅ | **Vercel DNS** |
| Website | **Vercel (Next.js)** ✅ | Vercel (Next.js) |
| Email | Google Workspace | Google Workspace (unchanged) |
| Transactional email | Resend (via `send` subdomain) | Resend (unchanged) |

**Primary goals:**

- Move DNS management to Vercel
- Launch the Vercel website on `mckeesecurity.ca` and `www.mckeesecurity.ca`
- Preserve Google Workspace email
- Preserve existing sender authentication records (Resend, Mailchimp, WP Cloud, Mailgun, mailo, DMARC)
- Avoid downtime where possible

---

## Phase 1: Vercel project + domains (before touching nameservers) — ✅ COMPLETE (2026-06-21)

1. ✅ Open the Vercel project → **Settings → Domains**.
2. ✅ Add both domains:
   - `mckeesecurity.ca`
   - `www.mckeesecurity.ca`
3. ✅ When prompted for a setup method, choose **Nameservers (Vercel DNS)** — not the A/CNAME method. Vercel will show two nameservers to use later, e.g.:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
   - **Use whatever Vercel displays for this project.**
4. ✅ **Primary domain = apex (`mckeesecurity.ca`).** Vercel may not show a separate “Set primary domain” button. You achieve this by:
   - **`mckeesecurity.ca`** → **Connect to Production** (serves the site; no redirect).
   - **`www.mckeesecurity.ca`** → click **Edit** → **Redirect to** `mckeesecurity.ca`. Choose **308 Permanent Redirect** (or **301** if offered — avoid **307 Temporary**). That makes apex canonical and matches `website/src/lib/site-config.ts`.
5. ✅ Confirm both domains show **Invalid Configuration / Pending Nameservers** on the **Vercel DNS** tab — that is normal until Phase 4. **Copy and save the two nameservers** Vercel shows (e.g. `ns1.vercel-dns.com`, `ns2.vercel-dns.com`) for HostPapa later.
6. ✅ Confirm **Root Directory** is `website`. In the current Vercel UI this is under **Settings → Build and Deployment** (not General). It was set when the GitHub repo was first connected. Quick sanity check: `vercel-mckee-security.vercel.app` should show the McKee Security site — if it does, root directory is already correct.
7. ✅ Production environment variables — **already configured in Vercel (verified 2026-06-21):**

   | Variable | Purpose | Status |
   |----------|---------|--------|
   | `RESEND_API_KEY` | Form email delivery | ✅ Set (Sensitive) |
   | `CONTACT_EMAIL` | Inbox for form submissions | ✅ Set |
   | `EMAIL_FROM` | From address (e.g. `McKee Security <noreply@mckeesecurity.ca>`) | ✅ Set |
   | `GOOGLE_PLACES_API_KEY` | Google reviews | ✅ Set (Sensitive) |
   | `GOOGLE_PLACE_ID` | Google reviews | ✅ Set |
   | `GOOGLE_REVIEW_URL` | Write-review link | ✅ Set |
   | `DATA_DROPS_PASSWORD` | Password gate for the Data Drops tool | ✅ Set |
   | `DATA_DROPS_AUTH_SECRET` | Salt for the Data Drops login cookie | ✅ Set (generated random hex) |
   | `GOOGLE_REVIEWS_URL` | Read-reviews link override | ✅ Set |

   > **EMAIL_FROM must use the Resend-verified domain.** It is already set, but before cutover confirm the From-address domain matches a **Verified** domain in Resend (DKIM `resend._domainkey` aligns with `mckeesecurity.ca`). The code default `onboarding@resend.dev` is only a dev placeholder.

   **Intentionally not set (no action needed):**

   | Variable | Why it's skipped |
   |----------|------------------|
   | `DATA_DROPS_API_URL` | The code already defaults to `https://app-mckeesecurity.ca/api`, which is correct. Only set it if that backend ever moves (use the new base URL, no trailing slash). |

   > `GOOGLE_REVIEW_URL` (singular, the **write-a-review** link) is also already set.

8. Expect both domains to show **Invalid Configuration / Pending Nameservers** until the nameservers are changed in Phase 4. That is normal.

---

## Phase 2: Build records in Vercel DNS (before cutover) — ✅ COMPLETE (2026-06-21)

> **Vercel does not import your existing records.** Inventory them first so nothing is lost.

1. ✅ **Capture the current zone.** In the WordPress.com DNS panel (and/or by querying live DNS), list every existing record: A, CNAME, MX, TXT, and any subdomains. Save a screenshot/export. Cross-check against the records below.
2. ✅ Add records in **Vercel’s DNS zone**. On the team **Domains** page, select **`mckeesecurity.ca`**, then open the **Vercel DNS** tab — **not** the **DNS Records** tab (that tab only lists the A/CNAME records your *current* provider would need; there is no Add button). On **Vercel DNS** you should see the nameservers plus an **Add** form (or **Enable Vercel DNS** first). Alternatives:
   - CLI: `vercel dns add mckeesecurity.ca …` / `vercel dns import mckeesecurity.ca zonefile.txt` — **all 17 records added via CLI 2026-06-21**
   
   Records can be added **before** nameserver cutover; verify with `dig MX mckeesecurity.ca @ns1.vercel-dns.com +short`.
3. ✅ Add the records in the tables below.
4. ✅ The **website records (apex A + `www`) are created and managed automatically by Vercel** once the domain is attached and nameservers point to Vercel. You do **not** add these manually.

### Google Workspace MX (critical)

| Type | Name | Mail server | Priority |
|------|------|-------------|----------|
| MX | `@` | `aspmx.l.google.com` | 1 |
| MX | `@` | `alt1.aspmx.l.google.com` | 5 |
| MX | `@` | `alt2.aspmx.l.google.com` | 5 |
| MX | `@` | `alt3.aspmx.l.google.com` | 10 |
| MX | `@` | `alt4.aspmx.l.google.com` | 10 |

Do not delete or modify unless Google Workspace admin requires a newer configuration.

### Google Workspace DKIM — ✅ ADDED (2026-06-21)

TXT record `google._domainkey` added to Vercel DNS via CLI. **Google Admin → Start authentication** must be clicked **after** public DNS propagates to Vercel (Google queries live DNS, not Vercel’s staging NS alone).

| Type | Name | Content |
|------|------|---------|
| TXT | `google._domainkey` | `v=DKIM1; k=rsa; p=MIIBIjAN…` (2048-bit, generated in Google Admin) |

How to finish authentication:

1. Google Admin console → **Apps → Google Workspace → Gmail → Authenticate email**.
2. Select the domain `mckeesecurity.ca`.
3. After NS propagation (see Phase 4), click **Start authentication** again. Ignore the “48 hours” message if propagation just started — retry once `nslookup -type=ns mckeesecurity.ca` shows Vercel nameservers.

### Resend / SES on `send` subdomain

| Type | Name | Content | Priority |
|------|------|---------|----------|
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCTp2vL4I0mP8YW/Y8qU++ug3p4bqXXciDLJV2WlvwAUhiNYF3CSj5i86T+dZtfMyI5Nt3yN1XEochHmx0vwhyiucA+kRSnwfMGlAM15OJ1xexvwq7cAE/s9qiAU0RPZOgHBxjXLols5jI+pSx/s4HSVOh+aFUU1tIttIjxuvkkjwIDAQAB` | |

After cutover, re-check Resend domain verification and sending status inside Resend.

### Mailchimp DKIM

| Type | Name | Target |
|------|------|--------|
| CNAME | `k2._domainkey` | `dkim2.mcsv.net` |
| CNAME | `k3._domainkey` | `dkim3.mcsv.net` |

### WP Cloud DKIM (keep for now)

Remove only after confirming WordPress/WP Cloud no longer sends mail for this domain.

| Type | Name | Target |
|------|------|--------|
| CNAME | `wpcloud1._domainkey` | `wpcloud1._domainkey.wpcloud.com` |
| CNAME | `wpcloud2._domainkey` | `wpcloud2._domainkey.wpcloud.com` |

### Mailgun (keep unless confirmed obsolete)

| Type | Name | Target |
|------|------|--------|
| CNAME | `email` | `mailgun.org` |

### mailo DKIM (keep unless confirmed obsolete)

| Type | Name | Content |
|------|------|---------|
| TXT | `mailo._domainkey` | `k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCyeMioUFY+A1KYj+gGQ5kP8BVDsXxmdvJhFjG1DNTF9eY05FeVbuhBHYpSJfnH5OOk5HYlbCq43SGHIODgV097miEw/gIGGe2oFrpApN9ynV9++8xOPck+du7USjURlRb8h7utzrIeG6iMrEpHloq/OTaaqbH3R++lIOTPEzIfkwIDAQAB` |

### DMARC (with aggregate reporting)

| Type | Name | Content |
|------|------|---------|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:web@mckeesecurity.ca; fo=1` |

**Why this exact record:**

- `p=none` — monitor only. No mail is quarantined or rejected during migration, so a misconfigured sender can't cause lost email.
- `rua=mailto:web@mckeesecurity.ca` — daily **aggregate reports** so you can see every source sending as your domain and whether SPF/DKIM align. This is what tells you when it's safe to tighten the policy. The address is on your own domain, so **no external-authorization record is needed**.
- `fo=1` — request a failure signal whenever SPF or DKIM fails, for richer reporting.

**Reporting mailbox:**

- Reports go to `web@mckeesecurity.ca`, which already exists and handles website matters — no new mailbox needed.
- Reports arrive as XML attachments. They are hard to read raw, so optionally point `rua` at a **free DMARC analyzer** instead (e.g. Postmark DMARC, dmarcian, or Valimail) and use that service's provided `mailto:` address. This is the most production-grade option and turns the XML into a readable dashboard.

**Ramp-up path (do NOT do during migration — see Phase 6):** once aggregate reports confirm Google Workspace and Resend consistently pass SPF + DKIM alignment, tighten in stages: `p=none` → `p=quarantine; pct=25` → increase `pct` to 100 → `p=reject`. Move one step at a time and watch reports between steps.

### Root SPF (one TXT record at `@` only)

**Current (WP Cloud only):**

```
v=spf1 include:_spf.wpcloud.com ~all
```

**Recommended during migration** (after confirming Google Workspace sends from this domain):

```
v=spf1 include:_spf.google.com include:_spf.wpcloud.com ~all
```

**After WordPress/WP Cloud no longer sends mail:**

```
v=spf1 include:_spf.google.com ~all
```

Rules:

- Do **not** create multiple SPF TXT records at `@`. There must be exactly one.
- Do **not** add Resend's `amazonses.com` include to root SPF. Resend uses the `send` subdomain; keep its SPF on `send.mckeesecurity.ca`.

### SSL / CAA — automatic, no extra Vercel config

Vercel issues and renews SSL (Let’s Encrypt) **automatically** once both custom domains show **Valid Configuration** in the dashboard. No SSL toggle or certificate upload is required.

**How to confirm SSL after propagation:**

1. Vercel → project **Domains** → both `mckeesecurity.ca` and `www.mckeesecurity.ca` show **Valid** (not Invalid Configuration).
2. Visit `https://mckeesecurity.ca` and `https://www.mckeesecurity.ca` — padlock icon, no certificate warnings.
3. Optional CLI check: `curl -I https://mckeesecurity.ca` should return `HTTP/2 200` (or `308` for www → apex).

Default Vercel CAA records already include `letsencrypt.org`. Do not add a restrictive CAA record. If you add one manually, it must authorize Vercel’s CA:

```
@  CAA  0 issue "letsencrypt.org"
```

If no CAA record exists, do nothing — any CA is allowed by default, which is what we want.

### Records to NOT recreate

| Record | Action |
|--------|--------|
| WordPress `@` A "Handled by WordPress.com" | **Do not recreate** — Vercel manages the apex |
| WordPress `NS @ Handled by WordPress.com` | **Do not recreate** |
| Old `www` CNAME → `mckeesecurity.ca` | **Do not recreate** — Vercel manages `www` |
| Wildcard `*` CNAME → `mckeesecurity.ca` | **Do not recreate** unless actively needed |
| `_domainconnect` (WordPress) | Not needed once Vercel is authoritative |

> **Data Drops backend is out of scope.** The Data Drops tool talks to `app-mckeesecurity.ca` (a separate domain, not a subdomain of `mckeesecurity.ca`). It has its own DNS zone and is **not** affected by this nameserver change. Just confirm the tool still works post-cutover (Phase 5).

---

## Phase 3: Pre-cutover verification (still on WordPress nameservers) — ✅ COMPLETE (2026-06-21)

Before changing nameservers at HostPapa:

- [x] Current WordPress.com records inventoried and saved
- [x] Vercel DNS contains all required email/auth records above (17 custom records + Vercel defaults)
- [x] Exactly one SPF TXT record at `@`
- [x] No restrictive CAA record (Vercel defaults include `letsencrypt.org`)
- [x] Both domains attached to the Vercel project, primary = apex; www → apex 308 redirect
- [x] `EMAIL_FROM` domain confirmed **Verified** in Resend (mckeesecurity.ca verified 2026-06-21; DKIM + SPF on `send` both green)
- [x] DMARC `rua` mailbox (`web@mckeesecurity.ca`) already exists and is monitored
- [x] Vercel DNS zone verified via CLI against `ns1.vercel-dns.com`
- [ ] Optional: lower TTLs on critical records 24 hours ahead (skipped — not required)

---

## Phase 4: Nameserver cutover at HostPapa — ✅ COMPLETE (2026-06-21)

1. ✅ In Vercel → **Settings → Domains**, copy the two assigned nameservers (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`).
2. ✅ Log into **HostPapa** → domain management for `mckeesecurity.ca`.
3. ✅ Replace the WordPress.com nameservers with Vercel's two nameservers. HostPapa confirmed: “Name Server information successfully updated.”
4. ✅ **Do not transfer the registrar.**
5. ✅ **Propagation complete** — Vercel shows both domains as **Valid Configuration**; `https://mckeesecurity.ca` serves the new Next.js site.

**Confirmed 2026-06-21:**

- Vercel Domains: `mckeesecurity.ca` (Production), `www.mckeesecurity.ca` (308 → apex), both **Valid Configuration**
- Public site loads the Vercel build (not WordPress)
- SSL active (padlock on apex)

During propagation, some users may still hit WordPress briefly. That is normal and should be over now.

---

## Phase 5: Post-cutover testing — ⏳ IN PROGRESS (2026-06-21)

### Website

- [x] `https://mckeesecurity.ca` loads the Vercel site
- [x] `https://www.mckeesecurity.ca` loads or redirects correctly (308 → apex)
- [x] HTTP redirects to HTTPS
- [x] `www` / non-`www` canonical behavior is correct (apex primary)
- [x] Vercel Domains shows both domains as **Valid**
- [x] SSL padlock valid on apex and `www`
- [ ] Contact form submits and email arrives
- [ ] Service inquiry forms work (security, cameras, etc.)
- [ ] Job application form works (including resume upload if used)
- [ ] Course pages load
- [ ] Google reviews section loads live data
- [ ] Data Drops tools unlock and load (`/data-drops-mckeesecurity`, `/data-drops-hhhs`)
- [ ] Embedded scripts, analytics, and pixels still work
- [ ] Social link preview shows OG image (Discord / Facebook — may need cache refresh after deploy)

### Email

- [ ] Inbound mail to `@mckeesecurity.ca` Google Workspace inboxes
- [ ] Outbound from Google Workspace to Gmail, Outlook, and another external address
- [ ] No bouncebacks on routine mail
- [ ] Resend domain still **Verified** in Resend dashboard
- [ ] Send a test Resend form email
- [ ] Check SPF, DKIM, and DMARC alignment for Google Workspace and Resend mail
- [ ] (If set up) Google Workspace DKIM (`google._domainkey`) shows authenticating in Google Admin — **record is in Vercel DNS; click Start authentication in Google Admin now that NS have propagated**

### DNS verification commands

Run from a terminal after cutover:

```powershell
nslookup -type=ns mckeesecurity.ca
nslookup -type=mx mckeesecurity.ca
nslookup -type=txt mckeesecurity.ca
nslookup -type=txt _dmarc.mckeesecurity.ca
nslookup -type=txt send.mckeesecurity.ca
nslookup mckeesecurity.ca
nslookup www.mckeesecurity.ca
```

Expected:

- NS resolves to Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`)
- MX resolves to Google
- One SPF TXT at `@` (Google + WP Cloud during transition)
- DMARC TXT at `_dmarc` with `p=none` and the `rua` address
- Resend records on `send` subdomain
- Apex and `www` resolve to Vercel targets
- A first DMARC aggregate report should arrive within ~24–48 hours

---

## Phase 6: Do not cancel WordPress until

- [ ] Vercel website is live on root domain and `www`
- [ ] Vercel DNS is active and stable for 24–48 hours
- [ ] Google Workspace email confirmed working inbound and outbound
- [ ] Resend confirmed working
- [ ] Old WordPress forms, email-sending features, and domain-connected features are no longer required
- [ ] All needed DNS records recreated in Vercel DNS
- [ ] Any required exports/backups from WordPress are complete

### Post-WordPress cleanup (later)

After WordPress is cancelled and WP Cloud no longer sends mail:

- [ ] Remove `wpcloud1._domainkey` and `wpcloud2._domainkey` CNAME records
- [ ] Remove `include:_spf.wpcloud.com` from root SPF
- [ ] Re-verify Resend and Google Workspace sending
- [ ] Review DMARC aggregate (`rua`) reports — confirm Google Workspace and Resend pass SPF + DKIM alignment with no unexpected senders
- [ ] Only then ramp DMARC enforcement one step at a time: `p=none` → `p=quarantine; pct=25` → `pct=100` → `p=reject`, watching reports between each step

---

## Quick execution order

1. ✅ Add both domains in Vercel → choose **Nameservers (Vercel DNS)** → note the Vercel nameservers
2. ✅ Inventory current WordPress.com DNS records
3. ✅ Recreate all email/auth records in Vercel DNS (single SPF at `@`, incl. `google._domainkey`)
4. ✅ Verify records and Resend `EMAIL_FROM` domain
5. ✅ Switch nameservers at HostPapa to Vercel
6. ✅ Wait for Vercel to show domains **Valid**
7. ⏳ Run post-cutover tests (website, email, DNS) — site live; forms/email/DKIM still to verify
8. ⏳ Keep WordPress running until all checks pass
9. ⏳ Clean up WP-only DNS and SPF later

---

## Default Vercel URL (`vercel-mckee-security.vercel.app`)

**Leave it enabled.** Every Vercel project gets a `*.vercel.app` URL. It does not conflict with the custom domain, does not hurt SEO (your site uses `mckeesecurity.ca` as canonical in code), and is useful for smoke-testing deploys before DNS changes propagate. No action required unless you explicitly want to remove it from the project Domains list (not recommended).

---

## Pre-cutover checklist (website project)

- [x] Pre-cutover integration work complete
- [x] Production env vars set in Vercel (9 confirmed 2026-06-21, incl. `DATA_DROPS_AUTH_SECRET` + `GOOGLE_REVIEWS_URL`)
- [x] Phase 1–4 complete; site live on custom domain (2026-06-21)
- [x] Performance pass complete — see [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) (scroll, CLS, AVIF, image policy)
- [ ] Production QA on custom domain (Phase 5 — forms, email, Data Drops, Google DKIM auth)

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) | Scroll performance, image delivery, `images.qualities` rules, OG image |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Monorepo deploy workflow (Vercel + AWS) |
| [`docs/DATA-DROPS.md`](docs/DATA-DROPS.md) | Data Drops password gate and backend |

---

*Update this document if DNS values or senders change.*
