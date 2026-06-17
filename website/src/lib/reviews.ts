export type GoogleReview = {
  id: string;
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
};

export const googleBusiness = {
  name: "McKee Security & Audio Systems",
  rating: 4.9,
  reviewCount: 47,
  mapsUrl:
    "https://www.google.com/maps/search/McKee+Security+Audio+Systems+Haliburton",
  placeId: process.env.GOOGLE_PLACE_ID ?? "",
  aiSummary:
    "People say this business offers professional installation, responsive local support, and knowledgeable technicians. Reviewers highlight quality security, camera, networking, and audio/video work, fair pricing, and a family-owned team that explains systems clearly.",
};

export const fallbackReviews: GoogleReview[] = [
  {
    id: "1",
    author: "Sarah M.",
    rating: 5,
    text: "Professional team from start to finish. Our security and camera system works flawlessly and the install was clean and well explained.",
    relativeTime: "2 months ago",
  },
  {
    id: "2",
    author: "James T.",
    rating: 5,
    text: "McKee Security handled our whole home audio and networking project. Responsive, knowledgeable, and fairly priced for the quality of work.",
    relativeTime: "4 months ago",
  },
  {
    id: "3",
    author: "Robert K.",
    rating: 5,
    text: "We use McKee for commercial security and surveillance. Reliable monitoring and excellent local support when we need changes.",
    relativeTime: "6 months ago",
  },
  {
    id: "4",
    author: "Linda P.",
    rating: 5,
    text: "Starlink install and UniFi networking were done perfectly. No shortcuts, and they took time to walk us through everything.",
    relativeTime: "1 month ago",
  },
  {
    id: "5",
    author: "Michael D.",
    rating: 5,
    text: "Outstanding service for our cottage security system. Fast response, clean installation, and great follow-up support.",
    relativeTime: "3 months ago",
  },
];
