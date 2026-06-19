"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns false during SSR and the first client render (so markup matches the
 * server), then true once hydrated. Use this to gate client-only,
 * localStorage-derived UI without calling setState inside an effect, which keeps
 * hydration safe and avoids cascading-render lint warnings.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
