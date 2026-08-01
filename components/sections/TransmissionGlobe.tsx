"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Interactive 3D transmission globe (cobe) — drag to spin.
 * Marker: Sacramento, CA (transmission destination).
 */
export function TransmissionGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerDown = useRef<number | null>(null);
  const drag = useRef(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let phi = 0;
    let width = canvas.offsetWidth;
    const onResize = () => {
      width = canvas.offsetWidth;
    };
    window.addEventListener("resize", onResize);

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 14000,
      mapBrightness: 5,
      baseColor: [0.08, 0.1, 0.12],
      markerColor: [0, 0.94, 1],
      glowColor: [0, 0.35, 0.4],
      markers: [
        { location: [38.5816, -121.4944], size: 0.09 }, // Sacramento
        { location: [23.0225, 72.5714], size: 0.06 }, // Ahmedabad
      ],
    });

    // Pause rendering entirely while off-screen.
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(canvas);

    let raf = 0;
    const tick = () => {
      if (visible) {
        if (!reducedMotion && pointerDown.current === null) phi += 0.004;
        globe.update({ phi: phi + drag.current, width: width * 2, height: width * 2 });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      globe.destroy();
    };
  }, [reducedMotion]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm">
      <canvas
        ref={canvasRef}
        aria-label="Rotating globe showing transmission endpoints"
        className="size-full cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          pointerDown.current = e.clientX - drag.current * 200;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (pointerDown.current !== null) {
            drag.current = (e.clientX - pointerDown.current) / 200;
          }
        }}
        onPointerUp={() => (pointerDown.current = null)}
        onPointerCancel={() => (pointerDown.current = null)}
      />
      <p className="pointer-events-none absolute inset-x-0 bottom-0 text-center font-mono text-[10px] tracking-[0.3em] text-muted">
        TRANSMISSION ENDPOINTS // SACRAMENTO ◦ AHMEDABAD
      </p>
    </div>
  );
}
