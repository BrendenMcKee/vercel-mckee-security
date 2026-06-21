"use client";

import { LazyMotion, domAnimation } from "framer-motion";

/** Loads a smaller Framer Motion feature set for faster hydration on route changes */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
