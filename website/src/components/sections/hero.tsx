"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";

type HeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  compact?: boolean;
};

export function Hero({
  eyebrow,
  title,
  subtitle,
  image = "/images/hero-home.jpg",
  primaryCta,
  secondaryCta,
  compact = false,
}: HeroProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  return (
    <section
      ref={ref}
      className={`relative overflow-hidden ${compact ? "min-h-[50vh]" : "min-h-[85vh]"}`}
    >
      <motion.div style={{ y }} className="absolute inset-0">
        <Image
          src={image}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-background" />
      </motion.div>

      <motion.div
        style={{ opacity }}
        className="relative mx-auto flex max-w-7xl flex-col justify-center px-6 py-24 lg:py-32"
      >
        <FadeIn>
          {eyebrow && (
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75 sm:text-xl">
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
        </FadeIn>
      </motion.div>
    </section>
  );
}
