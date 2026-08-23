"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * App Router keeps the same pathname when only `?tab=` changes, so the
 * browser often will not scroll to `#alarm-contact-list` / `#equipment-maintenance`.
 */
export function ScrollToHash() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    const run = () => document.getElementById(id)?.scrollIntoView({ block: "start" });
    run();
    const timer = window.setTimeout(run, 50);
    return () => window.clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
