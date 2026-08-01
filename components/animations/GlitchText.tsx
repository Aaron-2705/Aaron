"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const GLYPHS = "█▓▒░<>/\\|01·";

interface GlitchTextProps {
  text: string;
  className?: string;
  /** Play a scramble-in when mounted. */
  scrambleIn?: boolean;
}

/**
 * Character-scramble text effect. Resolves to the real text quickly —
 * readable first, animated second.
 */
export function GlitchText({ text, className, scrambleIn = true }: GlitchTextProps) {
  const reducedMotion = usePrefersReducedMotion();
  const animate = !reducedMotion && scrambleIn;
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const totalFrames = 24;
    const interval = window.setInterval(() => {
      frame += 1;
      const resolved = Math.floor((frame / totalFrames) * text.length);
      const scrambled = text
        .split("")
        .map((char, i) => {
          if (i < resolved || char === " ") return char;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");
      setDisplay(scrambled);
      if (frame >= totalFrames) window.clearInterval(interval);
    }, 40);
    return () => window.clearInterval(interval);
  }, [text, animate]);

  return (
    <span className={className} aria-label={text}>
      {animate ? display || text : text}
    </span>
  );
}
