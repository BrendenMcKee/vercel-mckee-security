# Brand Audit — McKee Security & Audio Systems

## Identity

| Element | Value |
|---------|-------|
| Business name | McKee Security & Audio Systems |
| Tagline | A viable technology solution |
| Tone | Professional, local, family-owned, tech-forward |
| Heritage | Founded 1994; 3 generations; 30+ years in Haliburton region |

## Logo & Icons

| Asset | URL | Usage |
|-------|-----|-------|
| Primary logo (header) | `/wp-content/uploads/2025/12/MS_LOGO-1024x303.png` | Header, light on dark |
| Full logo source | `/wp-content/uploads/2025/12/MS_LOGO.png` (11417×3375) | Download for `public/` |
| Shield favicon | `/wp-content/uploads/2024/10/cropped-V6-Logo-Shield-*.png` | Favicon, app icon |
| MS icon | `/wp-content/uploads/2025/12/MS-Icon.png` (504×504) | Square mark |

## Color Palette (from Flatsome custom CSS)

| Role | Hex | Notes |
|------|-----|-------|
| Primary / McKee Red | `#ec0000` | CTAs, accents, `--primary-color` |
| Secondary / Blue | `#1e99e6` | Secondary buttons, links accent |
| Alert Red | `#b20000` | Error states |
| Success Green | `#8ebf5e` | Success states |
| Page background | `#0a0a0a` | Main content area — dark theme |
| Header background | `rgba(10,10,10,0.9)` | Semi-transparent sticky header |
| Header bottom bar | `rgba(63,63,63,0.95)` | Secondary nav strip |
| Header top bar | `#660000` | Top social/contact bar |
| Footer widgets | `#424242` | Footer section |
| Absolute footer | `#262626` | Copyright bar |
| Body text / headings | `#ffffff` | White on dark |
| Link color | `#2b659b` | Body links |
| Link hover | `#111111` | Dark hover (may need adjustment on dark bg) |

## Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Body | Lato | 400 | Paragraphs, UI |
| Headings / Nav | Lato | 700 | H1–H6, navigation |
| Accent / Script | Dancing Script | 400 | Decorative "alt-font" labels |

Fonts are self-hosted at `/wp-content/fonts/lato/` and `/wp-content/fonts/dancing-script/`.

## Layout Patterns (Flatsome → React sections)

Repeated section types found across pages:

1. **Hero banner** — Full-width background image, overlay text, primary CTA
2. **Icon feature grid** — 4–6 columns with icon + label (e.g. "Perimeter Alarm", "Wi-Fi 7")
3. **Two-column content** — Image + copy blocks
4. **Service cards** — Grid linking to detail pages with "Learn More"
5. **Tier/pricing tables** — Monitoring tiers 1–4 (security pages)
6. **Brand logo bar** — Sonos, Samsung, Paradigm, etc.
7. **Team grid** — About page with photos + roles
8. **CTA band** — "Ready to protect what matters most?" + phone/email
9. **Multi-step inquiry form** — Data Drops plugin (slide-over wizard)
10. **Three Generations footer block** — Repeated on every service page

## Photography Style

- Professional install photos (security panels, cameras, networking gear)
- Dark overlays on hero images
- Mix of stock and original photography (some generic stock on A/V page — note for future refresh)

## UX Observations

**Strengths**
- Consistent dark premium aesthetic
- Clear service taxonomy
- Strong local trust signals (team, 30 years, phone in header)
- Mobile hamburger + mega menu

**Pain points / dated patterns**
- Flatsome page builder makes surgical edits hard (your stated pain)
- Duplicate monitoring content across `/security` and `/monitoring-information`
- Privacy policy at `/terms-conditions` is confusing
- Empty WooCommerce pages still published
- Inquiry forms differ slightly per page (field labels vary)
- Some template boilerplate in Terms (references "Netherlands" law — generator artifact)
- `?v=3e8d115eb4b3` cache-bust query params on internal links

## Design System Recommendation for Vercel Rebuild

Implement as Tailwind theme extension + CSS variables:

```css
--color-primary: #ec0000;
--color-secondary: #1e99e6;
--color-background: #0a0a0a;
--color-surface: #262626;
--color-surface-elevated: #424242;
--color-text: #ffffff;
--font-sans: 'Lato', sans-serif;
--font-display: 'Lato', sans-serif;
--font-accent: 'Dancing Script', cursive;
```

Preserve visual fidelity in v1; consider light-mode or refreshed photography in a later design pass.
