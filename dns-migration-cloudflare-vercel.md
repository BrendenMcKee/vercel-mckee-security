# DNS Migration: WordPress.com to Cloudflare + Vercel

> **Purpose:** Move `mckeesecurity.ca` from WordPress.com DNS and hosting to Cloudflare DNS and Vercel hosting without breaking Google Workspace email, Resend, or other sender authentication.

**Last updated:** 2026-06-21  
**Related:** Vercel project root directory is `website/`. Repo: `BrendenMcKee/vercel-mckee-security`.

---

## Current and Target Architecture

| Role | Current | Target |
|------|---------|--------|
| Registrar | HostPapa | HostPapa (no transfer yet) |
| DNS host | WordPress.com nameservers | Cloudflare |
| Website | WordPress.com | Vercel (Next.js) |
| Email | Google Workspace | Google Workspace (unchanged) |
| Transactional email | Resend (via `send` subdomain) | Resend (unchanged) |

**Primary goals:**

- Move DNS management to Cloudflare
- Launch the Vercel website on `mckeesecurity.ca` and `www.mckeesecurity.ca`
- Preserve Google Workspace email
- Preserve existing sender authentication records (Resend, Mailchimp, WP Cloud, Mailgun, DMARC)
- Avoid downtime where possible

**Do not transfer the domain registrar yet.** Only update nameservers at HostPapa after Cloudflare DNS records are fully prepared and verified.

---

## Phase 1: Vercel (before touching nameservers)

1. Open the Vercel project → **Settings → Domains**.
2. Add both domains:
   - `mckeesecurity.ca`
   - `www.mckeesecurity.ca`
3. Copy the **exact** DNS values Vercel shows. Do not assume defaults.
   - Apex/root is often an **A** record to `76.76.21.21`
   - `www` is often a **CNAME** to `cname.vercel-dns.com`
   - **Use whatever Vercel displays for this project.**
4. Set **primary domain** to `mckeesecurity.ca` (matches `website/src/lib/site-config.ts` canonical URL).
5. Configure Vercel to redirect `www` → apex (or the reverse if you deliberately choose otherwise).
6. Confirm **Root Directory** is `website`.
7. Production environment variables.

   **Already configured in Vercel (verified 2026-06-21):**

   | Variable | Purpose | Status |
   |----------|---------|--------|
   | `RESEND_API_KEY` | Form email delivery | ✅ Set (Sensitive) |
   | `CONTACT_EMAIL` | Inbox for form submissions | ✅ Set |
   | `EMAIL_FROM` | From address (e.g. `McKee Security <noreply@mckeesecurity.ca>`) | ✅ Set |
   | `GOOGLE_PLACES_API_KEY` | Google reviews | ✅ Set (Sensitive) |
   | `GOOGLE_PLACE_ID` | Google reviews | ✅ Set |
   | `GOOGLE_REVIEW_URL` | Override for write-review link | ✅ Set |
   | `DATA_DROPS_PASSWORD` | Password gate for the Data Drops tool | ✅ Set |

   **Optional / not currently set (only add if needed):**

   | Variable | Purpose | Recommendation |
   |----------|---------|----------------|
   | `GOOGLE_REVIEWS_URL` | Override for the read-reviews link | Optional — code falls back gracefully |
   | `DATA_DROPS_AUTH_SECRET` | Extra salt for the Data Drops unlock cookie | Recommended — add a random string to harden session tokens |
   | `DATA_DROPS_API_URL` | Data Drops AWS backend base URL | Only set if it differs from the default `https://app-mckeesecurity.ca/api` |

   > **EMAIL_FROM must use the Resend-verified domain.** It is already set, but before cutover confirm the From address domain matches a **Verified** domain in Resend (DKIM `resend._domainkey` aligns with `mckeesecurity.ca`). The code default `onboarding@resend.dev` is only a dev placeholder — production must send from `mckeesecurity.ca`.

8. Expect domains to show **Invalid Configuration** until Cloudflare records exist. That is normal.

9. If Vercel prompts for a `_vercel` **TXT verification record** (happens when a domain was previously attached to another Vercel project/account), note the value now — you will add it as a TXT record in Cloudflare during Phase 2.

---

## Phase 2: Cloudflare zone (build before cutover)

1. Add `mckeesecurity.ca` to Cloudflare.
2. Let Cloudflare scan/import DNS records from WordPress.com.
3. **Do not trust the scan blindly.** Manually recreate and verify every required record below.
4. Delete WordPress-only website records (see "Records to remove").

### Website records (DNS only, gray cloud)

| Type | Name | Content | Notes |
|------|------|---------|-------|
| A | `@` | Vercel apex IP from dashboard | Replace WordPress `@` A record |
| CNAME | `www` | Vercel target from dashboard | Replace old `www` → `mckeesecurity.ca` CNAME |

Do **not** keep the WordPress.com "A @ Handled by WordPress.com" record. Replace it with the actual Vercel A record.

For initial launch, set Vercel-related records to **DNS only**, not proxied, unless Vercel explicitly indicates otherwise.

### Google Workspace MX (DNS only, critical)

| Type | Name | Mail server | Priority |
|------|------|-------------|----------|
| MX | `@` | `aspmx.l.google.com` | 1 |
| MX | `@` | `alt1.aspmx.l.google.com` | 5 |
| MX | `@` | `alt2.aspmx.l.google.com` | 5 |
| MX | `@` | `alt3.aspmx.l.google.com` | 10 |
| MX | `@` | `alt4.aspmx.l.google.com` | 10 |

Do not delete or modify unless Google Workspace admin requires a newer configuration.

### Resend / SES on `send` subdomain (DNS only)

| Type | Name | Content | Priority |
|------|------|---------|----------|
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCTp2vL4I0mP8YW/Y8qU++ug3p4bqXXciDLJV2WlvwAUhiNYF3CSj5i86T+dZtfMyI5Nt3yN1XEochHmx0vwhyiucA+kRSnwfMGlAM15OJ1xexvwq7cAE/s9qiAU0RPZOgHBxjXLols5jI+pSx/s4HSVOh+aFUU1tIttIjxuvkkjwIDAQAB` | |

After Cloudflare is active, re-check Resend domain verification and sending status inside Resend.

### Mailchimp DKIM (DNS only)

| Type | Name | Target |
|------|------|--------|
| CNAME | `k2._domainkey` | `dkim2.mcsv.net` |
| CNAME | `k3._domainkey` | `dkim3.mcsv.net` |

### WP Cloud DKIM (keep for now, DNS only)

Remove only after confirming WordPress/WP Cloud no longer sends mail for this domain.

| Type | Name | Target |
|------|------|--------|
| CNAME | `wpcloud1._domainkey` | `wpcloud1._domainkey.wpcloud.com` |
| CNAME | `wpcloud2._domainkey` | `wpcloud2._domainkey.wpcloud.com` |

### Mailgun (keep unless confirmed obsolete, DNS only)

| Type | Name | Target |
|------|------|--------|
| CNAME | `email` | `mailgun.org` |

### mailo DKIM (keep unless confirmed obsolete, DNS only)

| Type | Name | Content |
|------|------|---------|
| TXT | `mailo._domainkey` | `k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCyeMioUFY+A1KYj+gGQ5kP8BVDsXxmdvJhFjG1DNTF9eY05FeVbuhBHYpSJfnH5OOk5HYlbCq43SGHIODgV097miEw/gIGGe2oFrpApN9ynV9++8xOPck+du7USjURlRb8h7utzrIeG6iMrEpHloq/OTaaqbH3R++lIOTPEzIfkwIDAQAB` |

### DMARC (DNS only)

| Type | Name | Content |
|------|------|---------|
| TXT | `_dmarc` | `v=DMARC1;p=none;` |

Leave DMARC at `p=none` during migration. Do not tighten to quarantine or reject until Vercel, Google Workspace, Resend, Mailchimp, and any other senders are confirmed authenticating properly.

### Root SPF (one TXT record at `@` only, DNS only)

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

### CAA records (check during scan, critical for SSL)

CAA records restrict which Certificate Authorities may issue certs for the domain. If a restrictive CAA record exists that does **not** authorize Vercel's CA, SSL issuance on Vercel will silently fail.

| Type | Name | Content | Action |
|------|------|---------|--------|
| CAA | `@` | (any existing) | **Either remove all CAA records, or ensure they include Let's Encrypt** |

Recommended if you keep CAA at all (Vercel issues via Let's Encrypt):

```
@  CAA  0 issue "letsencrypt.org"
```

If no CAA record exists, do nothing — any CA is allowed by default, which is fine.

### Vercel domain verification (only if Vercel asked for it)

| Type | Name | Content | Notes |
|------|------|---------|-------|
| TXT | `_vercel` | value shown in Vercel dashboard | Only needed if Vercel showed a verification challenge in Phase 1 step 9 |

### Optional records

| Type | Name | Content | Notes |
|------|------|---------|-------|
| TXT | `_domainconnect` | `public-api.wordpress.com/rest/v1.3/domain-connect` | Not critical once Cloudflare is authoritative |

> **Data Drops backend is out of scope.** The Data Drops tool talks to `app-mckeesecurity.ca` (a separate domain, not a subdomain of `mckeesecurity.ca`). It has its own DNS zone and is **not** affected by this nameserver change. No record for it is needed in this Cloudflare zone — just confirm the tool still works post-cutover (see Phase 5).

### Records to remove or avoid

| Record | Action |
|--------|--------|
| WordPress `@` A "Handled by WordPress.com" | **Remove** |
| WordPress `NS @ Handled by WordPress.com` | **Do not recreate** in Cloudflare |
| Old `www` CNAME → `mckeesecurity.ca` | **Replace** with Vercel CNAME |
| Wildcard `*` CNAME → `mckeesecurity.ca` | **Do not recreate** unless actively needed. Can mask mistakes and route unexpected subdomains to the website. |

### Cloudflare proxy settings at launch

Set **DNS only** (gray cloud) on:

- All MX records
- All TXT records (SPF, DMARC, DKIM)
- All DKIM CNAME records (Mailchimp, Resend, WP Cloud, Mailgun)
- Vercel A and `www` CNAME

Once the site is live, SSL is issued, and Vercel verifies the domain, Cloudflare proxying can be evaluated later.

---

## Phase 3: Pre-cutover verification (still on WordPress nameservers)

Before changing nameservers at HostPapa:

- [ ] Cloudflare zone contains all required records above
- [ ] No duplicate SPF TXT records at `@`
- [ ] No WordPress website A/CNAME records remain
- [ ] Vercel website records match dashboard exactly
- [ ] CAA records either removed or include `letsencrypt.org` (so Vercel SSL can issue)
- [ ] `_vercel` TXT verification record added if Vercel requested one
- [ ] `EMAIL_FROM` domain confirmed Verified in Resend
- [ ] Screenshot or export the Cloudflare DNS table for reference
- [ ] Optional: lower TTLs on critical records 24 hours ahead

---

## Phase 4: Nameserver cutover at HostPapa

1. In Cloudflare → **DNS**, copy the two assigned nameservers (e.g. `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`).
2. Log into **HostPapa** → domain management for `mckeesecurity.ca`.
3. Replace WordPress.com nameservers with Cloudflare's two nameservers.
4. **Do not transfer the registrar.**
5. Wait for Cloudflare to show the zone as **Active** (usually minutes to a few hours).

During propagation, some users may still hit WordPress briefly. That is normal.

---

## Phase 5: Post-cutover testing

### Website

- [ ] `https://mckeesecurity.ca` loads the Vercel site
- [ ] `https://www.mckeesecurity.ca` loads or redirects correctly
- [ ] HTTP redirects to HTTPS
- [ ] `www` / non-`www` canonical behavior is correct
- [ ] Vercel Domains shows both domains as **Valid**
- [ ] Contact form submits and email arrives
- [ ] Service inquiry forms work (security, cameras, etc.)
- [ ] Job application form works (including resume upload if used)
- [ ] Course pages load
- [ ] Google reviews section loads live data
- [ ] Data Drops tools unlock and load (`/data-drops-mckeesecurity`, `/data-drops-hhhs`)
- [ ] SSL padlock valid on apex and `www` (confirms CAA did not block issuance)
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
nslookup -type=mx mckeesecurity.ca
nslookup -type=txt mckeesecurity.ca
nslookup -type=txt send.mckeesecurity.ca
nslookup mckeesecurity.ca
nslookup www.mckeesecurity.ca
```

Expected:

- MX resolves to Google
- One SPF TXT at `@` (Google + WP Cloud during transition)
- Resend records on `send` subdomain
- Apex and `www` resolve to Vercel targets

---

## Phase 6: Do not cancel WordPress until

- [ ] Vercel website is live on root domain and `www`
- [ ] Cloudflare DNS is active and stable for 24–48 hours
- [ ] Google Workspace email confirmed working inbound and outbound
- [ ] Resend confirmed working
- [ ] Old WordPress forms, email-sending features, and domain-connected features are no longer required
- [ ] All needed DNS records recreated in Cloudflare
- [ ] Any required exports/backups from WordPress are complete

### Post-WordPress cleanup (later)

After WordPress is cancelled and WP Cloud no longer sends mail:

- [ ] Remove `wpcloud1._domainkey` and `wpcloud2._domainkey` CNAME records
- [ ] Remove `include:_spf.wpcloud.com` from root SPF
- [ ] Re-verify Resend and Google Workspace sending
- [ ] Consider tightening DMARC from `p=none` only after all senders pass authentication

---

## Quick execution order

1. Add domains in Vercel → copy exact DNS targets
2. Build full Cloudflare zone manually
3. Verify records and single SPF at `@`
4. Switch nameservers at HostPapa
5. Wait for Cloudflare Active
6. Run post-cutover tests (website, email, DNS)
7. Keep WordPress running until all checks pass
8. Clean up WP-only DNS and SPF later

---

## Pre-cutover checklist (website project)

- [ ] Pre-cutover integration work complete (see project notes)
- [x] Production env vars set in Vercel (7 confirmed 2026-06-21; `DATA_DROPS_AUTH_SECRET` optional add)
- [ ] Production QA on preview URL complete
- [ ] This DNS runbook reviewed against live Cloudflare zone before nameserver change

---

*Update this document if DNS values or senders change.*
