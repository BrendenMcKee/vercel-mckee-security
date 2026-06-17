"use client";

import { useEffect, useRef } from "react";
import { ServiceQuoteSection } from "@/components/sections/service-quote-section";
import { MonitoringTiers } from "@/components/sections/monitoring-tiers";
import {
  elementorStyles,
  getElementorPage,
} from "@/lib/elementor-pages";

function getParticleClassName(particleContainerClass: string) {
  if (particleContainerClass.includes("mks2025")) {
    return particleContainerClass.replace("-particles-container", "-particle");
  }
  return "particle";
}

function useParticles(particleContainerClass: string | undefined) {
  useEffect(() => {
    if (!particleContainerClass) return;
    const container = document.querySelector(`.${particleContainerClass}`);
    if (!container || container.childElementCount) return;

    const particleClass = getParticleClassName(particleContainerClass);

    for (let i = 0; i < 25; i++) {
      const particle = document.createElement("div");
      particle.className = particleClass;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDuration = `${Math.random() * 10 + 8}s`;
      particle.style.animationDelay = `-${Math.random() * 15}s`;
      const size = `${Math.random() * 3 + 1}px`;
      particle.style.width = size;
      particle.style.height = size;
      container.appendChild(particle);
    }
  }, [particleContainerClass]);
}

function useElementorStyles(slug: string) {
  useEffect(() => {
    const load = elementorStyles[slug];
    if (load) void load();
  }, [slug]);
}

export function ElementorServicePage({ slug }: { slug: string }) {
  const data = getElementorPage(slug);
  const containerRef = useRef<HTMLDivElement>(null);

  useElementorStyles(slug);
  useParticles(data?.particleClass);

  if (!data) {
    return null;
  }

  return (
    <>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: data.html }} />
      {data.includeMonitoring && <MonitoringTiers />}
      {data.ctaTitle && data.ctaText && (
        <ServiceQuoteSection title={data.ctaTitle} description={data.ctaText} />
      )}
    </>
  );
}
