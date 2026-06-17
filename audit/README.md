# McKee Security — WordPress Site Audit

**Audited:** 2026-06-17  
**Live site:** https://mckeesecurity.ca  
**Purpose:** Blueprint for rebuilding on Vercel (Next.js) to enable fast, agentic edits without WordPress/Flatsome workarounds.

## Sources Used

| Source | Result |
|--------|--------|
| Live site crawl (WebFetch + HTML download) | Page content, nav, footer, brand CSS |
| WordPress REST API (`/wp-json/wp/v2/pages`) | 26 published pages — saved in `raw/pages-summary.json` |
| WordPress REST API (`/wp-json/wp/v2/media`) | 645 media items (78 accessible per page; full export deferred to build phase) |
| WordPress REST API (`/wp-json/`) | Site name, tagline, timezone |
| Homepage HTML | Mega Menu nav, Flatsome theme tokens, plugin list |
| `robots.txt` | Sitemap references (main sitemap returns 500) |

## Key Findings (Executive Summary)

1. **Theme:** Flatsome 3.20.4 on WordPress.com hosting (Jetpack mu-plugins, `_static` asset bundling).
2. **Primary site:** 9-item marketing nav + service detail pages — this is the v1 migration target.
3. **Heavy WordPress baggage:** LearnDash LMS, WooCommerce remnants (empty shop), WPForms/Jetpack forms, Mega Menu, Elementor/UX Blocks, custom "Data Drops" plugin.
4. **Forms everywhere:** Contact Form 7 + reCAPTCHA + custom multi-step "Data Drops" inquiry forms on service pages.
5. **LMS is a separate product surface:** Technician training course with login/registration/dashboard — recommend v2 (Supabase + auth) or temporary subdomain on WordPress.
6. **Brand is well-defined:** Dark UI (#0a0a0a), McKee red (#ec0000), blue accent (#1e99e6), Lato + Dancing Script.

## Audit Artifacts

| File | Contents |
|------|----------|
| `SITE-MAP.md` | Human-readable URL inventory, nav tree, redirect plan |
| `site-map.json` | Machine-readable routes for redirects/scripts |
| `CONTENT-INVENTORY.md` | Page-by-page migration notes |
| `BRAND-AUDIT.md` | Colors, fonts, logo, UX patterns |
| `REBRAND-BRIEF.md` | Proposed IA, build priorities, v1 vs v2 scope |
| `CONTACT-INFO.json` | Structured business facts |
| `WORDPRESS-FEATURES.md` | Plugins → rebuild mapping |
| `image-inventory.json` | Key media assets (hero, logo, service images) |
| `content/` | Per-page markdown exports |
| `raw/` | API dumps, homepage HTML |

## Recommended Next Step

Phase 2 from the migration blueprint:

1. Scaffold `website/` (Next.js App Router, TypeScript, Tailwind)
2. Initialize git repo, push to GitHub, connect Vercel (root dir: `website/`)
3. Build v1: marketing pages + contact/inquiry forms + SEO redirects
4. Defer LearnDash/LMS and WooCommerce to v2
