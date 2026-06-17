"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { team } from "@/lib/site-config";
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/fade-in";
import { SectionHeading } from "@/components/ui/section-heading";
import { FadeIn } from "@/components/motion/fade-in";

export function TeamGrid() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const member = activeIndex !== null ? team[activeIndex] : null;

  const close = useCallback(() => setActiveIndex(null), []);
  const prev = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i - 1 + team.length) % team.length));
  }, []);
  const next = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i + 1) % team.length));
  }, []);

  useEffect(() => {
    if (activeIndex === null) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [activeIndex, close, prev, next]);

  return (
    <>
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <SectionHeading
              eyebrow="Meet The Team"
              title="Team McKee"
              description="A family-owned company with deep roots in the Haliburton community."
            />
          </FadeIn>
          <StaggerContainer className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((person, index) => (
              <StaggerItem key={person.name}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className="group w-full overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated/40 text-left transition hover:border-primary/30 hover:bg-surface-elevated"
                >
                  <div className="relative aspect-square overflow-hidden bg-[#111111]">
                    <Image
                      src={person.photo}
                      alt={person.name}
                      fill
                      className="object-cover object-top transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-white">{person.name}</h3>
                    <p className="mt-1 text-sm text-white/55">{person.role}</p>
                  </div>
                </button>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {member && activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`${member.name} photo`}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 md:left-8"
            aria-label="Previous team member"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 md:right-8"
            aria-label="Next team member"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div
            className="relative mx-auto w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/15 bg-[#111111]">
              <Image
                src={member.photo}
                alt={member.name}
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 512px"
                priority
              />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-xl font-bold text-white">{member.name}</h3>
              <p className="mt-1 text-white/60">{member.role}</p>
              <p className="mt-2 text-xs text-white/40">
                {activeIndex + 1} of {team.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
