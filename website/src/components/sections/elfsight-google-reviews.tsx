"use client";

/*
 * Google reviews, served by our paid Elfsight widget. Two widgets are configured in
 * the Elfsight dashboard — a phone-shaped one and a wide one — and we mount whichever
 * matches the viewport. Elfsight pulls every review from the Google Business Profile,
 * which is the whole reason we use it.
 *
 * REVERT OPTION: we used to render our own reviews carousel here, fed by the Google
 * Places API through /api/reviews. It is archived, intact and still type-checked, in
 * src/legacy/custom-google-reviews/ — read that folder's README.md for the swap back.
 * It was retired because the Places API only ever returns about five "most relevant"
 * reviews, never the full set.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Elfsight app IDs, taken from the `elfsight-app-<id>` class in each widget's install
 * snippet. Find them again under Elfsight dashboard -> the widget -> Install.
 */
const WIDGET_IDS = {
  mobile: "cdefeb12-5f4d-4841-8788-8fdf4e8e97af",
  desktop: "0e6db085-594e-4cf0-9db8-2d7553f61b44",
} as const;

const PLATFORM_SRC = "https://elfsightcdn.com/platform.js";

/** Phone widget below Tailwind's `md`, wide widget at `md` and up. */
const MOBILE_QUERY = "(max-width: 767px)";

/**
 * The height each widget settles at, held open from the first server-rendered paint.
 * Elfsight takes ~1.3s to fetch and draw, and without this the sections below get shoved
 * down when it lands — measured at ~0.3 CLS, deep into Google's "poor" band. These are
 * plain media-query classes rather than JS so the space is reserved in the HTML; doing it
 * after hydration would only move the shift earlier, not remove it.
 *
 * `scripts/elfsight-reviews-check.mjs` fails if the rendered height drifts from these, so
 * changing the widget layout in the Elfsight dashboard will get caught here.
 */
const RESERVED_HEIGHT_CLASS = "min-h-[589px] md:min-h-[655px]";

type Variant = keyof typeof WIDGET_IDS;

/**
 * Page-lifetime fact, not per-component: platform.js is loaded once for the whole
 * document, so a later mount (after navigating between the two pages that show reviews)
 * needs to know it already failed.
 */
let platformFailed = false;

/**
 * Adds Elfsight's loader, or attaches to the one already in flight. It must not be
 * evaluated twice on a page, and it finds widget containers added later by itself, which
 * is what lets the widget survive client-side navigation.
 *
 * `onFailure` fires when the loader cannot load at all — an ad blocker, no connectivity,
 * a CDN outage. Note this is deliberately not a timeout: on a slow rural connection the
 * widget legitimately takes 10s or more to paint, so a timeout long enough to be safe
 * would be useless anyway, and a short one would drop the reserved space just before the
 * widget lands and cause the shift it exists to prevent.
 */
function loadPlatform(onFailure: () => void): () => void {
  if ("eapps" in window) return () => {};

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${PLATFORM_SRC}"]`,
  );
  if (existing) {
    existing.addEventListener("error", onFailure);
    return () => existing.removeEventListener("error", onFailure);
  }

  const script = document.createElement("script");
  script.src = PLATFORM_SRC;
  script.async = true;
  script.addEventListener("error", onFailure);
  document.body.appendChild(script);

  return () => script.removeEventListener("error", onFailure);
}

export function ElfsightGoogleReviews() {
  const [variant, setVariant] = useState<Variant | null>(null);
  // Don't reserve space again on a later page if the loader already failed this session.
  const [reserveHeight, setReserveHeight] = useState(!platformFailed);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const apply = () => setVariant(query.matches ? "mobile" : "desktop");

    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    // Wait for the container to be in the DOM before loading the platform, since it
    // scans for widget containers as soon as it runs.
    if (!variant) return;
    if (platformFailed) return;

    return loadPlatform(() => {
      platformFailed = true;
      setReserveHeight(false);
    });
  }, [variant]);

  return (
    <div className="px-0 pt-8 pb-12 md:pt-10 md:pb-14">
      <div
        className={cn(
          "mx-auto max-w-350 px-4 md:px-8",
          reserveHeight && RESERVED_HEIGHT_CLASS,
        )}
      >
        {variant ? (
          <div
            key={variant}
            className={`elfsight-app-${WIDGET_IDS[variant]}`}
            data-elfsight-app-lazy=""
          />
        ) : null}
      </div>
    </div>
  );
}
