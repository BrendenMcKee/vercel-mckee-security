"use client";

import Image from "next/image";
import { getServiceGallery } from "@/lib/service-galleries";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

export function ServiceGallery({ slug }: { slug: string }) {
  const gallery = getServiceGallery(slug);
  if (!gallery || gallery.photos.length === 0) return null;

  return (
    <section className="relative border-y border-white/10 bg-[#0a0a0a] py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-primary">
            {gallery.eyebrow}
          </p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {gallery.title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/65">{gallery.intro}</p>
        </FadeIn>

        <StaggerContainer className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {gallery.photos.map((photo, i) => (
            <StaggerItem key={photo.src}>
              <figure className="group relative aspect-4/5 overflow-hidden rounded-2xl border border-white/10 bg-black">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  loading="lazy"
                  className="object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.06]"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
                <figcaption className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <span className="block text-xs font-semibold leading-snug text-white drop-shadow sm:text-sm">
                    {photo.caption}
                  </span>
                </figcaption>
                <span
                  className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/0 transition group-hover:ring-secondary/60"
                  aria-hidden="true"
                />
                {i === 0 && (
                  <span className="absolute left-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                    Our Work
                  </span>
                )}
              </figure>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
