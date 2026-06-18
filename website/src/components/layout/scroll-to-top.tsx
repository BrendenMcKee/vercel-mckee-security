"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollPageToTop } from "@/lib/navigation";

/** Scroll to top instantly and reset header state on every client-side route change */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    scrollPageToTop();
  }, [pathname]);

  useEffect(() => {
    scrollPageToTop();
  }, [pathname]);

  return null;
}
