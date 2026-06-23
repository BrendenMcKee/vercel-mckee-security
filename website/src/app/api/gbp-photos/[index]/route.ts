import { NextResponse } from "next/server";
import { fetchGbpPhotoBytes } from "@/lib/gbp-photos";

type RouteContext = {
  params: Promise<{ index: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { index: indexRaw } = await context.params;
  const index = Number.parseInt(indexRaw, 10);
  if (!Number.isFinite(index) || index < 0) {
    return NextResponse.json({ error: "Invalid photo index." }, { status: 400 });
  }

  const photo = await fetchGbpPhotoBytes(index);
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  return new NextResponse(photo.bytes, {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
