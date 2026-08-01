"use client";

import { useEffect, useRef } from "react";

import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * JARVIS-style cursor light: a soft cyan glow that trails the pointer.
 * Desktop only; pure transform updates — no re-renders.
 */
export function CursorSpotlight() {
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const isTouch = useIsTouchDevice();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (isTouch || reducedMotion) return;
    const glow = glowRef.current;
    const ring = ringRef.current;
    if (!glow || !ring) return;

    let raf = 0;
    let targetX = -600;
    let targetY = -600;
    let x = targetX;
    let y = targetY;
    let rx = targetX;
    let ry = targetY;

    let scale = 1;
    let targetScale = 1;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      const el = e.target as Element | null;
      // Grow over clickables; hand off to the HUD reticle over the 3D hero.
      const clickable = el?.closest?.("a, button, [role='button'], input, textarea, label");
      const overHero = el?.closest?.("#hero") && !clickable;
      targetScale = clickable ? 1.7 : 1;
      ring.style.opacity = overHero ? "0" : "1";
    };
    const tick = () => {
      x += (targetX - x) * 0.12;
      y += (targetY - y) * 0.12;
      rx += (targetX - rx) * 0.22;
      ry += (targetY - ry) * 0.22;
      scale += (targetScale - scale) * 0.18;
      glow.style.transform = `translate(${x - 300}px, ${y - 300}px)`;
      ring.style.transform = `translate(${rx - 14}px, ${ry - 14}px) scale(${scale})`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [isTouch, reducedMotion]);

  if (isTouch || reducedMotion) return null;

  return (
    <>
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-30 size-[600px] rounded-full opacity-[0.10]"
        style={{
          background: "radial-gradient(circle, var(--accent) 0%, transparent 60%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Trailing targeting ring */}
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[60] size-7 rounded-full border border-accent/50"
      >
        <span className="absolute top-1/2 left-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/80" />
      </div>
    </>
  );
}
