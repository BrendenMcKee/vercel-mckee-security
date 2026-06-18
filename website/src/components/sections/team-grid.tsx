"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Mail, X } from "lucide-react";
import { team, type TeamLink } from "@/lib/site-config";
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/fade-in";
import { SectionHeading } from "@/components/ui/section-heading";
import { FadeIn } from "@/components/motion/fade-in";

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function TikTokIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.18 8.18 0 0 0 4.78 1.52V6.87a4.85 4.85 0 0 1-1.01-.18z" />
    </svg>
  );
}

function TeamLinkButton({ link }: { link: TeamLink }) {
  const icon =
    link.type === "email" ? (
      <Mail className="h-4 w-4" />
    ) : link.type === "instagram" ? (
      <InstagramIcon />
    ) : (
      <TikTokIcon />
    );

  return (
    <a
      href={link.href}
      target={link.type === "email" ? undefined : "_blank"}
      rel={link.type === "email" ? undefined : "noopener noreferrer"}
      aria-label={link.label}
      title={link.label}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/75 transition hover:border-primary/40 hover:bg-primary/15 hover:text-white"
    >
      {icon}
    </a>
  );
}

function TeamLinks({
  links,
  align = "end",
}: {
  links?: TeamLink[];
  align?: "end" | "center";
}) {
  return (
    <div
      className={`mt-3 flex h-9 shrink-0 items-center gap-2 ${
        align === "center" ? "justify-center" : "justify-end"
      }`}
    >
      {links?.map((link) => (
        <TeamLinkButton key={link.href} link={link} />
      ))}
    </div>
  );
}

export function TeamGrid() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const member = activeIndex !== null ? team[activeIndex] : null;
  const touchStart = useRef({ x: 0, y: 0 });

  const close = useCallback(() => setActiveIndex(null), []);
  const prev = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i - 1 + team.length) % team.length));
  }, []);
  const next = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i + 1) % team.length));
  }, []);

  const handleNavPress =
    (action: () => void) => (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    };

  const handleSwipeStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleSwipeEnd = (event: React.TouchEvent) => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;

    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)) return;

    event.preventDefault();
    if (dx < 0) next();
    else prev();
  };

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
          <StaggerContainer className="mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((person, index) => (
              <StaggerItem key={person.name} className="h-full">
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated/40 transition hover:border-primary/30 hover:bg-surface-elevated">
                  <button
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className="block w-full shrink-0 text-left"
                    aria-label={`View ${person.name} photo`}
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#111111]">
                      <Image
                        src={person.photo}
                        alt={person.name}
                        fill
                        className="object-cover object-top transition duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 400px"
                        quality={92}
                      />
                    </div>
                  </button>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-bold text-white">{person.name}</h3>
                    <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-white/55">
                      {person.role}
                    </p>
                    <TeamLinks links={person.links} />
                  </div>
                </article>
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
            className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="relative mx-auto w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <button
                type="button"
                onPointerUp={handleNavPress(prev)}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 touch-manipulation rounded-full bg-white/10 p-3 text-white hover:bg-white/20 md:left-3"
                aria-label="Previous team member"
              >
                <ChevronLeft className="h-6 w-6 pointer-events-none" />
              </button>

              <button
                type="button"
                onPointerUp={handleNavPress(next)}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 touch-manipulation rounded-full bg-white/10 p-3 text-white hover:bg-white/20 md:right-3"
                aria-label="Next team member"
              >
                <ChevronRight className="h-6 w-6 pointer-events-none" />
              </button>

              <div
                className="relative aspect-square touch-pan-y overflow-hidden rounded-2xl border border-white/15 bg-[#111111]"
                onTouchStart={handleSwipeStart}
                onTouchEnd={handleSwipeEnd}
              >
                <Image
                  src={member.photo}
                  alt={member.name}
                  fill
                  className="object-cover object-top"
                  sizes="512px"
                  quality={95}
                  priority
                />
              </div>
            </div>

            <div className="mt-4 flex min-h-[132px] flex-col items-center text-center">
              <h3 className="text-xl font-bold text-white">{member.name}</h3>
              <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-white/60">{member.role}</p>
              <TeamLinks links={member.links} align="center" />
              <p className="mt-3 text-xs text-white/40">
                {activeIndex + 1} of {team.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
