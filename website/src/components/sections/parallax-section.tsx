"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

type ParallaxSectionProps = {
  image: string;
  overlay?: string;
  minHeight?: string;
  objectPosition?: string;
  imageScale?: number;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  priority?: boolean;
};

export function ParallaxSection({
  image,
  overlay = "rgba(17,17,17,0.35)",
  minHeight = "655px",
  objectPosition = "50% 50%",
  imageScale = 1.15,
  children,
  className = "",
  contentClassName = "",
  priority = false,
}: ParallaxSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  return (
    <section
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      <motion.div
        style={{ y, scale: imageScale }}
        className="absolute inset-0 will-change-transform"
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
        <div className="absolute inset-0" style={{ backgroundColor: overlay }} />
      </motion.div>
      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
    </section>
  );
}
