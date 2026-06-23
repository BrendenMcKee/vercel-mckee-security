"use client";

import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useInView,
} from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { heroCopyShadow, clearWillChangeOnEnd } from "@/lib/hero-text-styles";

type HeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: string;
  objectPosition?: string;
  /** Scale on the background layer; lower values show more of the photo */
  imageScale?: number;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  compact?: boolean;
  /** Shorter hero with less dead space below copy (gallery filter bar sits closer). */
  tightFooter?: boolean;
  /** medium = lighter gradient for inner pages, dark = slightly stronger */
  overlay?: "medium" | "dark";
};

export function Hero({
  eyebrow,
  title,
  subtitle,
  image = "/images/hero-home.jpg",
  objectPosition = "50% 50%",
  imageScale = 1.15,
  primaryCta,
  secondaryCta,
  compact = false,
  tightFooter = false,
  overlay = "medium",
}: HeroProps) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  // Promote the scroll-linked layers only while the hero is on screen so we
  // don't keep large GPU layers pinned for the page lifetime.
  const inView = useInView(ref, { margin: "200px 0px" });
  const animate = !reduceMotion;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "45%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  const gradientClass =
    overlay === "dark"
      ? "bg-gradient-to-b from-black/60 via-black/48 to-background"
      : "bg-gradient-to-b from-black/52 via-black/40 to-background";

  const sectionHeightClass = compact
    ? tightFooter
      ? "min-h-[38vh] sm:min-h-[42vh] lg:min-h-[40vh]"
      : "min-h-[42vh] sm:min-h-[50vh]"
    : "min-h-[72vh] sm:min-h-[85vh]";

  const contentPaddingClass = tightFooter
    ? "py-10 sm:py-12 lg:py-14"
    : compact
      ? "py-12 sm:py-16 lg:py-20"
      : "py-16 sm:py-20 lg:py-32";

  return (
    <section
      ref={ref}
      className={`relative overflow-hidden ${sectionHeightClass}`}
    >
      <motion.div
        style={{
          y: animate ? y : undefined,
          scale: imageScale,
          willChange: animate && inView ? "transform" : "auto",
        }}
        className="absolute inset-0"
      >
        <Image
          src={image}
          alt=""
          fill
          priority
          className="object-cover"
          style={{ objectPosition }}
          sizes="100vw"
          quality={82}
        />
        <div className={`absolute inset-0 ${gradientClass}`} />
      </motion.div>

      <motion.div
        style={{
          opacity: animate ? opacity : undefined,
          willChange: animate && inView ? "opacity" : "auto",
        }}
        className={`relative mx-auto flex max-w-7xl flex-col justify-center px-6 ${contentPaddingClass}`}
      >
        <div className="hero-rise" onAnimationEnd={clearWillChangeOnEnd}>
          {eyebrow && (
            <p
              className={`mb-4 text-sm font-bold uppercase tracking-[0.25em] text-primary ${heroCopyShadow}`}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className={`max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl ${heroCopyShadow}`}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={`mt-6 max-w-2xl text-lg leading-relaxed text-white sm:text-xl ${heroCopyShadow}`}
            >
              {subtitle}
            </p>
          )}
          {(primaryCta || secondaryCta) && (
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              {primaryCta && (
                <Button href={primaryCta.href} size="lg">
                  {primaryCta.label}
                </Button>
              )}
              {secondaryCta && (
                <Button href={secondaryCta.href} variant="outline" size="lg">
                  {secondaryCta.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
