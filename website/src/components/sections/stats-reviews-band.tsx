"use client";

import { BannerStatsSection } from "@/components/sections/banner-stats-section";
import { BrandedStatsBackground } from "@/components/sections/branded-stats-background";
import { GoogleReviewsSection } from "@/components/sections/google-reviews";

/** Stats + reviews share one branded backdrop and red top/bottom rules */
export function StatsReviewsBand() {
  return (
    <section className="relative z-20 overflow-hidden border-y-4 border-primary">
      <BrandedStatsBackground />
      <div className="relative z-10">
        <BannerStatsSection embedded />
        <GoogleReviewsSection embedded />
      </div>
    </section>
  );
}
