"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollPageToTop } from "@/lib/navigation";

/** Scroll to top and reset header state on every client-side route change */
export function ScrollToTop() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    scrollPageToTop();
    requestAnimationFrame(scrollPageToTop);
  }, [pathname]);

  return null;
}
