import { NextResponse } from "next/server";
import {
  fallbackReviews,
  filterFiveStarReviews,
  googleBusiness,
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
} | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
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
  };
}

export async function GET() {
  try {
    const live = await fetchGoogleReviews();
    const reviews = live?.reviews ?? filterFiveStarReviews(fallbackReviews);

    return NextResponse.json({
      business: {
        name: googleBusiness.name,
        mapsUrl: googleBusiness.mapsUrl,
        rating: live?.rating ?? googleBusiness.rating,
        reviewCount: live?.reviewCount ?? googleBusiness.reviewCount,
        aiSummaryBullets: googleBusiness.aiSummaryBullets,
      },
      reviews,
      source: live ? "google" : "fallback",
    });
  } catch {
    return NextResponse.json({
      business: {
        name: googleBusiness.name,
        mapsUrl: googleBusiness.mapsUrl,
        rating: googleBusiness.rating,
        reviewCount: googleBusiness.reviewCount,
        aiSummaryBullets: googleBusiness.aiSummaryBullets,
      },
      reviews: filterFiveStarReviews(fallbackReviews),
      source: "fallback",
    });
  }
}
