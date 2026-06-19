# McKee Security Vercel Migration Master Plan

> **Single source of truth** for this project. Refer here before each work session so context never drifts.

**Live WordPress site:** https://mckeesecurity.ca  
**Goal:** Rebuild as a fast, maintainable Next.js app on Vercel. Editable via Git and AI agents, not WordPress or Flatsome workarounds.

**GitHub repo:** `BrendenMcKee/vercel-mckee-security`  
**Vercel root directory:** `website/`  
**Preview URL:** https://vercel-mckee-security.vercel.app

---

## What We Are Building

A world-class marketing website for McKee Security and Audio Systems. Same brand, same services, better UX, with:

- All public marketing pages live on Next.js
- Working contact, inquiry, and job application forms (no WordPress plugins)
- Simple free technician course pages (structured content only, no login)
- SEO parity (same URLs where possible, 301 redirects where we clean up)
- Dynamic UI with scroll animations, interactive tabs, multi-step forms, and polished mobile experience

## What We Are NOT Building (Yet)

| Excluded | Why |
|----------|-----|
| E-commerce / checkout | Never was real commerce. Old WooCommerce pages were a UI hack. Redirect to services. |
| User authentication | Not needed for anything live today. Add later when advanced features require it. |
| LearnDash clone | Course is free, for internal technician training structure only. Static lesson pages, no LMS platform. |
| WordPress admin | Replaced by code and Git deploys. |
| Database (v1) | Typed TS config files and static content. Supabase optional later. |

Note: Data Drops is a separate internal tool with its own AWS backend and RDS database. The exclusions above apply to the public marketing site, not to Data Drops.

---

## Repository Layout

```
vercel-mckee-security/
├── general.md                # This file (master plan + progress)
├── README.md                 # Quick repo intro
├── docs/                     # Deployment and architecture docs
├── audit/                    # WordPress audit (reference, not deployed)
├── website/                  # Next.js app (marketing site + Data Drops UI). Vercel deploys this folder.
└── data-drops-aws-backend/   # Express API for Data Drops (AWS Elastic Beanstalk + RDS)
```

This is a monorepo: the website deploys to Vercel and the backend deploys to AWS Elastic Beanstalk, independently. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Writing Rules

**No em dashes anywhere** in this project. Use periods, commas, or colons instead. Write complete sentences in copy, commits, and documentation.

---

## Scope: Pages

### Marketing

| Route | Status | Notes |
|-------|--------|-------|
| `/` | Done | Home hero, stats, services, animated tabs |
| `/contact-us` | Done | Form and contact info |
| `/about-us` | Done | Team grid, mission, values |
| `/custom-installations-professional-products` | Done | Services hub |
| `/security` | Done | Monitoring tiers, inquiry form |
| `/camera-surveillance` | Done | |
| `/networking-cellular-expansion` | Done | |
| `/audio-video` | Done | |
| `/starlink` | Done | |
| `/apply-now` | Done | Job form with resume upload |
| `/terms-and-conditions` | Done | Ontario jurisdiction |
| `/privacy-policy` | Done | Clean URL with redirect from `/terms-conditions` |

### Course (simple, no auth)

| Route | Status | Notes |
|-------|--------|-------|
| `/our-courses` | Done | Course landing |
| `/courses/mckee-security-technician` | Done | Interactive syllabus accordion |

### Redirects

| From | To |
|------|-----|
| `/shop`, `/cart`, `/wishlist` | `/custom-installations-professional-products` |
| `/checkout` | `/contact-us` |
| `/monitoring-information` | `/security#monitoring` |
| `/terms-conditions` | `/privacy-policy` |
| `/login`, `/registration`, `/profile`, `/user-dashboard` | `/our-courses` |

---

## UX Improvements Delivered

1. Sticky header with scroll state, mobile drawer, floating tap-to-call button
2. Parallax hero sections with brand photography
3. Animated stats bar on the home page
4. Interactive service category tabs on the home page
5. Service cards with hover lift and staggered scroll reveals
6. Multi-step inquiry modal with validation (replaces Data Drops wizard)
7. Monitoring tier tabs on mobile plus comparison table on desktop
8. Course syllabus accordion (no login required)
9. Framer Motion throughout with reduced-motion respect in CSS

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + CSS variables |
| Animation | Framer Motion |
| Forms | React Hook Form + Zod |
| Email | Resend via API routes (logs to console until `RESEND_API_KEY` is set) |
| Hosting | Vercel |

---

## Phase Checklist

### Phase 1: Audit
- [x] Complete

### Phase 2: Repo and Infrastructure
- [x] Complete

### Phase 3: Foundation
- [x] Design tokens
- [x] Site config and data layer
- [x] Header, footer, motion primitives
- [x] Shared sections and forms

### Phase 4: Pages
- [x] All marketing pages
- [x] Course pages
- [x] Legal pages

### Phase 5: Forms and API
- [x] Contact, inquiry, apply API routes
- [ ] Set `RESEND_API_KEY` and `CONTACT_EMAIL` on Vercel for production email

### Phase 6: SEO and Launch
- [x] Metadata, sitemap, robots, redirects
- [ ] Download remaining images from WordPress media library
- [ ] Production QA on live Vercel URL
- [ ] DNS cutover: `mckeesecurity.ca` to Vercel when ready (see [dns-migration-cloudflare-vercel.md](dns-migration-cloudflare-vercel.md))

### Phase 7: Data Drops (internal tool)
- [x] Native rebuild of the Data Drops network-run-confirmation app at `/data-drops-hhhs` and `/data-drops-mckeesecurity`
- [x] Server-side password gate (cookie), same-origin proxy to the AWS API (no CORS, backend untouched)
- [x] `DATA_DROPS_PASSWORD` set on Vercel (shared access password; the admin deletion password lives in AWS)
- See [docs/DATA-DROPS.md](docs/DATA-DROPS.md) for architecture and findings

### Phase 8: Monorepo and backend
- [x] Imported the Data Drops AWS backend into the monorepo (`data-drops-aws-backend/`); legacy standalone repos archived as `-old`
- [x] AWS CLI v2 + EB CLI set up with a dedicated `eb-deployer` IAM user (profile `eb-cli`)
- [x] Fixed the per-tenant site listing bug and deployed it to the `data-drops-app` EB environment (verified live)
- [x] Decided to accept Vercel rebuilds on every push (backend changes are rare; redundant rebuilds are harmless). The Ignored Build Step stays documented as an optional future optimization (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))

---

## Key Decisions Log

| Date | Decision |
|------|----------|
| 2026-06-17 | Migrate off WordPress to Vercel for agentic deploys |
| 2026-06-17 | No e-commerce. Redirect old shop URLs to services. |
| 2026-06-17 | No user auth in v1 |
| 2026-06-17 | LearnDash becomes static course pages. Free, no login. |
| 2026-06-17 | Improve UX. Not a pixel-perfect WordPress clone. |
| 2026-06-17 | No em dashes in any project writing |
| 2026-06-17 | GitHub and Vercel live. Root directory `website/` |
| 2026-06-18 | Data Drops rebuilt natively in Next (not embedded). AWS backend + RDS untouched, reached via a same-origin proxy. |
| 2026-06-19 | Monorepo: brought the Data Drops AWS backend into this repo; archived the standalone repos as `-old`. |
| 2026-06-19 | Backend deploys via the EB CLI (`eb deploy`) from `data-drops-aws-backend/` to the `data-drops-app` environment. |
| 2026-06-19 | Fixed per-tenant site listing in the backend (`getAllSites` reads `?domain=`) and deployed it live. |
| 2026-06-19 | Skip the Vercel Ignored Build Step for now. Backend changes are rare and redundant rebuilds are harmless. Kept documented as an optional future optimization. |

---

## Open Items

- [ ] Add `RESEND_API_KEY`, `CONTACT_EMAIL`, and `EMAIL_FROM` in Vercel env vars
- [x] Add `DATA_DROPS_PASSWORD` in Vercel env vars (Data Drops access gate). Optional: `DATA_DROPS_API_URL` (defaults to `https://app-mckeesecurity.ca/api`)
- [ ] Team member photos from WordPress media
- [ ] DNS cutover timing ([runbook](dns-migration-cloudflare-vercel.md))

---

## Lessons Learned

- The live deployment can be newer than the local checkout. Reconcile local, remote, and what is actually deployed before treating any source as truth. For Data Drops, the live minified bundle and the deployed backend were both ahead of the local repos.
- Prefer a same-origin proxy over backend CORS changes when a frontend must call a separate API. It removes CORS everywhere and avoids touching or redeploying the backend.
- Verify the deploy target before deploying. The EB config had been copied from another project and pointed at the wrong application and environment; the correct target is `data-drops-app`.
- `.ebignore` makes EB deploys safe from a monorepo subfolder and allows deploying a fix before committing.
- Next 16 changed several APIs (middleware is now `proxy`, `cookies()` is async, route `params` is a Promise). Check `node_modules/next/dist/docs` for this version.
- See [docs/DATA-DROPS.md](docs/DATA-DROPS.md) for the full Data Drops write-up.

---

*Last updated: 2026-06-19*
