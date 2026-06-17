"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { GoogleReview } from "@/lib/reviews";
import {
  fallbackReviews,
  filterFiveStarReviews,
  googleBusiness,
} from "@/lib/reviews";
import { BrandedStatsBackground } from "@/components/sections/branded-stats-background";
import { cn } from "@/lib/utils";

type ReviewsPayload = {
  business: {
    name: string;
    rating: number;
    reviewCount: number;
    mapsUrl: string;
    aiSummaryBullets?: string[];
  };
  reviews: GoogleReview[];
};

const CARD_HEIGHT = "min-h-[248px]";

const defaultPayload: ReviewsPayload = {
  business: {
    name: googleBusiness.name,
    rating: googleBusiness.rating,
    reviewCount: googleBusiness.reviewCount,
    mapsUrl: googleBusiness.mapsUrl,
    aiSummaryBullets: googleBusiness.aiSummaryBullets,
  },
  reviews: filterFiveStarReviews(fallbackReviews),
};

function GoogleLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AiSummaryIcon() {
  return (
    <div
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4285F4]/20 via-[#9334E9]/15 to-[#EA4335]/10 ring-1 ring-white/10"
      aria-hidden
    >
      <Sparkles className="h-4 w-4 text-[#9ecbff]" strokeWidth={2} />
    </div>
  );
}

function VerifiedBadge() {
  return (
    <svg
      className="h-[18px] w-[18px] shrink-0"
      viewBox="0 -960 960 960"
      aria-label="Verified review"
      role="img"
    >
      <path
        fill="#4285F4"
        d="m344-60-76-128-144-32 14-148-98-126 98-126-14-148 144-32 76-128 136 58 136-58 76 128 144 32-14 148 98 126-98 126 14 148-144 32-76 128-136-58-136 58Z"
      />
      <path
        fill="#ffffff"
        d="M438-338l224-224-56-57-168 168-85-84-57 57 142 140z"
      />
    </svg>
  );
}

function StarRow({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`${dim} ${i < rating ? "text-[#FBBC04]" : "text-white/20"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function AiSummaryCard({
  bullets,
  reviewCount,
}: {
  bullets: string[];
  reviewCount: number;
}) {
  return (
    <article
      className={`flex ${CARD_HEIGHT} w-[280px] shrink-0 flex-col overflow-visible rounded-xl border border-[#6366f1]/25 bg-gradient-to-br from-[#1a1830] via-[#141824] to-[#101018] p-5 sm:w-[300px]`}
    >
      <div className="flex items-start gap-3">
        <AiSummaryIcon />
        <div className="min-w-0">
          <p className="bg-gradient-to-r from-[#c084fc] via-[#818cf8] to-[#60a5fa] bg-clip-text text-sm font-semibold text-transparent">
            AI-generated summary
          </p>
          <p className="mt-1 text-[11px] leading-snug text-white/45">
            Based on {reviewCount}+ Google reviews
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2.5 text-sm leading-snug text-white/80">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#4285F4]/20 text-[#8ab4f8]">
              <Check className="h-2.5 w-2.5 stroke-[3]" aria-hidden="true" />
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center gap-2 pt-4">
        <GoogleLogo className="h-4 w-4 opacity-90" />
        <span className="text-[11px] text-white/40">Summarized from Google reviews</span>
      </div>
    </article>
  );
}

function ReviewCard({ review }: { review: GoogleReview }) {
  const initial = review.author.charAt(0).toUpperCase();

  return (
    <article
      className={`flex ${CARD_HEIGHT} w-[280px] shrink-0 flex-col overflow-visible rounded-xl border border-white/10 bg-[#1a1a1a] p-5 sm:w-[300px]`}
    >
      <div className="flex items-start gap-3 overflow-visible">
        <div className="relative h-11 w-11 shrink-0 overflow-visible">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4285F4] text-sm font-bold text-white">
            {initial}
          </div>
          <div
            className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-[#1a1a1a]"
            aria-hidden="true"
          >
            <GoogleLogo className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-white">{review.author}</p>
            <VerifiedBadge />
          </div>
          <p className="text-xs text-white/45">{review.relativeTime}</p>
        </div>
        <GoogleLogo className="h-4 w-4 shrink-0 opacity-80" />
      </div>
      <div className="mt-2.5">
        <StarRow rating={review.rating} size="sm" />
      </div>
      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-white/70 line-clamp-[6]">
        {review.text}
      </p>
    </article>
  );
}

export function GoogleReviewsSection({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<ReviewsPayload>(defaultPayload);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((payload: ReviewsPayload) => {
        setData({
          business: {
            ...defaultPayload.business,
            ...payload.business,
            aiSummaryBullets:
              payload.business?.aiSummaryBullets?.length
                ? payload.business.aiSummaryBullets
                : googleBusiness.aiSummaryBullets,
          },
          reviews: payload.reviews?.length
            ? filterFiveStarReviews(payload.reviews)
            : defaultPayload.reviews,
        });
      })
      .catch(() => null);
  }, []);

  const reviews = useMemo(
    () => (data.reviews.length ? data.reviews : defaultPayload.reviews),
    [data.reviews],
  );

  const aiBullets = useMemo(
    () =>
      data.business.aiSummaryBullets?.length
        ? data.business.aiSummaryBullets
        : googleBusiness.aiSummaryBullets,
    [data.business.aiSummaryBullets],
  );

  const syncScrollEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(maxScroll <= 1 || el.scrollLeft >= maxScroll - 1);
  }, []);

  useEffect(() => {
    syncScrollEdges();
    const el = scrollerRef.current;
    if (!el) return;

    el.addEventListener("scroll", syncScrollEdges, { passive: true });
    const ro = new ResizeObserver(syncScrollEdges);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", syncScrollEdges);
      ro.disconnect();
    };
  }, [reviews, aiBullets, syncScrollEdges]);

  const scroll = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 312, behavior: "smooth" });
    window.setTimeout(syncScrollEdges, 350);
  };

  const widget = (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]/95 shadow-xl shadow-black/40 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-4 border-b border-white/10 px-5 py-4 md:px-6 md:py-5">
          <GoogleLogo className="h-7 w-7 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2 md:gap-x-8">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
                Google Rating
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
                <span className="text-3xl font-bold text-white md:text-4xl">
                  {data.business.rating.toFixed(1)}
                </span>
                <StarRow rating={Math.round(data.business.rating)} size="md" />
              </div>
            </div>
            <a
              href={data.business.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="self-center text-xs text-[#8ab4f8] hover:underline md:text-sm"
            >
              Based on {data.business.reviewCount}+ reviews
            </a>
          </div>
        </div>

        <div className="relative bg-[#101010] px-3 py-4 md:px-5">
          <button
            type="button"
            aria-label="Previous reviews"
            aria-hidden={atStart}
            disabled={atStart}
            onClick={() => scroll(-1)}
            className={cn(
              "absolute left-1.5 top-1/2 z-10 hidden -translate-y-1/2 cursor-pointer rounded-full border border-white/15 bg-[#1a1a1a] p-2 shadow-lg transition-opacity duration-200 hover:bg-[#252525] md:flex",
              atStart && "pointer-events-none opacity-0",
            )}
          >
            <ChevronLeft className="h-5 w-5 text-white/80" />
          </button>
          <button
            type="button"
            aria-label="Next reviews"
            aria-hidden={atEnd}
            disabled={atEnd}
            onClick={() => scroll(1)}
            className={cn(
              "absolute right-1.5 top-1/2 z-10 hidden -translate-y-1/2 cursor-pointer rounded-full border border-white/15 bg-[#1a1a1a] p-2 shadow-lg transition-opacity duration-200 hover:bg-[#252525] md:flex",
              atEnd && "pointer-events-none opacity-0",
            )}
          >
            <ChevronRight className="h-5 w-5 text-white/80" />
          </button>

          <div
            ref={scrollerRef}
            className="flex items-stretch gap-3 overflow-x-auto overflow-y-visible scroll-smooth px-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <AiSummaryCard bullets={aiBullets} reviewCount={data.business.reviewCount} />
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-3.5 text-center md:px-6">
          <a
            href={data.business.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white/85 transition hover:border-white/25 hover:bg-[#222]"
          >
            <GoogleLogo className="h-4 w-4" />
            Review us on Google
          </a>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="px-0 pt-8 pb-12 md:pt-10 md:pb-14">{widget}</div>;
  }

  return (
    <section className="relative overflow-hidden pb-12 pt-4 md:pb-14 md:pt-6">
      <BrandedStatsBackground />
      <div className="relative z-10">{widget}</div>
    </section>
  );
}
