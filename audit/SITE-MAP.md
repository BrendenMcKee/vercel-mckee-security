# Site Map — mckeesecurity.ca

## Primary Navigation (Mega Menu)

```
Home
Contact Us
About Us
Our Services  →  /custom-installations-professional-products/
├── Security
├── Camera Surveillance
├── Networking / Cellular Expansion
├── Audio / Video
└── Starlink
```

Note: Service sub-pages also appear as top-level nav items with icons (home, lock, camera, etc.).

## Full Published Page Inventory (WordPress REST API)

| URL | Title | Last Modified | Nav | Migration |
|-----|-------|---------------|-----|-----------|
| `/` | Home | 2025-12-01 | Primary | **Keep** — v1 priority 1 |
| `/contact-us/` | Contact Us | 2025-12-01 | Primary | **Keep** — v1 priority 2 |
| `/about-us/` | About Us | 2025-12-01 | Primary | **Keep** — v1 |
| `/custom-installations-professional-products/` | Custom Installations & Professional Products | 2026-04-18 | Primary (Our Services) | **Keep** — services hub |
| `/security/` | Security | 2025-12-02 | Primary | **Keep** — v1 |
| `/camera-surveillance/` | Camera Surveillance | 2025-12-02 | Primary | **Keep** — v1 |
| `/networking-cellular-expansion/` | Networking / Cellular Expansion | 2025-12-02 | Primary | **Keep** — v1 |
| `/audio-video/` | Audio / Video | 2025-12-02 | Primary | **Keep** — v1 |
| `/starlink/` | Starlink | 2025-12-02 | Primary | **Keep** — v1 |
| `/apply-now/` | Apply Now! | 2023-02-24 | Orphaned | **Keep** — careers page |
| `/our-courses/` | Our Courses | 2025-03-05 | Orphaned | **Defer v2** — LMS |
| `/our-courses-technician/` | Technician Course | 2025-03-02 | Orphaned | **Defer v2** — LMS |
| `/courses/mckee-security-technician/` | McKee Security – Technician Course | — | LMS | **Defer v2** — LearnDash |
| `/monitoring-information/` | Monitoring Information | 2021-03-19 | Orphaned | **Merge** → `/security#monitoring` |
| `/login/` | Login | 2025-12-28 | Auth | **Defer v2** |
| `/registration/` | Registration | 2025-03-20 | Auth | **Defer v2** |
| `/registration-success/` | Registration Success | 2025-03-04 | Auth | **Defer v2** |
| `/profile/` | Profile | 2025-02-27 | Auth | **Defer v2** |
| `/user-dashboard/` | User Dashboard | 2025-05-08 | Auth | **Defer v2** |
| `/shop/` | Shop | 2020-09-23 | Orphaned | **Redirect** — empty WooCommerce |
| `/cart/` | Cart | 2020-08-24 | WooCommerce | **Redirect** |
| `/checkout/` | Checkout | 2020-08-24 | WooCommerce | **Redirect** |
| `/wishlist/` | Wishlist | 2020-09-23 | WooCommerce | **Redirect** |
| `/terms-and-conditions/` | Terms and Conditions | 2020-08-27 | Legal | **Keep** — footer |
| `/terms-conditions/` | Privacy Policy | 2020-08-27 | Legal | **Keep** — rename route to `/privacy-policy` |
| `/data-drops-hhhs/` | Data Drops | 2025-04-09 | Internal | **Drop** from public site |
| `/data-drops-mckeesecurity/` | Data Drops - Internal | 2025-04-14 | Internal | **Drop** from public site |

## Blog / Posts

No published posts (`/wp-json/wp/v2/posts` returns empty array).

## Proposed Redirect Plan

| Old URL | New URL | Reason |
|---------|---------|--------|
| `/terms-conditions/` | `/privacy-policy/` | Fix misleading slug |
| `/monitoring-information/` | `/security/#monitoring` | Duplicate content |
| `/shop/` | `/custom-installations-professional-products/` | Empty store |
| `/cart/` | `/custom-installations-professional-products/` | WooCommerce remnant |
| `/checkout/` | `/contact-us/` | WooCommerce remnant |
| `/wishlist/` | `/` | WooCommerce remnant |

All other marketing URLs should remain **identical** for SEO continuity.

## v1 Build Priority

1. Home
2. Contact Us (+ form)
3. Services hub + 5 service detail pages
4. About Us
5. Apply Now (+ form with file upload)
6. Legal pages
7. Layout shell (header, footer, mobile nav)

## v2 Scope (Post-Launch)

- LearnDash replacement: course catalog, lessons, quizzes, progress tracking
- User auth: login, registration, dashboard
- Optional: Supabase for submissions log + future CMS
