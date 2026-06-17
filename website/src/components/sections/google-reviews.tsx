"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { GoogleReview } from "@/lib/reviews";

type ReviewsPayload = {
  business: {
    name: string;
    rating: number;
    reviewCount: number;
    mapsUrl: string;
  };
  reviews: GoogleReview[];
};

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < count ? "fill-yellow-400 text-yellow-400" : "text-white/20"}`}
        />
      ))}
    </div>
  );
}

export function GoogleReviewsSection() {
  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then(setData)
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!data?.reviews.length) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % data.reviews.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [data?.reviews.length]);

  if (!data?.reviews.length) return null;

  const review = data.reviews[index];

  return (
    <section className="bg-[#111111] py-6 md:py-8">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="mb-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-white/50">
              Google Reviews
            </p>
            <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
              <Stars count={Math.round(data.business.rating)} />
              <span className="text-sm font-bold text-white">
                {data.business.rating.toFixed(1)}
              </span>
              <span className="text-sm text-white/50">
                ({data.business.reviewCount}+ reviews)
              </span>
            </div>
          </div>
          <a
            href={data.business.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-secondary hover:text-white"
          >
            View on Google <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] px-6 py-8 md:px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={review.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35 }}
              className="mx-auto max-w-3xl text-center"
            >
              <Stars count={review.rating} />
              <p className="mt-4 text-base leading-relaxed text-white/85 md:text-lg">
                &ldquo;{review.text}&rdquo;
              </p>
              <p className="mt-4 text-sm font-bold text-white">{review.author}</p>
              <p className="text-xs text-white/45">{review.relativeTime}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="Previous review"
              onClick={() =>
                setIndex(
                  (i) => (i - 1 + data.reviews.length) % data.reviews.length,
                )
              }
              className="rounded-full border border-white/15 p-2 text-white/70 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-1.5">
              {data.reviews.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to review ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-2 w-2 rounded-full transition ${i === index ? "bg-primary w-6" : "bg-white/25"}`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next review"
              onClick={() => setIndex((i) => (i + 1) % data.reviews.length)}
              className="rounded-full border border-white/15 p-2 text-white/70 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
