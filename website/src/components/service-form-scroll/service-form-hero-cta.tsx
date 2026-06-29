"use client";

import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ServiceFormScrollButton } from "@/components/service-form-scroll/service-form-scroll-button";

function findHeroCtaInsertPoint(heroContent: Element): Element | null {
  const h1 = heroContent.querySelector("h1");
  if (!h1) return null;

  const tagline = heroContent.querySelector(".hero-tagline, .mks2025-ci-hero-tagline");
  if (tagline) return tagline;

  const badge = heroContent.querySelector(
    '[class*="hero-badge"]:not(.hero-badges *):not(.mks2025-ci-hero-badges *)',
  );
  if (badge) return badge;

  const badges = heroContent.querySelector(".hero-badges, .mks2025-ci-hero-badges");
  if (badges) return badges;

  return h1;
}

type ServiceFormHeroCtaProps = {
  containerRef: RefObject<HTMLElement | null>;
  slug: string;
};

export function ServiceFormHeroCta({ containerRef, slug }: ServiceFormHeroCtaProps) {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const heroContent = container.querySelector('[class*="hero-content"]');
    if (!heroContent) return;

    const insertAfter = findHeroCtaInsertPoint(heroContent);
    if (!insertAfter) return;

    let wrapper = heroContent.querySelector(".mckee-service-form-hero-cta");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "mckee-service-form-hero-cta";
      insertAfter.insertAdjacentElement("afterend", wrapper);
    }

    setMountNode(wrapper as HTMLElement);

    return () => {
      wrapper?.remove();
      setMountNode(null);
    };
  }, [containerRef, slug]);

  if (!mountNode) return null;

  return createPortal(<ServiceFormScrollButton variant="hero" />, mountNode);
}
