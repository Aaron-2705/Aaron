"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * RisingLines — adapted from OriginKit "risinglines".
 * Thin pixel-line sparks + soft glow blobs rising from the bottom edge,
 * drawn additively on a TRANSPARENT canvas so the site background shows
 * through. Runs as a subtle fixed backdrop behind the content sections.
 *
 * Adaptations from the OriginKit source:
 * - transparent background (clearRect instead of black fill)
 * - site palette (cyan on deep navy) + low opacity defaults
 * - pauses when the tab is hidden; static warm frame for reduced motion
 * - fades in only after the hero is scrolled past (the fixed canvas would
 *   otherwise paint over the 3D hero, which sits below the content layer)
 */

interface RisingLinesBackgroundProps {
  /** Spark count at the 800x400 reference frame. */
  particles?: number;
  color?: string;
  /** 0-100 master opacity. */
  opacity?: number;
  /** 0-60 rise speed. */
  riseSpeed?: number;
  /** 1-20, /2 = world scale. */
  scale?: number;
}

export function RisingLinesBackground({
  particles = 220,
  color = "#00e5ff",
  opacity = 30,
  riseSpeed = 10,
  scale = 7,
}: RisingLinesBackgroundProps) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  // Fade the layer in once the hero is scrolled past.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const start = window.innerHeight * 1.1;
      const end = window.innerHeight * 1.6;
      const t = Math.max(0, Math.min(1, (window.scrollY - start) / (end - start)));
      container.style.opacity = String(t);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const masterOpacity = opacity / 100;
    const speedMul = Math.max(0, riseSpeed / 100) * 10;
    const worldScale = Math.max(0.1, scale / 2) / 3.5;

    const parseColor = (input: string): [number, number, number] => {
      let hex = input.trim().replace("#", "");
      if (hex.length === 3)
        hex = hex
          .split("")
          .map((c) => c + c)
          .join("");
      const num = parseInt(hex, 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    };
    const [cr, cg, cb] = parseColor(color);

    // Seeded PRNG (Mulberry32) — stable spawn layout across reloads.
    const makeRng = (seed: number) => {
      let s = seed >>> 0;
      return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    const rng = makeRng(0xc0ffee);

    let particleCount = 0;
    let pX = new Float32Array(0);
    let pY = new Float32Array(0);
    let pVY = new Float32Array(0);
    let pHeight = new Float32Array(0);
    let blobCount = 0;
    let bX = new Float32Array(0);
    let bY = new Float32Array(0);
    let bVY = new Float32Array(0);
    let bR = new Float32Array(0);

    const sampleCenterX = (w: number) => ((rng() + rng() + rng()) / 3) * w;
    const sampleSparkHeight = () => {
      const tall = rng() < 0.12 ? 70 + rng() * 30 : 20 + Math.pow(rng(), 0.7) * 35;
      return Math.max(1, Math.floor(tall * worldScale));
    };

    /**
     * The two gradients, rasterised ONCE.
     *
     * This loop used to call `createLinearGradient` per spark and
     * `createRadialGradient` per blob on every frame. At 1905x897 that is
     * ~1,500 fresh gradient objects per frame — ~90,000 a second — and a
     * measured 27ms of the 44ms frame budget: 61% of the whole page's frame
     * cost, and the reason a full scroll walk ran at 22.7fps.
     *
     * Both gradients only ever varied in POSITION, SIZE and ALPHA; their colour
     * stops were fixed. So each is drawn once into a small offscreen canvas at
     * alpha 1 and then blitted with `globalAlpha` and a destination rect, which
     * is the same image by construction. `tests/site.spec.ts` pins the
     * allocation count so this cannot quietly come back.
     */
    const SPARK_SPRITE_H = 128;
    const BLOB_SPRITE_R = 32;

    const makeSprite = (sw: number, sh: number, paint: (c: CanvasRenderingContext2D) => void) => {
      const sprite = document.createElement("canvas");
      sprite.width = sw;
      sprite.height = sh;
      const sctx = sprite.getContext("2d");
      if (sctx) paint(sctx);
      return sprite;
    };

    // Vertical spark: opaque for the first 30%, then falling to nothing.
    const sparkSprite = makeSprite(1, SPARK_SPRITE_H, (c) => {
      const g = c.createLinearGradient(0, 0, 0, SPARK_SPRITE_H);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},1)`);
      g.addColorStop(0.3, `rgba(${cr},${cg},${cb},1)`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, 1, SPARK_SPRITE_H);
    });

    // Soft round blob, same three stops the per-frame radial gradient used.
    const blobSprite = makeSprite(BLOB_SPRITE_R * 2, BLOB_SPRITE_R * 2, (c) => {
      const g = c.createRadialGradient(
        BLOB_SPRITE_R,
        BLOB_SPRITE_R,
        0,
        BLOB_SPRITE_R,
        BLOB_SPRITE_R,
        BLOB_SPRITE_R,
      );
      g.addColorStop(0, `rgba(${cr},${cg},${cb},1)`);
      g.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.45)`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, BLOB_SPRITE_R * 2, BLOB_SPRITE_R * 2);
    });

    const initParticles = () => {
      const { w, h } = sizeRef.current;
      const target = Math.max(0, Math.floor((particles * w * h) / (800 * 400)));
      // Hard cap on density, not just a runaway ceiling. The old 4000 was never
      // reached in practice, so it capped nothing: a 4K panel was simply asked
      // to draw ~4x the work of a laptop for a backdrop nobody looks at
      // directly. 900 holds the reference density to about 1440p, then stops.
      particleCount = Math.min(target, 900);
      pX = new Float32Array(particleCount);
      pY = new Float32Array(particleCount);
      pVY = new Float32Array(particleCount);
      pHeight = new Float32Array(particleCount);
      for (let i = 0; i < particleCount; i++) {
        pX[i] = sampleCenterX(w);
        pY[i] = h - 1 - rng() * (h - 1) * 0.95;
        pVY[i] = 10 + rng() * 40;
        pHeight[i] = sampleSparkHeight();
      }
      blobCount = Math.min(Math.floor(target * 0.3), 1200);
      bX = new Float32Array(blobCount);
      bY = new Float32Array(blobCount);
      bVY = new Float32Array(blobCount);
      bR = new Float32Array(blobCount);
      for (let i = 0; i < blobCount; i++) {
        bX[i] = sampleCenterX(w);
        bY[i] = h - 1 - rng() * (h - 1) * 0.95;
        bVY[i] = 8 + rng() * 28;
        bR[i] = (1.5 + Math.pow(rng(), 1.8) * 3.5) * worldScale;
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const drawFrame = (deltaSec: number) => {
      const { w, h } = sizeRef.current;
      const dt = Math.max(0.001, Math.min(0.05, deltaSec));
      const horizonY = h - 1;
      const denom = Math.max(1, horizonY);

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < blobCount; i++) {
        bY[i] -= bVY[i] * (1 + speedMul) * dt;
        if (bY[i] < -bR[i] * 2) {
          bX[i] = sampleCenterX(w);
          bY[i] = horizonY - rng() * 10;
          bVY[i] = 8 + rng() * 28;
          bR[i] = (1.5 + Math.pow(rng(), 1.8) * 3.5) * worldScale;
        }
        const t = Math.max(0, Math.min(1, (horizonY - bY[i]) / denom));
        const fade = t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.2) / 0.8);
        const a = Math.min(1, fade * masterOpacity);
        if (a < 0.01) continue;
        ctx.globalAlpha = a;
        ctx.drawImage(blobSprite, bX[i] - bR[i], bY[i] - bR[i], bR[i] * 2, bR[i] * 2);
      }

      for (let i = 0; i < particleCount; i++) {
        pY[i] -= pVY[i] * (1 + speedMul) * dt;
        if (pY[i] < -pHeight[i]) {
          pX[i] = sampleCenterX(w);
          pY[i] = horizonY - rng() * 10;
          pVY[i] = 10 + rng() * 40;
          pHeight[i] = sampleSparkHeight();
        }
        const t = Math.max(0, Math.min(1, (horizonY - pY[i]) / denom));
        const fade = t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.2) / 0.8);
        const a = Math.min(1, fade * masterOpacity);
        if (a < 0.01) continue;
        const px = Math.floor(pX[i]);
        const py = Math.floor(pY[i]);
        ctx.globalAlpha = a;
        ctx.drawImage(sparkSprite, px, py, 1, pHeight[i]);
      }

      // Leave the context as the next frame's clear expects to find it.
      ctx.globalAlpha = 1;
    };

    if (reducedMotion) {
      for (let i = 0; i < 60; i++) drawFrame(1 / 60);
      return () => ro.disconnect();
    }

    let lastT = performance.now();
    const loop = (t: number) => {
      const dt = (t - lastT) / 1000;
      lastT = t;
      // Skip the draw while the layer is faded out (over the hero) — no reason
      // to run the particle sim behind the 3D hero where it isn't visible.
      if (container.style.opacity !== "0") drawFrame(dt);
      rafRef.current = requestAnimationFrame(loop);
    };
    const start = () => {
      if (rafRef.current == null) {
        lastT = performance.now();
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
    };
  }, [particles, color, opacity, riseSpeed, scale, reducedMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0 }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
