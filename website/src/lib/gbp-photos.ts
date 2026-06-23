import { resolveGooglePlaceId } from "@/lib/reviews";

export type GbpPhotoMeta = {
  index: number;
  width?: number;
  height?: number;
  authors?: string[];
  googleMapsUri?: string;
  downloadPath: string;
};

type PlacePhoto = {
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: Array<{ displayName?: string }>;
  googleMapsUri?: string;
};

async function getPlacePhotos() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId =
    process.env.GOOGLE_PLACE_ID ||
    (apiKey ? await resolveGooglePlaceId(apiKey) : null);

  if (!apiKey || !placeId) return null;

  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "displayName,photos,googleMapsUri",
    },
    next: { revalidate: 86400 },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    displayName?: { text?: string };
    googleMapsUri?: string;
    photos?: PlacePhoto[];
  };

  return { apiKey, placeId, data };
}

export async function fetchGbpPhotoCatalog() {
  const result = await getPlacePhotos();
  if (!result) return null;

  const { placeId, data } = result;
  const photos: GbpPhotoMeta[] = (data.photos ?? []).map((photo, index) => ({
    index,
    width: photo.widthPx,
    height: photo.heightPx,
    authors: photo.authorAttributions?.map((a) => a.displayName).filter(Boolean) as
      | string[]
      | undefined,
    googleMapsUri: photo.googleMapsUri,
    downloadPath: `/api/gbp-photos/${index}`,
  }));

  return {
    name: data.displayName?.text,
    placeId,
    mapsUri: data.googleMapsUri,
    photoCount: photos.length,
    photos,
  };
}

export async function fetchGbpPhotoBytes(index: number) {
  const result = await getPlacePhotos();
  if (!result) return null;

  const photo = result.data.photos?.[index];
  if (!photo?.name) return null;

  const mediaRes = await fetch(
    `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=1200`,
    {
      headers: { "X-Goog-Api-Key": result.apiKey },
      next: { revalidate: 86400 },
    },
  );

  if (!mediaRes.ok) return null;

  return {
    bytes: await mediaRes.arrayBuffer(),
    contentType: mediaRes.headers.get("content-type") ?? "image/jpeg",
    photo,
  };
}
