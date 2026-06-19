# WordPress Features → Rebuild Mapping

## Hosting & Platform

| WordPress | Rebuild approach |
|-----------|------------------|
| WordPress.com hosted | Vercel + GitHub |
| Flatsome theme 3.20.4 | Custom Next.js components + Tailwind |
| Mega Menu + Mega Menu Pro | React header with mobile drawer |
| UX Blocks / Elementor library | Rebuild as React section components |
| Jetpack (CDN, likes, social icons) | Native Next.js metadata + static social links |
| Gutenberg | Not needed — content in typed TS/MDX files |

## Plugins Detected (from homepage asset URLs)

| Plugin | Purpose on site | Rebuild approach |
|--------|-----------------|------------------|
| **Contact Form 7** + reCAPTCHA | Contact page "Ask a question" form | React Hook Form + Zod → API route → Resend/SendGrid; hCaptcha or Turnstile |
| **Data Drops** (custom) | Multi-step inquiry wizard on service pages | Rebuild as shared `<InquiryForm>` component + API route; store submissions in Supabase (optional v2) |
| **WPForms** | Apply Now (resume/cover letter upload) | React form + file upload to Vercel Blob or Supabase Storage + email notification |
| **LearnDash** (`sfwd-lms` 5.0.3) | Technician training course, login, dashboard | **Defer v2** — Supabase + custom LMS or keep WordPress subdomain temporarily |
| **WooCommerce** (remnants) | Shop, cart, checkout, wishlist | **Remove** — redirect to services/contact; no active commerce detected |
| **CoBlocks** | Animation blocks | Framer Motion only if needed |
| **ElementsKit Lite** | Widget scripts | Not needed |
| **Use Any Font** | Custom font loading | `next/font` or self-hosted woff2 in `public/fonts/` |

## Content Types (REST API)

| Type | Count / status | Action |
|------|----------------|--------|
| Pages | 26 published | Migrate marketing + legal to static routes |
| Posts | 0 | None |
| Media | 645 items | Download key assets for v1; bulk export during build |
| LearnDash courses | 1+ (Technician Course) | v2 |
| Jetpack Forms | Present | Replace with API routes |

## Forms Inventory

### 1. Contact Us — Simple contact (CF7)

Fields: Name, Email, Subject, Message  
Location: `/contact-us/`

### 2. Service inquiry — Data Drops multi-step

Fields: First & last name, Email, Phone, Full address, Service inquiry text, Additional comments  
Locations: `/security/`, `/custom-installations-professional-products/`, `/camera-surveillance/`, `/networking-cellular-expansion/`, `/audio-video/`, `/starlink/`  
Behavior: Slide-over wizard with "← Back" and thank-you state

### 3. Apply Now — WPForms with file upload

Fields: Name (first/last), Email, Phone, Address (full), How did you find us, Resume (required), Cover letter (optional), Additional info  
Location: `/apply-now/`

## SEO & Technical

| Feature | WordPress | Rebuild |
|---------|-----------|---------|
| Yoast/similar | Unknown | `metadata` export per route, Open Graph |
| Sitemap | `/sitemap.xml` (currently 500 error) | `app/sitemap.ts` |
| robots.txt | Present | `app/robots.ts` |
| Canonical URLs | Per-page | Next.js metadata |
| Schema | Unknown | LocalBusiness JSON-LD from CONTACT-INFO.json |

## Auth / User Features

| Feature | Current | Rebuild |
|---------|---------|---------|
| Login | `/login/` | Supabase Auth (v2) |
| Registration | `/registration/` | Supabase Auth (v2) |
| User dashboard | `/user-dashboard/` | Protected route (v2) |
| Course progress | LearnDash | Custom or Supabase (v2) |

## Internal / Drop from Public Site

- `/data-drops-hhhs/` — internal Data Drops instance
- `/data-drops-mckeesecurity/` — internal Data Drops instance

These should not be migrated to the public Vercel site.

Update (2026-06-19): Data Drops was rebuilt natively in the Next app at these same slugs, behind a password gate and noindex. The AWS backend it talks to now lives in this repo under `data-drops-aws-backend/`. See `docs/DATA-DROPS.md`.
