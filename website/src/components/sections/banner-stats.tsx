"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { siteConfig } from "@/lib/site-config";

type Stat = { label: string; value: number; suffix?: string };

const stats: Stat[] = [
  { label: "Years of Dependability", value: 31, suffix: "+" },
  { label: "Founded", value: siteConfig.foundedYear },
  { label: "Generations", value: 3 },
  { label: "Core Services", value: 6 },
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

export function BannerStatsOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/25">
      <div className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-6 px-6 md:grid-cols-4 md:gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="text-center"
          >
            <p className="text-3xl font-bold text-white drop-shadow-lg md:text-4xl">
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/80 md:text-xs">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
