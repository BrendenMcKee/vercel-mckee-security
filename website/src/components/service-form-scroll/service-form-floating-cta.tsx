"use client";

import { useEffect, useState } from "react";
import { ServiceFormScrollButton } from "@/components/service-form-scroll/service-form-scroll-button";
import { SERVICE_QUOTE_SECTION_ID } from "@/lib/scroll-to-service-quote";
import { cn } from "@/lib/utils";

export function ServiceFormFloatingCta() {
  const [formVisible, setFormVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const section = document.getElementById(SERVICE_QUOTE_SECTION_ID);
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setFormVisible(entry.isIntersecting && entry.intersectionRatio > 0.2);
      },
      {
        root: null,
        threshold: [0, 0.2, 0.4],
        rootMargin: "-10% 0px -35% 0px",
      },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "mckee-service-form-floating-cta",
        formVisible && "mckee-service-form-floating-cta--hidden",
      )}
      aria-hidden={formVisible}
    >
      <ServiceFormScrollButton variant="floating" />
    </div>
  );
}
