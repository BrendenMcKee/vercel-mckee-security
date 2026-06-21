# DNS Migration: WordPress.com → Vercel (DNS + hosting)

> **Purpose:** Move `mckeesecurity.ca` from WordPress.com DNS and hosting to **Vercel DNS** and Vercel hosting, using a single vendor, without breaking Google Workspace email, Resend, or other sender authentication.

**Last updated:** 2026-06-21
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
| DNS host | WordPress.com nameservers | **Vercel DNS** |
| Website | WordPress.com | Vercel (Next.js) |
| Email | Google Workspace | Google Workspace (unchanged) |
| Transactional email | Resend (via `send` subdomain) | Resend (unchanged) |

**Primary goals:**

- Move DNS management to Vercel
- Launch the Vercel website on `mckeesecurity.ca` and `www.mckeesecurity.ca`
- Preserve Google Workspace email
- Preserve existing sender authentication records (Resend, Mailchimp, WP Cloud, Mailgun, mailo, DMARC)
- Avoid downtime where possible

---

## Phase 1: Vercel project + domains (before touching nameservers)

1. Open the Vercel project → **Settings → Domains**.
2. Add both domains:
   - `mckeesecurity.ca`
   - `www.mckeesecurity.ca`
3. When prompted for a setup method, choose **Nameservers (Vercel DNS)** — not the A/CNAME method. Vercel will show two nameservers to use later, e.g.:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
   - **Use whatever Vercel displays for this project.**
4. Set **primary domain** to `mckeesecurity.ca` (matches `website/src/lib/site-config.ts` canonical URL).
5. Configure Vercel to redirect `www` → apex (or the reverse if you deliberately choose otherwise).
6. Confirm **Root Directory** is `website`.
7. Production environment variables — **already configured in Vercel (verified 2026-06-21):**

   | Variable | Purpose | Status |
   |----------|---------|--------|
   | `RESEND_API_KEY` | Form email delivery | ✅ Set (Sensitive) |
   | `CONTACT_EMAIL` | Inbox for form submissions | ✅ Set |
   | `EMAIL_FROM` | From address (e.g. `McKee Security <noreply@mckeesecurity.ca>`) | ✅ Set |
   | `GOOGLE_PLACES_API_KEY` | Google reviews | ✅ Set (Sensitive) |
   | `GOOGLE_PLACE_ID` | Google reviews | ✅ Set |
   | `GOOGLE_REVIEW_URL` | Write-review link | ✅ Set |
   | `DATA_DROPS_PASSWORD` | Password gate for the Data Drops tool | ✅ Set |

   > **EMAIL_FROM must use the Resend-verified domain.** It is already set, but before cutover confirm the From-address domain matches a **Verified** domain in Resend (DKIM `resend._domainkey` aligns with `mckeesecurity.ca`). The code default `onboarding@resend.dev` is only a dev placeholder.

   **Optional (supported) variables — add now in Phase 1 if you want them.** The site works without all three (the code has safe fallbacks), so these are quality/hardening extras, not migration blockers. To add any of them: Vercel → **Settings → Environment Variables → Add** → set scope to **Production** (and **Preview** if you want it on preview deploys) → paste the value → redeploy.

   | Variable | What it does | Exact value to use / where to find it |
   |----------|--------------|----------------------------------------|
   | `DATA_DROPS_AUTH_SECRET` | Extra salt mixed into the Data Drops login cookie so the session token isn't derived from the password alone. Recommended. | A random string **you generate**. Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (or `openssl rand -hex 32`) and paste the output. Any 32+ char random hex is fine. Note: adding/changing it logs out current Data Drops sessions (they just re-enter the password). |
   | `GOOGLE_REVIEWS_URL` | Overrides the **read-reviews** link. The default builds a Google search URL that usually works; set this only if you want the link to point somewhere exact. | Open your Google Business listing (search "McKee Security Audio Systems Haliburton"), click the **"47 Google reviews"** count to open the reviews panel, then copy the full URL from the browser address bar and paste it here. |
   | `DATA_DROPS_API_URL` | Base URL of the Data Drops AWS backend. | Leave **unset** — the code already defaults to `https://app-mckeesecurity.ca/api`, which is correct. Only set it if that backend ever moves, using the new base URL (no trailing slash). |

   > `GOOGLE_REVIEW_URL` (singular, the **write-a-review** link) is already set, so you don't need to touch it.

8. Expect both domains to show **Invalid Configuration / Pending Nameservers** until the nameservers are changed in Phase 4. That is normal.

---

## Phase 2: Build records in Vercel DNS (before cutover)

> **Vercel does not import your existing records.** Inventory them first so nothing is lost.

1. **Capture the current zone.** In the WordPress.com DNS panel (and/or by querying live DNS), list every existing record: A, CNAME, MX, TXT, and any subdomains. Save a screenshot/export. Cross-check against the records below.
2. In Vercel → **Settings → Domains → `mckeesecurity.ca` → DNS Records** (or `vercel dns` CLI), add the records in the tables below.
3. The **website records (apex A + `www`) are created and managed automatically by Vercel** once the domain is attached and nameservers point to Vercel. You do **not** add these manually.

### Google Workspace MX (critical)

| Type | Name | Mail server | Priority |
|------|------|-------------|----------|
| MX | `@` | `aspmx.l.google.com` | 1 |
| MX | `@` | `alt1.aspmx.l.google.com` | 5 |
| MX | `@` | `alt2.aspmx.l.google.com` | 5 |
| MX | `@` | `alt3.aspmx.l.google.com` | 10 |
| MX | `@` | `alt4.aspmx.l.google.com` | 10 |

Do not delete or modify unless Google Workspace admin requires a newer configuration.

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
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@mckeesecurity.ca; fo=1` |

**Why this exact record:**

- `p=none` — monitor only. No mail is quarantined or rejected during migration, so a misconfigured sender can't cause lost email.
- `rua=mailto:dmarc@mckeesecurity.ca` — daily **aggregate reports** so you can see every source sending as your domain and whether SPF/DKIM align. This is what tells you when it's safe to tighten the policy. The address is on your own domain, so **no external-authorization record is needed**.
- `fo=1` — request a failure signal whenever SPF or DKIM fails, for richer reporting.

**Set up the reporting mailbox first:**

- Create `dmarc@mckeesecurity.ca` in Google Workspace as a **group or alias** that routes to a monitored inbox (e.g. forward to `brenden@` / `info@`). It does not need to be a full paid mailbox — an alias/group is fine.
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

### SSL / CAA

Vercel issues and renews SSL automatically once the domain resolves to it. **Do not add a restrictive CAA record.** If you add a CAA record at all, it must authorize Vercel's CA:

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

## Phase 3: Pre-cutover verification (still on WordPress nameservers)

Before changing nameservers at HostPapa:

- [ ] Current WordPress.com records inventoried and saved
- [ ] Vercel DNS contains all required email/auth records above
- [ ] Exactly one SPF TXT record at `@`
- [ ] No restrictive CAA record (or one that includes `letsencrypt.org`)
- [ ] Both domains attached to the Vercel project, primary = apex
- [ ] `EMAIL_FROM` domain confirmed **Verified** in Resend
- [ ] DMARC `rua` mailbox/group (`dmarc@mckeesecurity.ca`) created and routing to a monitored inbox (or analyzer)
- [ ] Screenshot/export the Vercel DNS table for reference
- [ ] Optional: lower TTLs on critical records 24 hours ahead

---

## Phase 4: Nameserver cutover at HostPapa

1. In Vercel → **Settings → Domains**, copy the two assigned nameservers (e.g. `ns1.vercel-dns.com`, `ns2.vercel-dns.com`).
2. Log into **HostPapa** → domain management for `mckeesecurity.ca`.
3. Replace the WordPress.com nameservers with Vercel's two nameservers.
4. **Do not transfer the registrar.**
5. Wait for Vercel to show the domains as **Valid** and the nameservers as active (usually minutes to a few hours).

During propagation, some users may still hit WordPress briefly. That is normal.

---

## Phase 5: Post-cutover testing

### Website

- [ ] `https://mckeesecurity.ca` loads the Vercel site
- [ ] `https://www.mckeesecurity.ca` loads or redirects correctly
- [ ] HTTP redirects to HTTPS
- [ ] `www` / non-`www` canonical behavior is correct
- [ ] Vercel Domains shows both domains as **Valid**
- [ ] SSL padlock valid on apex and `www`
- [ ] Contact form submits and email arrives
- [ ] Service inquiry forms work (security, cameras, etc.)
- [ ] Job application form works (including resume upload if used)
- [ ] Course pages load
- [ ] Google reviews section loads live data
- [ ] Data Drops tools unlock and load (`/data-drops-mckeesecurity`, `/data-drops-hhhs`)
- [ ] Embedded scripts, analytics, and pixels still work

### Email

- [ ] Inbound mail to `@mckeesecurity.ca` Google Workspace inboxes
- [ ] Outbound from Google Workspace to Gmail, Outlook, and another external address
- [ ] No bouncebacks on routine mail
- [ ] Resend domain still **Verified** in Resend dashboard
- [ ] Send a test Resend form email
- [ ] Check SPF, DKIM, and DMARC alignment for Google Workspace and Resend mail

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

1. Add both domains in Vercel → choose **Nameservers (Vercel DNS)** → note the Vercel nameservers
2. Inventory current WordPress.com DNS records
3. Recreate all email/auth records in Vercel DNS (single SPF at `@`)
4. Verify records and Resend `EMAIL_FROM` domain
5. Switch nameservers at HostPapa to Vercel
6. Wait for Vercel to show domains **Valid**
7. Run post-cutover tests (website, email, DNS)
8. Keep WordPress running until all checks pass
9. Clean up WP-only DNS and SPF later

---

## Pre-cutover checklist (website project)

- [ ] Pre-cutover integration work complete (see project notes)
- [x] Production env vars set in Vercel (7 confirmed 2026-06-21)
- [ ] Production QA on preview URL complete
- [ ] This runbook reviewed against the live Vercel DNS zone before nameserver change

---

*Update this document if DNS values or senders change.*
