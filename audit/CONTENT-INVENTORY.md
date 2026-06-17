# Content Inventory — Page-by-Page Migration Notes

Legend: **Keep** | **Merge** | **Rewrite** | **Defer** | **Drop** | **Redirect**

---

## `/` — Home

**Action:** Keep  
**Last updated:** 2025-12-01  
**Sections:**
- Hero: "Full Home Integration" / "Specialized Security"
- Browse custom installation services grid
- Professional Custom Installations CTA
- Why choose us
- What we do (Security, Audio, Network, Home Automation bullet lists)
- CTAs link to `/custom-installations-professional-products/`

**Notes:** Hero background `DSC00541-min.jpg`. Multiple CTAs with cache-bust query params — strip in rebuild.

---

## `/custom-installations-professional-products/` — Services Hub

**Action:** Keep  
**Last updated:** 2026-04-18 (most recently edited page)  
**Sections:**
- Hero: Custom Installations
- Service category pills (Security, Camera, Networking, A/V, Starlink)
- McKee Approach (Custom Design, Professional Installation, Ongoing Support)
- 5 service cards with Learn More links
- Why Choose McKee (4 value props)
- Inquiry form (Data Drops)

**Notes:** Central hub — build this early as template for service card pattern.

---

## `/security/` — Security

**Action:** Keep  
**Sections:**
- Hero + feature icons (Perimeter, Fire, Low-Temp, Flood, ULC Monitoring, Insurance)
- Professional Security Systems overview
- Intrusion / Environmental / 24-7 Monitoring feature blocks
- Why Choose Professional Security
- Industry-Leading Technology (Cellular, Total Connect 2.0)
- Flexible Monitoring Options + Tier 1–4 comparison table
- Inquiry form

**Notes:** Contains full monitoring tier content. Merge `/monitoring-information/` here.

---

## `/camera-surveillance/` — Camera Surveillance

**Action:** Keep  
**Sections:**
- 4K UHD feature icons
- Uniview UNV technology
- NVR / Network / NDAA compliance
- Why Choose + Equipment Ownership
- Inquiry form

---

## `/networking-cellular-expansion/` — Networking

**Action:** Keep  
**Sections:**
- Wi-Fi 7 feature icons
- UniFi gateway, APs, POE switches, IDS/IPS
- Wireless bridges
- Cellular distribution antennas
- Inquiry form

---

## `/audio-video/` — Audio / Video

**Action:** Keep  
**Sections:**
- Certified Sonos Dealer positioning
- Brand bar: Sonos, Samsung, Paradigm, Anthem
- TV/Soundbar, Whole-Home Audio, Home Theater services
- Sonos product ecosystem grid
- Inquiry form (slightly different field: "What audio/video services are you interested in?")

**Notes:** One stock image (`home-theatre-chennai.jpeg`) — consider replacing with original photography later.

---

## `/starlink/` — Starlink

**Action:** Keep  
**Sections:**
- Gen 3 performance specs
- Professional installation (no roof penetration)
- Equipment provided vs customer-purchased kit
- Mounting kit, 150ft cable product highlights
- Mesh / UniFi integration
- Inquiry form (includes "Have you purchased your Starlink kit?" field)

---

## `/about-us/` — About Us

**Action:** Keep  
**Sections:**
- Meet The Team (9 members with roles)
- Mission statement
- Core values (integrity, respect, dependability)

**Notes:** Team member photos referenced in WP — need media export. Some members have Instagram links.

---

## `/contact-us/` — Contact Us

**Action:** Keep  
**Sections:**
- Get in touch intro
- Phone: 1-705-457-2156
- CF7 form: Name, Email, Subject, Message
- Location + individual contact emails

---

## `/apply-now/` — Careers

**Action:** Keep  
**Sections:**
- Full-Time Technician posting ($18–$30/hr)
- Haliburton County requirement
- Job description
- WPForms application with resume upload

**Notes:** File upload is critical — needs Vercel Blob or Supabase Storage in rebuild.

---

## `/monitoring-information/` — Monitoring Info

**Action:** Merge → `/security#monitoring`  
**Last updated:** 2021-03-19 (stale)  
**Notes:** Nearly identical tier table to security page. Redirect and consolidate.

---

## `/our-courses/` + `/courses/mckee-security-technician/`

**Action:** Defer v2  
**Content:** Free technician course covering Vista 20P, ProSeries, Dahua, Starlink, Ubiquiti — online + in-person modules  
**Notes:** Requires auth, progress tracking, video content. Significant scope — not v1.

---

## `/login/`, `/registration/`, `/profile/`, `/user-dashboard/`

**Action:** Defer v2  
**Notes:** LearnDash user flows. Replace with Supabase Auth when LMS is rebuilt.

---

## `/shop/`, `/cart/`, `/checkout/`, `/wishlist/`

**Action:** Redirect  
**Notes:** Shop page is empty. WooCommerce legacy from 2020.

---

## `/terms-and-conditions/`

**Action:** Keep (Rewrite recommended)  
**Notes:** Generic TermsFeed generator text. References "Netherlands" jurisdiction — **should be corrected to Ontario/Canada** during migration.

---

## `/terms-conditions/` — Privacy Policy

**Action:** Keep → move to `/privacy-policy`  
**Notes:** Slug is misleading. Content is privacy policy.

---

## `/data-drops-hhhs/`, `/data-drops-mckeesecurity/`

**Action:** Drop from public site  
**Notes:** Internal plugin pages — do not migrate.

---

## Repeating Content Blocks (componentize once)

1. **Three Generations footer** — appears on all service pages
2. **Inquiry form wizard** — shared with per-page field variations
3. **Phone + email CTA strip** — `(705) 457-2156` / `info@mckeesecurity.ca`
4. **Header contact** — email + phone in nav
