"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ContactForm } from "@/components/forms/contact-form";
import { MonitoringTiers } from "@/components/sections/monitoring-tiers";
import {
  elementorStyles,
  getElementorPage,
  type ElementorPageData,
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
      particle.style.animationDuration = `${Math.random() * 20 + 15}s`;
      particle.style.animationDelay = `${Math.random() * 20}s`;
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

function FormPortal({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = containerRef.current?.querySelector('[data-mckee-form="true"]');
    if (el instanceof HTMLElement) setTarget(el);
  }, [containerRef]);

  if (!target) return null;
  return createPortal(
    <div className="mx-auto max-w-3xl">
      <ContactForm />
    </div>,
    target,
  );
}

function SecurityCta({ data }: { data: ElementorPageData }) {
  return (
    <div id="mks2025-sec-wrapper">
      <div className="mks2025-sec-particles-container" aria-hidden="true" />
      <div id="mks2025-sec-main">
        <div className={data.ctaSectionClass ?? "mks2025-sec-cta-section"}>
          <h3>{data.ctaTitle}</h3>
          <p>{data.ctaText}</p>
          <div className={data.formWrapperClass}>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
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
      {slug !== "security" && <FormPortal containerRef={containerRef} />}
      {data.includeMonitoring && <MonitoringTiers />}
      {slug === "security" && data.ctaTitle && <SecurityCta data={data} />}
    </>
  );
}
