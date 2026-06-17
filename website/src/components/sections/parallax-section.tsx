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
  imageScale?: number;
  parallaxStrength?: number;
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
  imageScale = 1.2,
  parallaxStrength = 50,
  children,
  className = "",
  contentClassName = "",
  priority = false,
}: ParallaxSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`-${parallaxStrength * 0.12}%`, `${parallaxStrength}%`],
  );

  return (
    <section
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      <motion.div
        style={{ y, scale: imageScale }}
        className="absolute -inset-[12%] will-change-transform"
      >
        <Image
          src={image}
          alt=""
          fill
          priority={priority}
          className="object-cover"
          style={{ objectPosition }}
          sizes="100vw"
          quality={90}
        />
        {gradient ? (
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/38 to-black/50" />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: overlay }} />
        )}
      </motion.div>
      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
    </section>
  );
}
