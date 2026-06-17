# McKee Security — Vercel Migration Master Plan

> **Single source of truth** for this project. Refer here before each work session so context never drifts.

**Live WordPress site:** https://mckeesecurity.ca  
**Goal:** Rebuild as a fast, maintainable Next.js app on Vercel — editable via Git + AI agents, not WordPress/Flatsome workarounds.

**GitHub repo:** `BrendenMcKee/vercel-mckee-security`  
**Vercel root directory:** `website/`

---

## What We're Building

A **world-class marketing website** for McKee Security & Audio Systems — same brand, same services, better UX — with:

- Static/SSG pages for all public marketing content
- Working contact, inquiry, and job application forms (no WordPress plugins)
- Simple free technician course pages (structured content only — **no login/auth**)
- SEO parity (same URLs where possible, 301 redirects where we clean up)

## What We're NOT Building (Yet)

| Excluded | Why |
|----------|-----|
| E-commerce / checkout | Never was real commerce — old WooCommerce pages were a UI hack. **Redirect to services.** |
| User authentication | Not needed for anything live today. Add later when advanced features require it. |
| LearnDash clone | Course is **free**, for internal technician training structure only. Rebuild as static/MDX lesson pages — no LMS platform. |
| WordPress admin | Replaced by code + Git deploys. |
| Database (v1) | Typed TS config files + static content. Supabase optional later. |

---

## Repository Layout

```
vercel-mckee-security/
├── general.md          ← this file (master plan + progress)
├── README.md           ← quick repo intro
├── audit/              ← WordPress audit (reference, not deployed)
└── website/            ← Next.js app → Vercel deploys this folder
```

---

## Scope — Pages

### v1 Marketing (priority)

| Route | Status | Notes |
|-------|--------|-------|
| `/` | ⬜ Todo | Home hero, services overview, CTAs |
| `/contact-us` | ⬜ Todo | Form + contact info |
| `/about-us` | ⬜ Todo | Team grid, mission, values |
| `/custom-installations-professional-products` | ⬜ Todo | Services hub |
| `/security` | ⬜ Todo | Includes monitoring tiers |
| `/camera-surveillance` | ⬜ Todo | |
| `/networking-cellular-expansion` | ⬜ Todo | |
| `/audio-video` | ⬜ Todo | |
| `/starlink` | ⬜ Todo | |
| `/apply-now` | ⬜ Todo | Job form + resume upload |
| `/terms-and-conditions` | ⬜ Todo | Legal — rewrite jurisdiction |
| `/privacy-policy` | ⬜ Todo | New clean URL (+ redirect from `/terms-conditions`) |

### v1 Course (simple, no auth)

| Route | Status | Notes |
|-------|--------|-------|
| `/our-courses` | ⬜ Todo | Course landing |
| `/courses/mckee-security-technician` | ⬜ Todo | Static lesson outline from audit |

### Redirects (old WordPress cruft)

| From | To |
|------|-----|
| `/shop`, `/cart`, `/wishlist` | `/custom-installations-professional-products` |
| `/checkout` | `/contact-us` |
| `/monitoring-information` | `/security#monitoring` |
| `/terms-conditions` | `/privacy-policy` |
| `/login`, `/registration`, `/profile`, `/user-dashboard` | `/our-courses` or `/` |

---

## UX Improvements (Build From Scratch)

Since we're not cloning WordPress pixel-for-pixel, elevate the experience:

1. **Navigation** — Clean sticky header, mobile drawer, tap-to-call button on mobile
2. **Services** — Card grid with clear hierarchy; reduce duplicate CTAs
3. **Forms** — One polished inquiry flow (not flaky slide-over wizard); inline validation
4. **Performance** — next/image, font optimization, no jQuery/Flatsome bloat
5. **Accessibility** — Semantic HTML, focus states, reduced motion support
6. **Monitoring tiers** — Responsive comparison (cards on mobile, not hidden tables)
7. **Course pages** — Clean syllabus layout with progress feel (visual only, no auth)
8. **Footer** — Legal links, social, phone, address in one scannable block
9. **Micro-interactions** — Subtle scroll reveals; no over-animation
10. **Dark theme** — Keep McKee brand (red/black) but refine contrast and spacing

Full brand tokens: `audit/BRAND-AUDIT.md`

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS variables from brand audit |
| Forms | React Hook Form + Zod → API routes |
| Email | Resend or SendGrid (env on Vercel) |
| File uploads | Vercel Blob (Apply Now resumes) |
| Hosting | Vercel |
| Content (v1) | Typed TS/MDX in repo |

---

## Phase Checklist

### Phase 1 — Audit ✅
- [x] Map URLs, nav, plugins
- [x] Export copy and business facts
- [x] Brand audit (colors, fonts, patterns)
- [x] WordPress feature → rebuild mapping
- [x] Artifacts in `audit/`

### Phase 2 — Repo & Infrastructure ✅
- [x] Local git init
- [x] Initial commit
- [x] GitHub repo `vercel-mckee-security` created + pushed
- [x] Next.js scaffold in `website/` (branded placeholder)
- [x] Vercel project linked (root: `website/`) — https://vercel-mckee-security.vercel.app

### Phase 3 — Foundation ⬜
- [ ] Design tokens (Tailwind theme)
- [ ] `lib/site-config.ts` from `audit/CONTACT-INFO.json`
- [ ] Layout: Header, Footer, MobileNav
- [ ] Shared sections: Hero, FeatureGrid, ServiceCard, CTA, InquiryForm

### Phase 4 — Pages ⬜
- [ ] Home
- [ ] Services hub + 5 service pages
- [ ] About, Contact, Apply Now
- [ ] Legal pages
- [ ] Course pages (static)

### Phase 5 — Forms & API ⬜
- [ ] Contact form → email
- [ ] Service inquiry form
- [ ] Apply Now + resume upload

### Phase 6 — SEO & Launch ⬜
- [ ] Metadata + Open Graph per page
- [ ] `sitemap.ts`, `robots.ts`
- [ ] 301 redirects in `next.config.ts`
- [ ] Download/optimize key images to `public/`
- [ ] Production QA (mobile, forms, Lighthouse)
- [ ] DNS: `mckeesecurity.ca` → Vercel (when ready)

---

## Key Decisions Log

| Date | Decision |
|------|----------|
| 2026-06-17 | Migrate off WordPress to Vercel for agentic deploys |
| 2026-06-17 | No e-commerce — redirect old shop URLs to services |
| 2026-06-17 | No user auth in v1 |
| 2026-06-17 | LearnDash → static course pages, free, no login |
| 2026-06-17 | Improve UX where possible; not a pixel-perfect WP clone |
| 2026-06-17 | GitHub + Vercel live; root directory `website/` |

---

## Reference Files

| Need | File |
|------|------|
| URLs & redirects | `audit/SITE-MAP.md`, `audit/site-map.json` |
| Page copy notes | `audit/CONTENT-INVENTORY.md`, `audit/content/` |
| Brand | `audit/BRAND-AUDIT.md` |
| Contact/team data | `audit/CONTACT-INFO.json` |
| Plugin mapping | `audit/WORDPRESS-FEATURES.md` |
| Build scope | `audit/REBRAND-BRIEF.md` |

---

## Open Items

- [ ] Email provider choice (Resend vs SendGrid)
- [ ] Terms/Privacy jurisdiction rewrite (Ontario, not Netherlands boilerplate)
- [ ] DNS cutover timing vs preview URL testing

---

*Last updated: 2026-06-17*
