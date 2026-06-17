import { NextResponse } from "next/server";
import {
  fallbackReviews,
  googleBusiness,
  type GoogleReview,
} from "@/lib/reviews";

export const revalidate = 86400;

async function fetchGoogleReviews(): Promise<GoogleReview[] | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) return null;

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "reviews,rating,userRatingCount,displayName",
      },
      next: { revalidate: 86400 },
    },
  );

  if (!res.ok) return null;
  const data = await res.json();

  if (!data.reviews?.length) return null;

  return data.reviews.slice(0, 8).map(
    (r: {
      name?: string;
      rating?: number;
      text?: { text?: string };
      relativePublishTimeDescription?: string;
      authorAttribution?: { displayName?: string };
    }, i: number) => ({
      id: r.name ?? String(i),
      author: r.authorAttribution?.displayName ?? "Google User",
      rating: r.rating ?? 5,
      text: r.text?.text ?? "",
      relativeTime: r.relativePublishTimeDescription ?? "",
    }),
  );
}

export async function GET() {
  try {
    const live = await fetchGoogleReviews();
    const reviews = live ?? fallbackReviews;

    return NextResponse.json({
      business: googleBusiness,
      reviews,
      source: live ? "google" : "fallback",
    });
  } catch {
    return NextResponse.json({
      business: googleBusiness,
      reviews: fallbackReviews,
      source: "fallback",
    });
  }
}
