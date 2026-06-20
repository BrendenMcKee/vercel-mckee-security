import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { StatsReviewsBand } from "@/components/sections/stats-reviews-band";
import { ServiceQuoteSection } from "@/components/sections/service-quote-section";

export const metadata: Metadata = {
  title: "Project Gallery",
  description:
    "Browse real McKee Security installations across the Haliburton region: security, camera surveillance, networking, audio/video, and Starlink, plus the team behind the work.",
};

export default function GalleryPage() {
  return (
    <>
      <Hero
        eyebrow="Our Work"
        title="Project Gallery"
        subtitle="Real installs by our own crew across cottage country. Filter by service, then tap any photo to take a closer look."
        image="/images/gallery/team-centex-rooftop-group.jpg"
        objectPosition="50% 38%"
        imageScale={1.05}
        compact
        overlay="dark"
      />

      <section className="bg-background py-16 lg:py-20">
        <div className="mx-auto max-w-375 px-4 sm:px-6">
          <GalleryGrid />
        </div>
      </section>

      <StatsReviewsBand />

      <ServiceQuoteSection
        title="Like What You See?"
        description="Tell us about your property and the work you're planning. We'll help you design the right system and book a professional installation."
      />
    </>
  );
}
