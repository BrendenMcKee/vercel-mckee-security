# Website performance & image delivery

> **Scope:** Next.js marketing site in `website/` (Vercel). Last updated: 2026-06-21.

This document captures the performance work completed during the WordPress → Vercel migration and how we handle images going forward.

---

## What we fixed (2026-06)

### Scroll / animation jank

- **Problem:** Permanent `will-change: transform` on many large layers (heroes, parallax sections, gallery tiles) kept huge GPU compositor layers pinned for the whole page lifetime.
- **Fix:**
  - Hero and `ParallaxSection` only set `willChange` while the section is in (or near) the viewport (`useInView` + `prefers-reduced-motion`).
  - Removed static `will-change-transform` from gallery hover tiles.
- **Result:** Smoother scrolling; DevTools showed low main-thread work during long scroll sessions.

### Cumulative Layout Shift (CLS)

- **Problem:** Fixed header spacer started at `height: 0` until JS measured the header, pushing content down on first paint (~0.08 CLS).
- **Fix:** CSS `min-height` floor on the spacer (`min-h-[100px] lg:min-h-[140px]`) until the measured height is applied.
- **Result:** CLS ~**0.03** on production traces.

### Image delivery

- **Enabled AVIF + WebP** in `website/next.config.ts`:
  ```ts
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 80, 82, 85],
  }
  ```
- **Right-sized oversized sources:**
  - `hero-apply-now.jpg`: 4000×1868 → 2400×1121 (~1.6 MB → ~0.4 MB source)
  - `browse-services-bg.jpg`: 6000×4000 → 2560×1707
- **Background quality tiers:** heroes/parallax/stats at **80–85** (not 90–95); gallery tiles stay at default **75**.
- **Critical bug fixed:** Defining `images` in config serializes `qualities` into the build. Vercel’s optimizer **rejects** any `quality` prop not in that list with HTTP 400. We must keep `qualities` in sync with every `<Image quality={…}>` in the app.

### Social link previews (Open Graph)

- **Problem:** Discord / social shares showed title + description only — no preview image (`og:image` was missing). Some clients still cached **WordPress Jetpack** OG images (cropped red serif `logo.png` wordmark with `&AMP;` text) until DNS fully propagated.
- **Fix:** `website/src/app/opengraph-image.tsx` generates a **1200×630** branded PNG at build time:
  - Uses **`shield-logo.png`** (not `logo.png` — the old serif wordmark crops badly in link previews)
  - Clean dark layout matching site colors; **no ampersands** in rendered text (Satori/clients can show `&AMP;` literally)
  - No busy photo background (keeps file ~70 KB vs ~1 MB)
- Root layout sets explicit `openGraph.images` and `twitter:card` = `summary_large_image`.
- **After changing OG:** messaging apps cache previews — re-share with `?v=2` or wait for cache expiry. Confirm HTML shows `og:image` pointing at your domain’s `/opengraph-image`, not `s0.wp.com`.

---

## How we handle images (ongoing rules)

### 1. Always use `next/image`

Use the Next.js `<Image>` component for photos. Do not drop raw `<img>` tags for content images unless there is a strong reason (e.g. third-party embed).

### 2. Source files in `public/images/`

- **Max practical width:** ~2400px for full-bleed heroes; ~2560px for wide backgrounds. Larger sources waste decode time and optimizer CPU without visible gain.
- **Format:** JPEG for photos, PNG for logos/icons with transparency.
- **Before adding a new hero:** check dimensions with Explorer or `identify`; resize down if over ~2600px wide.

### 3. `quality` prop — allowed values only

Configured in `next.config.ts`:

| Value | Typical use |
|-------|-------------|
| **75** | Default — gallery tiles, most content |
| **80** | Parallax sections (non-priority) |
| **82** | Hero backgrounds, stats band |
| **85** | Priority parallax, team headshots |

**If you add a new quality** (e.g. `quality={70}`), you **must** add it to `images.qualities` in `next.config.ts` or production image URLs will 400.

### 4. `sizes` attribute

Must reflect how wide the image is **on screen**, not the source pixel width:

- Full-bleed hero: `sizes="100vw"`
- Gallery masonry (4 columns): `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw`
- Service gallery (3 columns): `(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw`
- Lightbox: `(max-width: 1024px) 100vw, 1024px`

Wrong `sizes` → browser downloads a variant that is too large → hurts LCP and the gallery page total bytes.

### 5. Lazy loading

Gallery and below-the-fold images use `loading="lazy"` (default for non-priority `<Image>`). Only above-the-fold heroes use `priority`.

The main gallery has **~100 images**. They lazy-load as you scroll; scrolling the entire gallery in one session will still download a lot — that is expected. We intentionally did **not** add a “Load more” cap (2026-06-21 decision).

### 6. AVIF / WebP

Vercel serves AVIF when the browser accepts it, otherwise WebP. No manual format work in components. Do not commit WebP/AVIF duplicates alongside JPEG sources in `public/`.

### 7. Open Graph / social images

- **Site-wide default:** `src/app/opengraph-image.tsx` (1200×630 PNG).
- **Per-page overrides:** add `opengraph-image.tsx` or `opengraph-image.jpg` in that route’s `app/` folder.
- After changing OG assets, Discord/Facebook cache old previews — use their debuggers or append `?v=2` to the URL when re-testing shares.

---

## Verifying after changes

1. **Build:** `cd website && npm run build`
2. **Image optimizer:** after deploy, a URL like  
   `https://mckeesecurity.ca/_next/image?url=%2Fimages%2Fhero-apply-now.jpg&w=1920&q=82`  
   should return **200** with `Content-Type: image/avif` (not 400).
3. **Performance (optional):** Chrome DevTools → Performance → record home + gallery scroll. Targets: CLS &lt; 0.1, INP &lt; 200 ms, no sustained red frame bands during scroll.
4. **Social preview:** View page source for `og:image` pointing at `/opengraph-image` (or the generated hash URL). Test with [Discord embed](https://discord.com) or [opengraph.xyz](https://www.opengraph.xyz/).

---

## Related files

| File | Purpose |
|------|---------|
| `website/next.config.ts` | `images.formats`, `images.qualities` |
| `website/src/components/sections/hero.tsx` | Hero parallax + quality 82 |
| `website/src/components/sections/parallax-section.tsx` | Parallax + quality 80/85 |
| `website/src/components/gallery/gallery-grid.tsx` | Masonry gallery |
| `website/src/app/opengraph-image.tsx` | Social share preview image |

---

*Update this doc when image policy or performance targets change.*
