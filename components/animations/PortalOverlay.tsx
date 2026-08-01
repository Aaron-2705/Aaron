"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { scrollState } from "@/lib/scrollState";

/**
 * The "entering the system" moment: as the camera reaches the main monitor
 * (scroll progress → 1) a cyan screen-glow flashes, then settles into the
 * carbon backdrop the content sections sit on.
 */
export function PortalOverlay() {
  const glowRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    let frame: number;
    const tick = () => {
      const p = scrollState.progress;
      if (glowRef.current) {
        // Bell curve peaking at p = 0.9 — the flash as the screen fills the view.
        const flash = Math.exp(-Math.pow((p - 0.9) / 0.07, 2));
        glowRef.current.style.opacity = String(flash * 0.55);
      }
      if (fadeRef.current) {
        // Settle to opaque backdrop right at the end of the travel.
        fadeRef.current.style.opacity = String(Math.max(0, (p - 0.92) / 0.08));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return (
    <>
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20 bg-[radial-gradient(circle_at_center,var(--accent)_0%,transparent_65%)] opacity-0"
      />
      <div
        ref={fadeRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20 bg-background opacity-0"
      />
    </>
  );
}
