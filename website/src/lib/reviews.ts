export type GoogleReview = {
  id: string;
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime?: string;
};

export const googleBusiness = {
  name: "McKee Security & Audio Systems",
  rating: 4.9,
  reviewCount: 47,
  mapsUrl:
    "https://www.google.com/maps/search/McKee+Security+Audio+Systems+Haliburton",
  placeId: process.env.GOOGLE_PLACE_ID ?? "",
  aiSummaryBullets: [
    "Professional installation and responsive local support",
    "Knowledgeable technicians who explain systems clearly",
    "Quality security, camera, networking, and audio/video work",
    "Fair pricing from a trusted family-owned team",
  ],
};

export const fallbackReviews: GoogleReview[] = [
  {
    id: "1",
    author: "Sarah M.",
    rating: 5,
    text: "Professional team from start to finish. Our security and camera system works flawlessly and the install was clean and well explained.",
    relativeTime: "2 months ago",
    publishTime: "2026-04-01T00:00:00Z",
  },
  {
    id: "2",
    author: "James T.",
    rating: 5,
    text: "McKee Security handled our whole home audio and networking project. Responsive, knowledgeable, and fairly priced for the quality of work.",
    relativeTime: "4 months ago",
    publishTime: "2026-02-01T00:00:00Z",
  },
  {
    id: "3",
    author: "Robert K.",
    rating: 5,
    text: "We use McKee for commercial security and surveillance. Reliable monitoring and excellent local support when we need changes.",
    relativeTime: "6 months ago",
    publishTime: "2025-12-01T00:00:00Z",
  },
  {
    id: "4",
    author: "Linda P.",
    rating: 5,
    text: "Starlink install and UniFi networking were done perfectly. No shortcuts, and they took time to walk us through everything.",
    relativeTime: "1 month ago",
    publishTime: "2026-05-01T00:00:00Z",
  },
  {
    id: "5",
    author: "Michael D.",
    rating: 5,
    text: "Outstanding service for our cottage security system. Fast response, clean installation, and great follow-up support.",
    relativeTime: "3 months ago",
    publishTime: "2026-03-01T00:00:00Z",
  },
];

export function filterFiveStarReviews(reviews: GoogleReview[]) {
  return reviews
    .filter((review) => review.rating === 5)
    .sort((a, b) => {
      if (a.publishTime && b.publishTime) {
        return b.publishTime.localeCompare(a.publishTime);
      }
      return 0;
    });
}
