# Archived: the custom Google reviews carousel

This folder holds the reviews system we built ourselves, which ran on the homepage and
the gallery page until **2026-08-06**. It is dead code on purpose: nothing imports it,
so it is never bundled and never reaches the Vercel deployment. It is kept here so the
custom system can be restored in a few minutes if we ever want it back.

Reviews are now served by the paid **Elfsight** Google Reviews widget — see
`website/src/components/sections/elfsight-google-reviews.tsx`.

## Why we moved off it

The custom carousel read the Google **Places API (New)** `places/{placeId}` endpoint.
That endpoint only ever returns a small sample of reviews (roughly five, chosen by
Google as "most relevant"), so most of the real reviews could never be shown. Elfsight
pulls the full set from the Google Business Profile, and we already pay for it
(~$60/year), so it wins on coverage for no extra cost.

## What is in here

| File | Was | Notes |
|---|---|---|
| `google-reviews-section.tsx` | `src/components/sections/google-reviews.tsx` | The whole widget: rating header, AI-summary card, review carousel, "Leave us a review" CTA. Exports `GoogleReviewsSection`. |
| `reviews.ts` | `src/lib/reviews.ts` | Business constants, Google read/write review link builders, Place ID lookup, hardcoded fallback reviews. |
| `reviews-api-route.ts` | `src/app/api/reviews/route.ts` | Server-side Places API reader with 24h revalidation and fallback. Deliberately outside `src/app` so it is not a live route. |

The imports were changed from `@/lib/reviews` to `./reviews` when the files moved.
Everything else is untouched, and it still type-checks as part of `next build`, so it
will not silently rot.

## How to revert to the custom system

1. Move the three files back to the paths in the table above, and change the two
   `./reviews` imports back to `@/lib/reviews`.
2. In `src/components/sections/stats-reviews-band.tsx`, swap `ElfsightGoogleReviews`
   back to `<GoogleReviewsSection embedded />`. That one file covers both pages that
   show reviews (homepage and `/gallery`).
3. Delete the `ARCHIVED` header comments from the three files.
4. Confirm these Vercel env vars are still set (they were left in place, see
   `dns-migration-vercel.md`): `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID`,
   `GOOGLE_REVIEW_URL`, `GOOGLE_REVIEWS_URL`. Without the API key the carousel still
   renders, but only the five hardcoded `fallbackReviews`.

Optionally remove `elfsight-google-reviews.tsx` and cancel the Elfsight subscription.

## If you want both

`GoogleReviewsSection` and `ElfsightGoogleReviews` are independent and can be rendered
side by side, but they would both claim to be the site's Google rating, so pick one.
