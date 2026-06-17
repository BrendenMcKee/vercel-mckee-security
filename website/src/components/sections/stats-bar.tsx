"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { siteConfig } from "@/lib/site-config";

type Stat = { label: string; value: number; suffix?: string };

const stats: Stat[] = [
  { label: "Years in Business", value: siteConfig.yearsInBusiness, suffix: "+" },
  { label: "Founded", value: siteConfig.foundedYear },
  { label: "Service Areas", value: 5, suffix: " Core" },
  { label: "Generations", value: 3 },
];

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
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

export function StatsBar() {
  return (
    <section className="border-y border-white/5 bg-[#660000]/30 py-12">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center"
          >
            <p className="text-3xl font-bold text-white md:text-4xl">
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/50">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
