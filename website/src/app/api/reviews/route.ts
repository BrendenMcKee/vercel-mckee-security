import { NextResponse } from "next/server";
import {
  fallbackReviews,
  filterFiveStarReviews,
  getGoogleReadReviewsUrl,
  getGoogleWriteReviewUrl,
  googleBusiness,
  resolveGooglePlaceId,
  type GoogleReview,
} from "@/lib/reviews";

export const revalidate = 86400;

type LivePlaceData = {
  rating?: number;
  userRatingCount?: number;
  reviews?: Array<{
    name?: string;
    rating?: number;
    text?: { text?: string };
    relativePublishTimeDescription?: string;
    publishTime?: string;
    authorAttribution?: { displayName?: string };
  }>;
};

async function fetchGoogleReviews(): Promise<{
  reviews: GoogleReview[];
  rating: number;
  reviewCount: number;
  placeId: string | null;
} | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const configuredPlaceId = process.env.GOOGLE_PLACE_ID;
  const placeId =
    configuredPlaceId || (apiKey ? await resolveGooglePlaceId(apiKey) : null);
  if (!apiKey || !placeId) return null;

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "reviews,rating,userRatingCount,displayName,reviews.publishTime",
      },
      next: { revalidate: 86400 },
    },
  );

  if (!res.ok) return null;
  const data = (await res.json()) as LivePlaceData;
  if (!data.reviews?.length) return null;

  const mapped = data.reviews.map((r, i) => ({
    id: r.name ?? String(i),
    author: r.authorAttribution?.displayName ?? "Google User",
    rating: r.rating ?? 5,
    text: r.text?.text ?? "",
    relativeTime: r.relativePublishTimeDescription ?? "",
    publishTime: r.publishTime,
  }));

  return {
    reviews: filterFiveStarReviews(mapped),
    rating: data.rating ?? googleBusiness.rating,
    reviewCount: data.userRatingCount ?? googleBusiness.reviewCount,
    placeId,
  };
}

function buildBusinessLinks(placeId?: string | null) {
  const id = placeId ?? googleBusiness.placeId ?? undefined;
  return {
    mapsUrl: getGoogleReadReviewsUrl(),
    writeReviewUrl: getGoogleWriteReviewUrl(id),
    placeId: id ?? "",
  };
}

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const live = await fetchGoogleReviews();
    const resolvedPlaceId =
      live?.placeId ||
      googleBusiness.placeId ||
      (apiKey ? await resolveGooglePlaceId(apiKey) : null);
    const links = buildBusinessLinks(resolvedPlaceId);
    const reviews = live?.reviews ?? filterFiveStarReviews(fallbackReviews);

    return NextResponse.json({
      business: {
        name: googleBusiness.name,
        ...links,
        rating: live?.rating ?? googleBusiness.rating,
        reviewCount: live?.reviewCount ?? googleBusiness.reviewCount,
        aiSummaryBullets: googleBusiness.aiSummaryBullets,
      },
      reviews,
      source: live ? "google" : "fallback",
    });
  } catch {
    const links = buildBusinessLinks();
    return NextResponse.json({
      business: {
        name: googleBusiness.name,
        ...links,
        rating: googleBusiness.rating,
        reviewCount: googleBusiness.reviewCount,
        aiSummaryBullets: googleBusiness.aiSummaryBullets,
      },
      reviews: filterFiveStarReviews(fallbackReviews),
      source: "fallback",
    });
  }
}
