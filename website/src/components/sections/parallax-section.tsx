"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

type ParallaxSectionProps = {
  image: string;
  overlay?: string;
  gradient?: boolean;
  minHeight?: string;
  objectPosition?: string;
  /** Extra scale on the image layer to avoid edge gaps during parallax (keep near 1.0) */
  imageScale?: number;
  /** Vertical travel in % of section height */
  parallaxStrength?: number;
  /** Hero sections should pin at scroll 0; mid-page sections use a wider scroll range */
  scrollMode?: "hero" | "section";
  /** Override the absolute inset on the image layer (helps avoid edge gaps during parallax) */
  imageInsetClassName?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  priority?: boolean;
};

export function ParallaxSection({
  image,
  overlay = "rgba(17,17,17,0.35)",
  gradient = false,
  minHeight = "655px",
  objectPosition = "50% 50%",
  imageScale = 1.06,
  parallaxStrength = 28,
  scrollMode = "section",
  imageInsetClassName,
  children,
  className = "",
  contentClassName = "",
  priority = false,
}: ParallaxSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const scrollOffset: ["start start", "end start"] | ["start end", "end start"] =
    scrollMode === "hero" ? ["start start", "end start"] : ["start end", "end start"];

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: scrollOffset,
  });

  const travel = parallaxStrength;
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    scrollMode === "hero"
      ? ["0%", `${travel * 0.65}%`]
      : [`-${travel * 0.35}%`, `${travel * 0.55}%`],
  );

  const insetClassName =
    imageInsetClassName ??
    (scrollMode === "hero" ? "-inset-[6%]" : "-inset-x-[8%] -top-[14%] -bottom-[8%]");

  return (
    <section
      ref={ref}
      className={`relative overflow-hidden bg-[#0a0a0a] ${className}`}
      style={{ minHeight }}
    >
      <motion.div
        style={{ y, scale: imageScale }}
        className={`absolute ${insetClassName} will-change-transform`}
      >
        <Image
          src={image}
          alt=""
          fill
          priority={priority}
          className="object-cover"
          style={{ objectPosition }}
          sizes="100vw"
          quality={priority ? 95 : 90}
        />
        {gradient ? (
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/38 to-[#0a0a0a]" />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: overlay }} />
        )}
      </motion.div>
      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
    </section>
  );
}
