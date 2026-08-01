"use client";

import { useEffect } from "react";

import { getGsap, ScrollTrigger } from "@/lib/gsap";
import { scrollState } from "@/lib/scrollState";

/**
 * Scroll storytelling driver.
 * GSAP ScrollTrigger owns the hero camera progress (0 → 1 across the first
 * 1.5 viewport heights); Lenis stays the scroll engine and pipes its
 * scroll events into ScrollTrigger so both stay in sync.
 */
export function useScrollProgressTracker(): void {
  useEffect(() => {
    const gsap = getGsap();

    // Section-relative: the camera travel runs across the #command section,
    // so it works no matter what sits above it (e.g. the calm orb hero).
    const trigger = ScrollTrigger.create({
      trigger: "#command",
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        scrollState.progress = self.progress;
      },
    });
    // Initial sync (page may load mid-scroll).
    scrollState.progress = trigger.progress;

    // Lenis → ScrollTrigger sync. Lenis drives native scroll, so a plain
    // passive listener keeps ScrollTrigger updated without coupling.
    const onScroll = () => ScrollTrigger.update();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      trigger.kill();
      void gsap;
    };
  }, []);
}
