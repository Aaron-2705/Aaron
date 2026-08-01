"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface ParallaxDriftProps {
  children: React.ReactNode;
  /** Max drift as a fraction of viewport height (0.1 = 10%). Negative drifts up. */
  strength?: number;
  className?: string;
}

/**
 * Subtle layered-scroll parallax: the child drifts against scroll while
 * its container passes through the viewport. Capped small by design.
 */
export function ParallaxDrift({ children, strength = 0.1, className }: ParallaxDriftProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`${strength * 100}vh`, `${-strength * 100}vh`],
  );

  // Apply the scroll transform only after mount, so server + first client
  // render identical markup (no hydration mismatch under reduced motion).
  // The deferred setState is intentional and required for that correctness.
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deferred past hydration on purpose
    setEnabled(!reducedMotion);
  }, [reducedMotion]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={enabled ? { y } : undefined}>{children}</motion.div>
    </div>
  );
}
