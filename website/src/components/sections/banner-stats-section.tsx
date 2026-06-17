"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { images, siteConfig } from "@/lib/site-config";

type Stat = { label: string; value: number; suffix?: string };

const stats: Stat[] = [
  { label: "Years of Dependability", value: 31, suffix: "+" },
  { label: "Founded", value: siteConfig.foundedYear },
  { label: "Generations", value: 3 },
  { label: "Core Services", value: 5 },
];

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1400;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setDisplay(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

export function BannerStatsSection() {
  return (
    <section className="relative overflow-hidden py-14 md:py-16">
      <Image
        src="/images/stats-bg.jpg"
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
        quality={85}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-[#660000]/40 to-black/80" />
      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <div className="mb-10 flex justify-center">
          <div className="relative h-[72px] w-[200px] md:h-[84px] md:w-[230px]">
            <Image
              src={images.logo}
              alt={siteConfig.name}
              fill
              className="object-contain"
              sizes="230px"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-white drop-shadow-lg md:text-5xl">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90 md:text-xs">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
