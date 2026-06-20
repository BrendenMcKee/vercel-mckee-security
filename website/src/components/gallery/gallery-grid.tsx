"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ArrowUpRight } from "lucide-react";
import {
  galleryCategories,
  galleryCategoryMap,
  galleryImages,
  type GalleryCategoryId,
} from "@/lib/gallery";

type Filter = GalleryCategoryId | "all";

function TagChip({
  categoryId,
  className = "",
  solid = false,
}: {
  categoryId: GalleryCategoryId;
  className?: string;
  solid?: boolean;
}) {
  const category = galleryCategoryMap[categoryId];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur-sm ${className}`}
      style={
        solid
          ? { backgroundColor: category.color, color: "#fff" }
          : { backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }
      }
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: solid ? "#fff" : category.color }}
      />
      {category.label}
    </span>
  );
}

export function GalleryGrid() {
  const [filter, setFilter] = useState<Filter>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? galleryImages
        : galleryImages.filter((img) => img.category === filter),
    [filter],
  );

  // Reset the lightbox if the filtered set changes underneath it.
  useEffect(() => {
    setLightboxIndex(null);
  }, [filter]);

  const close = useCallback(() => setLightboxIndex(null), []);
  const next = useCallback(
    () =>
      setLightboxIndex((i) =>
        i === null ? i : (i + 1) % filtered.length,
      ),
    [filtered.length],
  );
  const prev = useCallback(
    () =>
      setLightboxIndex((i) =>
        i === null ? i : (i - 1 + filtered.length) % filtered.length,
      ),
    [filtered.length],
  );

  // Keyboard navigation + body scroll lock while the lightbox is open.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxIndex, close, next, prev]);

  const active = lightboxIndex === null ? null : filtered[lightboxIndex];

  return (
    <>
      {/* Color-coded filter bar */}
      <div className="sticky top-20 z-30 mb-10">
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#0a0a0a]/80 px-3 py-3 backdrop-blur-md">
          <FilterPill
            label="All Work"
            active={filter === "all"}
            onClick={() => setFilter("all")}
            count={galleryImages.length}
          />
          {galleryCategories.map((cat) => (
            <FilterPill
              key={cat.id}
              label={cat.label}
              color={cat.color}
              active={filter === cat.id}
              onClick={() => setFilter(cat.id)}
              count={galleryImages.filter((i) => i.category === cat.id).length}
            />
          ))}
        </div>
      </div>

      {/* Masonry mosaic */}
      <div className="columns-1 gap-4 [column-fill:balance] sm:columns-2 lg:columns-3 xl:columns-4">
        {filtered.map((img, index) => {
          const category = galleryCategoryMap[img.category];
          return (
            <button
              key={img.src}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-white/10 bg-black text-left"
              aria-label={`View ${img.title}`}
            >
              <Image
                src={img.src}
                alt={img.title}
                width={img.width}
                height={img.height}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                className="h-auto w-full transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.04]"
              />

              {/* Always-on gradient + title so each tile is identifiable */}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/85 via-black/15 to-black/10 transition-opacity duration-300 group-hover:from-black/90" />

              {/* Color-coded tag (top-left) */}
              <div className="absolute left-3 top-3 transition-transform duration-300 group-hover:-translate-y-0.5">
                <TagChip categoryId={img.category} solid />
              </div>

              {/* Caption */}
              <div className="absolute inset-x-0 bottom-0 p-3.5">
                <h3 className="text-sm font-semibold leading-snug text-white drop-shadow sm:text-base">
                  {img.title}
                </h3>
                <p className="mt-1 max-h-0 overflow-hidden text-xs leading-relaxed text-white/75 opacity-0 transition-all duration-300 group-hover:max-h-24 group-hover:opacity-100">
                  {img.description}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-white/0 transition-colors duration-300 group-hover:text-white/80">
                  Click to expand <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>

              {/* Hover ring in the category color */}
              <span
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ boxShadow: `inset 0 0 0 2px ${category.color}` }}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-120 flex items-center justify-center bg-black/92 p-4 backdrop-blur-sm sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
          >
            {/* Close */}
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/15"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Counter */}
            <div className="absolute left-1/2 top-5 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              {(lightboxIndex ?? 0) + 1} / {filtered.length}
            </div>

            {/* Prev */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/15 sm:left-6"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Next */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/15 sm:right-6"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <motion.div
              key={active.src}
              className="flex max-h-full w-full max-w-5xl flex-col items-center"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex min-h-0 flex-1 items-center justify-center">
                <Image
                  src={active.src}
                  alt={active.title}
                  width={active.width}
                  height={active.height}
                  sizes="100vw"
                  priority
                  className="max-h-[72vh] w-auto rounded-xl object-contain shadow-2xl"
                />
              </div>

              <div className="mt-4 w-full max-w-2xl text-center">
                <div className="flex justify-center">
                  <TagChip categoryId={active.category} solid />
                </div>
                <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">
                  {active.title}
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                  {active.description}
                </p>
                <Link
                  href={galleryCategoryMap[active.category].href}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white/85 underline-offset-4 transition hover:text-white hover:underline"
                  style={{ color: galleryCategoryMap[active.category].color }}
                >
                  Explore {galleryCategoryMap[active.category].label}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FilterPill({
  label,
  color,
  active,
  onClick,
  count,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors duration-200"
      style={
        active
          ? {
              backgroundColor: color ?? "#ffffff",
              borderColor: color ?? "#ffffff",
              color: color ? "#fff" : "#0a0a0a",
            }
          : {
              backgroundColor: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.72)",
            }
      }
    >
      {color && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: active ? "#fff" : color }}
        />
      )}
      {label}
      <span className={active ? "opacity-80" : "opacity-50"}>{count}</span>
    </button>
  );
}
