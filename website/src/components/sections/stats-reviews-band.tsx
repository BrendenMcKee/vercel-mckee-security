"use client";

import { BannerStatsSection } from "@/components/sections/banner-stats-section";
import { BrandedStatsBackground } from "@/components/sections/branded-stats-background";
import { ElfsightGoogleReviews } from "@/components/sections/elfsight-google-reviews";

/**
 * Stats + reviews share one branded backdrop and red top/bottom rules.
 *
 * This is the only place reviews are rendered, so it covers both pages that show them:
 * the homepage and /gallery. Reviews come from our paid Elfsight widget; the custom
 * carousel we built is archived in src/legacy/custom-google-reviews/ (see its README to
 * swap back — it is a one-line change here).
 */
export function StatsReviewsBand() {
  return (
    <section className="relative z-20 overflow-hidden border-y-4 border-primary bg-[#0a0a0a]">
      <BrandedStatsBackground />
      <div className="relative z-10">
        <BannerStatsSection embedded />
        <ElfsightGoogleReviews />
      </div>
    </section>
  );
}
