"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ArrowUpRight } from "lucide-react";
import { galleryCategoryMap, type GalleryCategoryId } from "@/lib/gallery";

export type LightboxPhoto = {
  src: string;
  width: number;
  height: number;
  title: string;
  description?: string;
  category?: GalleryCategoryId;
};

type LightboxProps = {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
  /** Hide the "Explore <category>" link (e.g. on a service page already in that category) */
  hideCategoryLink?: boolean;
};

export function Lightbox({
  photos,
  index,
  onClose,
  onIndex,
  hideCategoryLink = false,
}: LightboxProps) {
  const open = index !== null && index >= 0 && index < photos.length;

  const next = useCallback(() => {
    if (index !== null) onIndex((index + 1) % photos.length);
  }, [index, photos.length, onIndex]);

  const prev = useCallback(() => {
    if (index !== null) onIndex((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
  }, [open, onClose, next, prev]);

  const active = open ? photos[index] : null;
  const category = active?.category ? galleryCategoryMap[active.category] : null;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80) next();
    else if (info.offset.x > 80) prev();
  };

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-120 flex items-center justify-center bg-black/92 p-4 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/15"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute left-1/2 top-5 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
            {(index ?? 0) + 1} / {photos.length}
          </div>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/15 sm:left-6"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/15 sm:right-6"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <motion.div
            key={active.src}
            className="flex max-h-full w-full max-w-5xl flex-col items-center"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={onDragEnd}
          >
            <Image
              src={active.src}
              alt={active.title}
              width={active.width}
              height={active.height}
              sizes="100vw"
              priority
              draggable={false}
              className="max-h-[72vh] w-auto rounded-xl object-contain shadow-2xl select-none"
            />

            <div className="mt-4 w-full max-w-2xl text-center">
              {category && (
                <div className="flex justify-center">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                    style={{ backgroundColor: category.color, color: "#fff" }}
                  >
                    <span className="h-2 w-2 rounded-full bg-white" />
                    {category.label}
                  </span>
                </div>
              )}
              <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">
                {active.title}
              </h3>
              {active.description && (
                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                  {active.description}
                </p>
              )}
              {category && !hideCategoryLink && (
                <Link
                  href={category.href}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 transition hover:underline"
                  style={{ color: category.color }}
                >
                  Explore {category.label}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
