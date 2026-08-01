"use client";

import type Lenis from "lenis";

/** Shared Lenis instance so navigation can drive smooth scrolls. */
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null): void {
  instance = lenis;
}

/** Smoothly scroll to a section id, via Lenis when active. */
export function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  if (instance) {
    instance.scrollTo(target, { offset: -56, duration: 1.4 });
  } else {
    target.scrollIntoView({ behavior: "smooth" });
  }
}
