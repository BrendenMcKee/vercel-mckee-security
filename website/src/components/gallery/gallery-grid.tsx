"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import {
  galleryCategories,
  galleryCategoryMap,
  galleryImages,
  type GalleryCategoryId,
} from "@/lib/gallery";
import { Lightbox } from "@/components/gallery/lightbox";

type Filter = GalleryCategoryId | "all";

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
  const [hovered, setHovered] = useState(false);

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
      className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors duration-200"
      style={style}
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
