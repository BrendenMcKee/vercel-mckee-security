"use client";

import { useEffect, useState } from "react";

/**
 * Defer scroll-linked motion until after first paint and a short idle window so
 * hydration, font/image decode, and layout don't compete with parallax on load.
 */
export function useMotionReady(resetKey?: string) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    let cancelled = false;
    let idleId: ReturnType<typeof requestIdleCallback> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const enable = () => {
      if (!cancelled) setReady(true);
    };

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        if (typeof window.requestIdleCallback === "function") {
          idleId = window.requestIdleCallback(enable, { timeout: 320 });
        } else {
          timeoutId = setTimeout(enable, 120);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [resetKey]);

  return ready;
}
