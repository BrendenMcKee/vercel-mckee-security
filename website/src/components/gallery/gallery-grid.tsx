"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import {
  galleryCategories,
  galleryCategoryMap,
  galleryImages,
  type GalleryCategoryId,
} from "@/lib/gallery";
import { Lightbox } from "@/components/gallery/lightbox";
import { cn } from "@/lib/utils";

type Filter = GalleryCategoryId | "all";

/** Mobile header height — keep in sync with sticky top offset below */
const MOBILE_HEADER_OFFSET = "100px";

export function GalleryGrid() {
  const [filter, setFilter] = useState<Filter>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const stickySentinelRef = useRef<HTMLDivElement>(null);

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

  // When the sentinel scrolls past the sticky line, collapse filters for more gallery space.
  useEffect(() => {
    const sentinel = stickySentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsCompact(!entry.isIntersecting),
      {
        threshold: 0,
        rootMargin: `-${MOBILE_HEADER_OFFSET} 0px 0px 0px`,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel sits just above the bar; when it leaves the sticky zone, filters compact */}
      <div
        ref={stickySentinelRef}
        className="pointer-events-none h-px w-full lg:hidden"
        aria-hidden="true"
      />

      <div className="sticky top-25 z-40 mb-6 lg:top-36 lg:mb-10">
        <div
          className={cn(
            "border border-white/10 bg-[#0a0a0a]/90 backdrop-blur-md transition-[border-radius,padding] duration-300 ease-out sm:rounded-2xl sm:px-3 sm:py-3",
            isCompact
              ? "rounded-b-xl rounded-t-none px-2 py-2"
              : "rounded-xl px-2.5 py-2.5",
          )}
        >
          <div
            className={cn(
              "transition-[gap] duration-300 ease-out sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-2",
              isCompact
                ? "grid grid-cols-4 gap-1.5"
                : "flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2",
            )}
          >
            <FilterPill
              label="All Work"
              shortLabel="All"
              compact={isCompact}
              active={filter === "all"}
              onClick={() => setFilter("all")}
              count={galleryImages.length}
            />
            {galleryCategories.map((cat) => (
              <FilterPill
                key={cat.id}
                label={cat.label}
                expandedLabel={
                  cat.id === "audio-video" ? "Audio & Video" : undefined
                }
                shortLabel={
                  cat.id === "audio-video"
                    ? "A/V"
                    : cat.id === "team"
                      ? "Team"
                      : cat.id === "networking"
                        ? "Net"
                        : undefined
                }
                color={cat.color}
                compact={isCompact}
                active={filter === cat.id}
                onClick={() => setFilter(cat.id)}
                count={galleryImages.filter((i) => i.category === cat.id).length}
              />
            ))}
          </div>
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
              className="group relative mb-4 block w-full cursor-pointer break-inside-avoid overflow-hidden rounded-2xl border border-white/10 bg-black text-left"
              aria-label={`View ${img.title}`}
            >
              <Image
                src={img.src}
                alt={img.title}
                width={img.width}
                height={img.height}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                className="h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              />

              {/* Always-on gradient + title so each tile is identifiable */}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/85 via-black/15 to-black/10 transition-opacity duration-300 group-hover:from-black/90" />

              {/* Color-coded tag (top-left) */}
              <div className="absolute left-3 top-3 transition-transform duration-300 group-hover:-translate-y-0.5">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                  style={{ backgroundColor: category.color, color: "#fff" }}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-white" />
                  {category.label}
                </span>
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

      <Lightbox
        photos={filtered}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndex={setLightboxIndex}
      />
    </>
  );
}

function FilterPill({
  label,
  shortLabel,
  expandedLabel,
  color,
  active,
  compact,
  onClick,
  count,
}: {
  label: string;
  shortLabel?: string;
  expandedLabel?: string;
  color?: string;
  active: boolean;
  compact: boolean;
  onClick: () => void;
  count: number;
}) {
  const [hovered, setHovered] = useState(false);
  const mobileLabel = compact
    ? (shortLabel ?? label)
    : (expandedLabel ?? label);

  // active = definitive solid color; hovered = faint preview of that color;
  // resting = neutral translucent white.
  const style: React.CSSProperties = active
    ? {
        backgroundColor: color ?? "#ffffff",
        borderColor: color ?? "#ffffff",
        color: color ? "#fff" : "#0a0a0a",
      }
    : hovered
      ? color
        ? { backgroundColor: `${color}26`, borderColor: `${color}80`, color: "#fff" }
        : {
            backgroundColor: "rgba(255,255,255,0.12)",
            borderColor: "rgba(255,255,255,0.30)",
            color: "#fff",
          }
      : {
          backgroundColor: "rgba(255,255,255,0.04)",
          borderColor: "rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.72)",
        };

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "inline-flex min-w-0 cursor-pointer items-center justify-center rounded-full border font-bold uppercase transition-all duration-300 ease-out sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm sm:tracking-wide sm:whitespace-nowrap",
        compact
          ? "w-full gap-0.5 px-1.5 py-1 text-[10px] leading-none tracking-wide whitespace-nowrap"
          : "w-auto max-w-full shrink-0 gap-1 px-2.5 py-1.5 text-[10px] leading-none tracking-tight whitespace-nowrap",
      )}
      style={style}
    >
      {color && (
        <span
          className={cn(
            "shrink-0 rounded-full sm:h-2.5 sm:w-2.5",
            compact ? "h-1.5 w-1.5" : "h-2 w-2",
          )}
          style={{ backgroundColor: active ? "#fff" : color }}
        />
      )}
      <span className="sm:hidden">{mobileLabel}</span>
      <span className="hidden sm:inline">{label}</span>
      <span className={active ? "opacity-80" : "opacity-50"}>{count}</span>
    </button>
  );
}
