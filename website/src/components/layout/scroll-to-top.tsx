"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/** Scroll to top and reset header state on every client-side route change */
export function ScrollToTop() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const scrollTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.documentElement.classList.remove("header-scrolled");
      window.dispatchEvent(new CustomEvent("mckee:scroll-top"));
    };

    scrollTop();
    requestAnimationFrame(scrollTop);
  }, [pathname]);

  return null;
}
