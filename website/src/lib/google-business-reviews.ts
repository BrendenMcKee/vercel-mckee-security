import {
  filterFiveStarReviews,
  googleBusiness,
  type GoogleReview,
} from "@/lib/reviews";

type GbpReview = {
  reviewId?: string;
  name?: string;
  reviewer?: { displayName?: string };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
};

type GbpListResponse = {
  reviews?: GbpReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
};

function formatRelativeTime(iso?: string): string {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function mapGbpReview(review: GbpReview, index: number): GoogleReview | null {
  if (review.starRating !== "FIVE") return null;

  const publishTime = review.updateTime ?? review.createTime;

  return {
    id: review.reviewId ?? review.name ?? String(index),
    author: review.reviewer?.displayName ?? "Google User",
    rating: 5,
    text: review.comment?.trim() || "Left a 5-star rating on Google.",
    relativeTime: formatRelativeTime(publishTime),
    publishTime,
  };
}

async function getBusinessProfileAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_BUSINESS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

function getBusinessProfileParent(): string | null {
  const locationName = process.env.GOOGLE_BUSINESS_LOCATION_NAME?.trim();
  if (locationName) {
    return locationName.startsWith("accounts/")
      ? locationName
      : `accounts/${locationName}`;
  }

  const accountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID?.trim();
  const locationId = process.env.GOOGLE_BUSINESS_LOCATION_ID?.trim();
  if (!accountId || !locationId) return null;

  return `accounts/${accountId}/locations/${locationId}`;
}

/** Paginated Google Business Profile reviews (business owner OAuth). */
export async function fetchAllGoogleBusinessReviews(): Promise<{
  reviews: GoogleReview[];
  rating: number;
  reviewCount: number;
} | null> {
  const parent = getBusinessProfileParent();
  const accessToken = await getBusinessProfileAccessToken();
  if (!parent || !accessToken) return null;

  const collected: GbpReview[] = [];
  let pageToken: string | undefined;
  let averageRating = googleBusiness.rating;
  let totalReviewCount = googleBusiness.reviewCount;

  do {
    const url = new URL(
      `https://mybusiness.googleapis.com/v4/${parent}/reviews`,
    );
    url.searchParams.set("pageSize", "50");
    url.searchParams.set("orderBy", "updateTime desc");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as GbpListResponse;
    if (data.reviews?.length) collected.push(...data.reviews);
    averageRating = data.averageRating ?? averageRating;
    totalReviewCount = data.totalReviewCount ?? totalReviewCount;
    pageToken = data.nextPageToken;
  } while (pageToken);

  const mapped = collected
    .map(mapGbpReview)
    .filter((review): review is GoogleReview => review !== null);

  if (!mapped.length && totalReviewCount === 0) return null;

  return {
    reviews: filterFiveStarReviews(mapped),
    rating: averageRating,
    reviewCount: totalReviewCount,
  };
}

export function isGoogleBusinessProfileConfigured(): boolean {
  return Boolean(
    getBusinessProfileParent() &&
      process.env.GOOGLE_BUSINESS_CLIENT_ID &&
      process.env.GOOGLE_BUSINESS_CLIENT_SECRET &&
      process.env.GOOGLE_BUSINESS_REFRESH_TOKEN,
  );
}
