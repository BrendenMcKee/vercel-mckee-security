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
    <section className="relative z-20 -mt-px border-t-4 border-primary shadow-[0_-24px_48px_rgba(0,0,0,0.55)]">
      <div className="relative overflow-hidden py-16 md:py-20">
        <Image
          src="/images/stats-bg.jpg"
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          quality={85}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#660000]/55 to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-black/45" />

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="mb-12 flex flex-col items-center gap-4">
            <div className="h-px w-16 bg-primary/80" />
            <div className="relative h-[76px] w-[210px] md:h-[88px] md:w-[240px]">
              <Image
                src={images.logo}
                alt={siteConfig.name}
                fill
                className="object-contain drop-shadow-2xl"
                sizes="240px"
              />
            </div>
            <p className="text-center text-xs font-bold uppercase tracking-[0.28em] text-white/70">
              Trusted local professionals since {siteConfig.foundedYear}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-black/50 px-4 py-7 text-center backdrop-blur-md md:px-5 md:py-8"
              >
                <p className="bg-gradient-to-b from-white to-white/80 bg-clip-text text-4xl font-bold text-transparent drop-shadow-lg md:text-5xl">
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-3 text-[10px] font-bold uppercase leading-snug tracking-[0.16em] text-primary md:text-[11px]">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
