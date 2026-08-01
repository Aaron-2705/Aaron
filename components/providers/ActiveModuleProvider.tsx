"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { MODULES } from "@/data/modules";
import { clamp } from "@/lib/utils";

interface ActiveModuleValue {
  activeId: string;
  activeIndex: number;
  total: number;
  /** Whole-page scroll progress 0→1. */
  progress: number;
}

const ActiveModuleContext = createContext<ActiveModuleValue | null>(null);

/**
 * Single source of "which module is active" + page scroll progress.
 *
 * Uses one requestAnimationFrame loop reading geometry directly rather than
 * scroll events or IntersectionObserver — this is immune to Lenis smooth-scroll
 * (which can swallow native scroll events) and to observer timing. State is
 * only updated when a value actually changes, so re-renders stay cheap.
 *
 * MEASURE / READ SPLIT. The loop must not touch layout. An earlier version read
 * `scrollHeight` plus a `getBoundingClientRect()` for every module on every
 * frame — thirteen forced synchronous layouts per frame for the life of the
 * page, which Lighthouse attributed 389ms of forced reflow to. Section offsets
 * and page height are now measured once and refreshed only when the document
 * actually changes size (resize, or a ResizeObserver on the body catching
 * lazily-mounted sections). The frame itself reads `window.scrollY` and nothing
 * else.
 */
export function ActiveModuleProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string>(MODULES[0].id);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    let lastId = MODULES[0].id;
    let lastProgress = 0;

    /** Document-absolute top of each module, in page order. */
    let offsets: Array<{ id: string; top: number }> = [];
    let maxScroll = 0;
    let viewportHeight = window.innerHeight;

    const measure = () => {
      const scrollY = window.scrollY;
      viewportHeight = window.innerHeight;
      maxScroll = document.documentElement.scrollHeight - viewportHeight;
      offsets = [];
      for (const entry of MODULES) {
        const el = document.getElementById(entry.id);
        if (!el) continue;
        offsets.push({ id: entry.id, top: el.getBoundingClientRect().top + scrollY });
      }
    };

    const tick = () => {
      const scrollY = window.scrollY;
      const p = maxScroll > 0 ? clamp(scrollY / maxScroll, 0, 1) : 0;

      // Active module: the last section whose top has crossed the 45% line.
      const line = scrollY + viewportHeight * 0.45;
      let current = MODULES[0].id;
      for (const offset of offsets) {
        if (offset.top <= line) current = offset.id;
      }

      if (current !== lastId) {
        lastId = current;
        setActiveId(current);
      }
      const rounded = Math.round(p * 1000) / 1000;
      if (rounded !== lastProgress) {
        lastProgress = rounded;
        setProgress(rounded);
      }

      raf = requestAnimationFrame(tick);
    };

    // Re-measure on the next frame rather than inside the observer callback,
    // so a resize cannot force layout in the middle of the browser's own.
    let remeasure = 0;
    const scheduleMeasure = () => {
      if (remeasure) return;
      remeasure = requestAnimationFrame(() => {
        remeasure = 0;
        measure();
      });
    };

    measure();
    raf = requestAnimationFrame(tick);

    window.addEventListener("resize", scheduleMeasure, { passive: true });
    // Catches the page growing as deferred sections (the 3D scenes, the globe)
    // mount, which a resize listener alone would miss.
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      if (remeasure) cancelAnimationFrame(remeasure);
      window.removeEventListener("resize", scheduleMeasure);
      observer.disconnect();
    };
  }, []);

  const value = useMemo<ActiveModuleValue>(() => {
    const activeIndex = Math.max(
      0,
      MODULES.findIndex((m) => m.id === activeId),
    );
    return { activeId, activeIndex, total: MODULES.length, progress };
  }, [activeId, progress]);

  return <ActiveModuleContext.Provider value={value}>{children}</ActiveModuleContext.Provider>;
}

export function useActiveModule(): ActiveModuleValue {
  const ctx = useContext(ActiveModuleContext);
  if (!ctx) throw new Error("useActiveModule must be used within ActiveModuleProvider");
  return ctx;
}
