"use client";

import { useEffect, useRef } from "react";

/** How often an unlocked, visible tab pulls someone else's saves. */
const POLL_MS = 12_000;

/**
 * Keep Starlink admin in step with other tabs / other people without a
 * manual refresh. Polls while the tab is in front, and again the moment it
 * becomes visible or the network comes back. Hidden tabs stay quiet.
 */
export function useLiveRefresh(
  refresh: () => void | Promise<void>,
  enabled: boolean,
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return;

    let timer: number | undefined;
    let lastPull = 0;

    const pull = () => {
      if (document.hidden) return;
      const now = Date.now();
      if (now - lastPull < 2_000) return;
      lastPull = now;
      void refreshRef.current();
    };

    const arm = () => {
      window.clearInterval(timer);
      if (!document.hidden) {
        timer = window.setInterval(pull, POLL_MS);
      }
    };

    // visibilitychange and focus often fire together when you come back to
    // the tab. The refresh itself coalesces; we still only re-arm once.
    const onWake = () => {
      if (document.hidden) {
        window.clearInterval(timer);
        return;
      }
      pull();
      arm();
    };

    arm();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [enabled]);
}
