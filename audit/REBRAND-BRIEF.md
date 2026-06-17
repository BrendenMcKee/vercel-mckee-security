# Rebuild Brief — McKee Security Vercel Edition

## Goals

1. **Escape WordPress/Flatsome friction** — enable surgical, agentic code changes via Git + Vercel deploys
2. **Preserve SEO and brand** — same URLs, same visual identity, same copy (unless noted)
3. **Ship a fast marketing site first** — forms working day one
4. **Defer complex backend** — LMS and user auth in v2 with Supabase

## Audience

- Homeowners and businesses in Haliburton County and surrounding region
- Commercial/residential clients seeking integrated security, A/V, networking, Starlink
- Job applicants (technician roles)
- Internal trainees (v2 — LMS)

## Proposed Information Architecture (v1)

### Primary Nav (unchanged from live site)

```
Home | Contact Us | About Us | Our Services ▾
  ├── Security
  ├── Camera Surveillance
  ├── Networking / Cellular Expansion
  ├── Audio / Video
  └── Starlink
```

### Footer

- Company name + copyright (1994 ©)
- Social: Instagram, Facebook, YouTube
- Legal: Terms and Conditions, Privacy Policy
- Optional: Apply Now link, phone tap-to-call

### Routes Not in Nav

- `/apply-now` — linked from careers/recruiting contexts
- Legal pages — footer only

## v1 Scope (Launch)

| Include | Exclude (v2) |
|---------|--------------|
| 9 marketing pages + home | LearnDash courses |
| Contact + inquiry forms | Login / registration |
| Apply Now with file upload | User dashboard |
| SEO metadata + sitemap | WooCommerce |
| 301 redirects for dead URLs | Data Drops internal pages |
| Static team/services data | Admin CMS |

## v2 Scope (Post-Launch)

- Supabase: auth, form submission logs, optional CMS
- LMS: technician course content, video embeds, progress
- Consider `training.mckeesecurity.ca` subdomain if LMS needs more time

## Design Direction

**v1:** Faithful port of current dark Flatsome aesthetic — not a rebrand  
**Later:** Refresh stock photography, fix legal copy, unify form fields, add `/privacy-policy` clean URL

## Technical Stack (per blueprint)

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS + design tokens from BRAND-AUDIT.md |
| Forms | React Hook Form + Zod → API routes |
| Email | Resend or SendGrid (env vars on Vercel) |
| File uploads | Vercel Blob (Apply Now resumes) |
| Hosting | Vercel (root: `website/`) |
| Repo shape | `audit/` + `website/` monorepo |

## Build Priority Order

1. Project scaffold + design tokens + layout shell
2. Home page
3. Services hub + Security (most complex — tier tables)
4. Remaining 4 service pages
5. Contact + Apply Now forms
6. About Us
7. Legal pages
8. Redirects + sitemap + production QA

## Success Criteria for v1 Launch

- [ ] Visual parity with live site on mobile + desktop
- [ ] All primary nav routes live
- [ ] Contact form delivers email
- [ ] Service inquiry form works on all service pages
- [ ] Apply Now accepts resume upload
- [ ] 301 redirects for shop/cart/monitoring/privacy slug
- [ ] Lighthouse 90+ on home and contact
- [ ] Domain `mckeesecurity.ca` pointed to Vercel (when ready to cut over)

## Open Questions for Owner

1. **LMS timeline:** Keep training on WordPress temporarily, or wait for v2 before DNS cutover?
2. **Email provider:** Resend, SendGrid, or existing SMTP?
3. **Privacy route:** OK to add `/privacy-policy` with redirect from `/terms-conditions`?
4. **Terms rewrite:** Update jurisdiction from Netherlands boilerplate to Ontario?
5. **GitHub org/repo name** for Vercel connection?
